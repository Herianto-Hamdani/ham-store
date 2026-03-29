import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { decryptPublicId, encryptPublicId, getProductCode } from "@/lib/utils";

const CATALOG_REVALIDATE_SECONDS = 60 * 5;

function buildSearchWhere(search: string, typeId?: number | null): Prisma.ProductWhereInput {
  const trimmed = search.trim();
  const where: Prisma.ProductWhereInput = {};

  if (typeId && typeId > 0) {
    where.typeId = typeId;
  }

  if (!trimmed) {
    return where;
  }

  where.OR = [
    { name: { contains: trimmed, mode: "insensitive" } },
    { brand: { contains: trimmed, mode: "insensitive" } },
    { model: { contains: trimmed, mode: "insensitive" } },
    { type: { name: { contains: trimmed, mode: "insensitive" } } }
  ];

  return where;
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
    const where = buildSearchWhere(search, typeId);

    const exactCodeMatch = search.toUpperCase().match(/^[A-Z0-9]+-(\d{4})-(\d+)$/);
    if (exactCodeMatch) {
      const product = await prisma.product.findUnique({
        where: {
          id: Number.parseInt(exactCodeMatch[2], 10)
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
        types: await getTypes()
      };
    }

    const total = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * DEFAULT_PAGE_SIZE;

    const [products, types] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          type: true
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: DEFAULT_PAGE_SIZE
      }),
      getTypes()
    ]);

    return {
      page: safePage,
      total,
      totalPages,
      products,
      types
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
  const page = Math.max(1, options.page ?? 1);
  const search = options.search?.trim() ?? "";
  const typeId = options.typeId && options.typeId > 0 ? options.typeId : null;

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
