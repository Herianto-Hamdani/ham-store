import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  extractProductCodeId,
  normalizeSearchInput,
  normalizeSearchPage,
  normalizeTypeId,
  tokenizeSearchTerms
} from "@/lib/search-utils";
import { decryptPublicId, encryptPublicId, getProductCode } from "@/lib/utils";

const CATALOG_REVALIDATE_SECONDS = 60 * 5;

type CatalogSearchStrategy = "browse" | "exact" | "full-text" | "trigram";

type ProductIdRow = {
  id: number;
};

type CountRow = {
  total: number;
};

function buildBrowseWhere(typeId?: number | null): Prisma.ProductWhereInput {
  return typeId && typeId > 0
    ? {
        typeId
      }
    : {};
}

function buildCatalogSearchDocument() {
  return Prisma.sql`
    setweight(to_tsvector('simple', coalesce(p.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(p.brand, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(p.model, '')), 'B')
  `;
}

function buildFullTextSearchQuery(search: string): string | null {
  const tokens = tokenizeSearchTerms(search);
  if (tokens.length === 0) {
    return null;
  }

  return tokens.map((token) => `${token}:*`).join(" & ");
}

function buildBaseFilters(typeId: number | null) {
  const filters: Prisma.Sql[] = [];

  if (typeId && typeId > 0) {
    filters.push(Prisma.sql`p.type_id = ${typeId}`);
  }

  return filters;
}

async function fetchProductsByIds(ids: number[]) {
  if (ids.length === 0) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: ids
      }
    },
    include: {
      type: true
    }
  });

  const productMap = new Map(products.map((product) => [product.id, product]));
  return ids
    .map((id) => productMap.get(id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));
}

async function exactProductCodeLookup(search: string, typeId: number | null) {
  const productId = extractProductCodeId(search);
  if (!productId) {
    return null;
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId
    },
    include: {
      type: true
    }
  });

  const products =
    product &&
    (!typeId || product.typeId === typeId) &&
    getProductCode({
      id: product.id,
      createdAt: product.createdAt,
      type: { name: product.type.name }
    }) === search.toUpperCase()
      ? [product]
      : [];

  return {
    page: 1,
    total: products.length,
    totalPages: 1,
    products,
    strategy: "exact" as const
  };
}

async function browseCatalog(page: number, typeId: number | null) {
  const where = buildBrowseWhere(typeId);
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * DEFAULT_PAGE_SIZE;
  const products = await prisma.product.findMany({
    where,
    include: {
      type: true
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip,
    take: DEFAULT_PAGE_SIZE
  });

  return {
    page: safePage,
    total,
    totalPages,
    products,
    strategy: "browse" as const
  };
}

async function searchCatalogIdsByFullText(page: number, search: string, typeId: number | null) {
  const tsQuery = buildFullTextSearchQuery(search);
  if (!tsQuery) {
    return null;
  }

  const loweredSearch = search.toLowerCase();
  const prefixLike = `${loweredSearch}%`;
  const document = buildCatalogSearchDocument();
  const baseFilters = buildBaseFilters(typeId);
  const matchFilter = Prisma.sql`(
    ${document} @@ to_tsquery('simple', ${tsQuery}) OR
    lower(t.name) = ${loweredSearch} OR
    lower(t.name) LIKE ${prefixLike} OR
    lower(p.name) LIKE ${prefixLike} OR
    lower(p.brand) LIKE ${prefixLike} OR
    lower(p.model) LIKE ${prefixLike}
  )`;
  const filters = [...baseFilters, matchFilter];
  const whereClause = Prisma.sql`${Prisma.join(filters, " AND ")}`;
  const rank = Prisma.sql`(
    ts_rank_cd(${document}, to_tsquery('simple', ${tsQuery})) +
    CASE
      WHEN lower(p.name) = ${loweredSearch} THEN 0.75
      WHEN lower(p.name) LIKE ${prefixLike} THEN 0.28
      ELSE 0
    END +
    CASE
      WHEN lower(p.brand) = ${loweredSearch} THEN 0.35
      WHEN lower(p.brand) LIKE ${prefixLike} THEN 0.18
      ELSE 0
    END +
    CASE
      WHEN lower(p.model) = ${loweredSearch} THEN 0.35
      WHEN lower(p.model) LIKE ${prefixLike} THEN 0.18
      ELSE 0
    END +
    CASE
      WHEN lower(t.name) = ${loweredSearch} THEN 0.4
      WHEN lower(t.name) LIKE ${prefixLike} THEN 0.22
      ELSE 0
    END
  )`;

  const [countRows] = await Promise.all([
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM products p
      INNER JOIN types t ON t.id = p.type_id
      WHERE ${whereClause}
    `)
  ]);

  const total = countRows[0]?.total ?? 0;
  if (total === 0) {
    return {
      page: 1,
      total: 0,
      totalPages: 1,
      products: [] as Awaited<ReturnType<typeof fetchProductsByIds>>,
      strategy: "full-text" as const
    };
  }

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * DEFAULT_PAGE_SIZE;
  const idRows = await prisma.$queryRaw<ProductIdRow[]>(Prisma.sql`
    SELECT p.id
    FROM products p
    INNER JOIN types t ON t.id = p.type_id
    WHERE ${whereClause}
    ORDER BY ${rank} DESC, p.created_at DESC, p.id DESC
    OFFSET ${skip}
    LIMIT ${DEFAULT_PAGE_SIZE}
  `);

  const products = await fetchProductsByIds(idRows.map((row) => row.id));

  return {
    page: safePage,
    total,
    totalPages,
    products,
    strategy: "full-text" as const
  };
}

async function searchCatalogIdsByTrigram(page: number, search: string, typeId: number | null) {
  if (search.length < 3) {
    return null;
  }

  const loweredSearch = search.toLowerCase();
  const baseFilters = buildBaseFilters(typeId);
  const matchFilter = Prisma.sql`(
    lower(p.name) % ${loweredSearch} OR
    lower(p.brand) % ${loweredSearch} OR
    lower(p.model) % ${loweredSearch} OR
    lower(t.name) % ${loweredSearch}
  )`;
  const filters = [...baseFilters, matchFilter];
  const whereClause = Prisma.sql`${Prisma.join(filters, " AND ")}`;
  const rank = Prisma.sql`GREATEST(
    similarity(lower(p.name), ${loweredSearch}) * 1.35,
    similarity(lower(p.brand), ${loweredSearch}) * 1.1,
    similarity(lower(p.model), ${loweredSearch}) * 1.1,
    similarity(lower(t.name), ${loweredSearch}) * 1.2
  )`;

  const countRows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::int AS total
    FROM products p
    INNER JOIN types t ON t.id = p.type_id
    WHERE ${whereClause}
  `);

  const total = countRows[0]?.total ?? 0;
  if (total === 0) {
    return {
      page: 1,
      total: 0,
      totalPages: 1,
      products: [] as Awaited<ReturnType<typeof fetchProductsByIds>>,
      strategy: "trigram" as const
    };
  }

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * DEFAULT_PAGE_SIZE;
  const idRows = await prisma.$queryRaw<ProductIdRow[]>(Prisma.sql`
    SELECT p.id
    FROM products p
    INNER JOIN types t ON t.id = p.type_id
    WHERE ${whereClause}
    ORDER BY ${rank} DESC, p.created_at DESC, p.id DESC
    OFFSET ${skip}
    LIMIT ${DEFAULT_PAGE_SIZE}
  `);

  const products = await fetchProductsByIds(idRows.map((row) => row.id));

  return {
    page: safePage,
    total,
    totalPages,
    products,
    strategy: "trigram" as const
  };
}

const getTypesCached = unstable_cache(
  async () =>
    prisma.type.findMany({
      orderBy: {
        name: "asc"
      }
    }),
  ["catalog-types"],
  {
    revalidate: 60 * 60,
    tags: [CACHE_TAGS.types, CACHE_TAGS.catalog]
  }
);

export async function getTypes() {
  return getTypesCached();
}

const getCatalogCached = unstable_cache(
  async (page: number, search: string, typeId: number | null) => {
    const exactMatchResult = await exactProductCodeLookup(search, typeId);
    if (exactMatchResult) {
      return {
        ...exactMatchResult,
        types: await getTypes()
      };
    }

    const result =
      search.length === 0
        ? await browseCatalog(page, typeId)
        : (await searchCatalogIdsByFullText(page, search, typeId)) ??
          (await searchCatalogIdsByTrigram(page, search, typeId)) ??
          {
            page: 1,
            total: 0,
            totalPages: 1,
            products: [],
            strategy: "full-text" as CatalogSearchStrategy
          };

    return {
      ...result,
      types: await getTypes()
    };
  },
  ["catalog-page"],
  {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.catalog, CACHE_TAGS.products, CACHE_TAGS.types]
  }
);

export async function getCatalog(options: {
  page?: number;
  search?: string;
  typeId?: number | null;
}) {
  const page = normalizeSearchPage(options.page);
  const search = normalizeSearchInput(options.search);
  const typeId = normalizeTypeId(options.typeId);

  return getCatalogCached(page, search, typeId);
}

const getCatalogLandingInsightsCached = unstable_cache(
  async () => {
    const [typeRows, newestProducts, brands, templateReadyCount] = await Promise.all([
      prisma.type.findMany({
        include: {
          _count: {
            select: {
              products: true
            }
          }
        },
        orderBy: {
          name: "asc"
        }
      }),
      prisma.product.findMany({
        include: {
          type: true
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 4
      }),
      prisma.product.findMany({
        where: {
          brand: {
            not: ""
          }
        },
        select: {
          brand: true
        },
        distinct: ["brand"]
      }),
      prisma.product.count({
        where: {
          cardMode: "TEMPLATE"
        }
      })
    ]);

    const featuredTypes = typeRows
      .filter((row) => row._count.products > 0)
      .sort(
        (left, right) =>
          right._count.products - left._count.products || left.name.localeCompare(right.name)
      )
      .slice(0, 5);

    return {
      featuredTypes,
      newestProducts,
      totalBrands: brands.length,
      templateReadyCount
    };
  },
  ["catalog-landing-insights"],
  {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.catalog, CACHE_TAGS.products, CACHE_TAGS.types]
  }
);

export async function getCatalogLandingInsights() {
  return getCatalogLandingInsightsCached();
}

const getProductByRefCached = unstable_cache(
  async (ref: string) => {
    const id = decryptPublicId(ref) ?? Number.parseInt(ref, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }

    return prisma.product.findUnique({
      where: { id },
      include: { type: true }
    });
  },
  ["product-by-ref"],
  {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.products, CACHE_TAGS.catalog]
  }
);

export async function getProductByRef(ref: string) {
  return getProductByRefCached(ref);
}

function normalizeBrandKeyword(value: string) {
  const normalized = value.trim().toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return normalized.find((token) => token.length >= 3 && !/^\d+$/.test(token)) ?? null;
}

function extractBrandKeyword(name: string) {
  const ignored = new Set([
    "filter",
    "busi",
    "aki",
    "relay",
    "shock",
    "bushing",
    "kampas",
    "piringan",
    "cover",
    "spakbor",
    "mesin",
    "body",
    "rem",
    "suspensi",
    "kelistrikan",
    "produk",
    "sparepart"
  ]);

  const tokens = name.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return (
    tokens.find(
      (token) => token.length >= 3 && !/^\d+$/.test(token) && !ignored.has(token)
    ) ?? null
  );
}

const getProductRecommendationsCached = unstable_cache(
  async (productId: number) => {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { type: true }
    });
    if (!product) {
      return [];
    }

    const brandKeyword =
      normalizeBrandKeyword(product.brand) ?? extractBrandKeyword(product.name);

    if (brandKeyword) {
      const brandMatches = await prisma.product.findMany({
        where: {
          id: { not: product.id },
          OR: [
            { brand: { contains: brandKeyword, mode: "insensitive" } },
            { name: { contains: brandKeyword, mode: "insensitive" } }
          ]
        },
        include: { type: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 10
      });

      if (brandMatches.length > 0) {
        return brandMatches;
      }
    }

    const typeMatches = await prisma.product.findMany({
      where: {
        id: { not: product.id },
        typeId: product.typeId
      },
      include: { type: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10
    });

    if (typeMatches.length > 0) {
      return typeMatches;
    }

    return prisma.product.findMany({
      where: {
        id: { not: product.id }
      },
      include: { type: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10
    });
  },
  ["product-recommendations"],
  {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.products, CACHE_TAGS.catalog]
  }
);

export async function getProductRecommendations(productId: number) {
  return getProductRecommendationsCached(productId);
}

const getProductRefsForStaticPathsCached = unstable_cache(
  async () => {
    const rows = await prisma.product.findMany({
      select: {
        id: true
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 5000
    });

    return rows.map((row) => ({
      ref: encryptPublicId(row.id)
    }));
  },
  ["product-static-refs"],
  {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.products, CACHE_TAGS.sitemap]
  }
);

export async function getProductRefsForStaticPaths() {
  return getProductRefsForStaticPathsCached();
}


