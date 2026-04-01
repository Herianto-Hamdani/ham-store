import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { getCatalogSearchResults, getTypes } from "@/lib/data/catalog";
import { getTrafficSummary } from "@/lib/data/traffic";
import { prisma } from "@/lib/prisma";
import { normalizeSearchInput, normalizeTypeId } from "@/lib/search-utils";

function sortTypeSummary<T extends { name: string; _count: { products: number } }>(rows: T[]) {
  return [...rows].sort(
    (left, right) => right._count.products - left._count.products || left.name.localeCompare(right.name)
  );
}

type CountRow = {
  total: number;
};

type TypeIdRow = {
  id: number;
};

type ProductMetricRow = {
  template_count: number;
  average_package_price: number | string | Prisma.Decimal | null;
};

function buildProductSearchDocument() {
  return Prisma.sql`
    setweight(to_tsvector('simple', coalesce(p.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(p.brand, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(p.model, '')), 'B')
  `;
}

function buildFullTextSearchQuery(search: string): string | null {
  const tokens = search
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 0);

  if (!tokens || tokens.length === 0) {
    return null;
  }

  return tokens.map((token) => `${token}:*`).join(" & ");
}

function buildProductBaseFilters(typeId: number | null) {
  const filters: Prisma.Sql[] = [];

  if (typeId && typeId > 0) {
    filters.push(Prisma.sql`p.type_id = ${typeId}`);
  }

  return filters;
}

function toRoundedMetric(value: number | string | Prisma.Decimal | null | undefined) {
  if (typeof value === "number") {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  }

  if (value instanceof Prisma.Decimal) {
    return Math.max(0, Math.round(value.toNumber()));
  }

  return 0;
}

const getAdminTypeSummaryCached = unstable_cache(
  async () =>
    prisma.type.findMany({
      select: {
        id: true,
        name: true,
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
  ["admin-type-summary"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.adminOverview, CACHE_TAGS.catalog, CACHE_TAGS.types, CACHE_TAGS.products]
  }
);

async function getAdminTypeSummary() {
  return getAdminTypeSummaryCached();
}

const getAdminLatestProductCached = unstable_cache(
  async () =>
    prisma.product.findFirst({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        type: true
      }
    }),
  ["admin-latest-product"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.adminOverview, CACHE_TAGS.catalog, CACHE_TAGS.products]
  }
);

async function getAdminLatestProduct() {
  return getAdminLatestProductCached();
}

async function getBrowseMetrics(typeId: number | null) {
  const where = typeId ? { typeId } : {};
  const [templateCount, averagePrice] = await Promise.all([
    prisma.product.count({
      where: {
        ...where,
        cardMode: "TEMPLATE"
      }
    }),
    prisma.product.aggregate({
      where,
      _avg: {
        priceItem: true,
        priceInstall: true
      }
    })
  ]);

  return {
    templateCount,
    averagePackagePrice:
      Math.round((averagePrice._avg.priceItem ?? 0) + (averagePrice._avg.priceInstall ?? 0))
  };
}

async function getFullTextMetrics(search: string, typeId: number | null) {
  const tsQuery = buildFullTextSearchQuery(search);
  if (!tsQuery) {
    return {
      templateCount: 0,
      averagePackagePrice: 0
    };
  }

  const loweredSearch = search.toLowerCase();
  const prefixLike = `${loweredSearch}%`;
  const document = buildProductSearchDocument();
  const filters = [
    ...buildProductBaseFilters(typeId),
    Prisma.sql`(
      ${document} @@ to_tsquery('simple', ${tsQuery}) OR
      lower(t.name) = ${loweredSearch} OR
      lower(t.name) LIKE ${prefixLike} OR
      lower(p.name) LIKE ${prefixLike} OR
      lower(p.brand) LIKE ${prefixLike} OR
      lower(p.model) LIKE ${prefixLike}
    )`
  ];
  const whereClause = Prisma.sql`${Prisma.join(filters, " AND ")}`;

  const rows = await prisma.$queryRaw<ProductMetricRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(CASE WHEN p.card_mode::text = 'TEMPLATE' THEN 1 ELSE 0 END), 0)::int AS template_count,
      COALESCE(ROUND(AVG((p.price_item + p.price_install)::numeric))::int, 0) AS average_package_price
    FROM products p
    INNER JOIN types t ON t.id = p.type_id
    WHERE ${whereClause}
  `);

  const row = rows[0];

  return {
    templateCount: row?.template_count ?? 0,
    averagePackagePrice: toRoundedMetric(row?.average_package_price)
  };
}

async function getTrigramMetrics(search: string, typeId: number | null) {
  const filters = [
    ...buildProductBaseFilters(typeId),
    Prisma.sql`(
      p.name % ${search} OR
      p.brand % ${search} OR
      p.model % ${search} OR
      t.name % ${search}
    )`
  ];
  const whereClause = Prisma.sql`${Prisma.join(filters, " AND ")}`;

  const rows = await prisma.$queryRaw<ProductMetricRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(CASE WHEN p.card_mode::text = 'TEMPLATE' THEN 1 ELSE 0 END), 0)::int AS template_count,
      COALESCE(ROUND(AVG((p.price_item + p.price_install)::numeric))::int, 0) AS average_package_price
    FROM products p
    INNER JOIN types t ON t.id = p.type_id
    WHERE ${whereClause}
  `);

  const row = rows[0];

  return {
    templateCount: row?.template_count ?? 0,
    averagePackagePrice: toRoundedMetric(row?.average_package_price)
  };
}

function getExactMetrics(
  result: Awaited<ReturnType<typeof getCatalogSearchResults>>
) {
  const product = result.products[0];
  const packagePrice = product ? product.priceItem + product.priceInstall : 0;
  const templateCount = product?.cardMode === "TEMPLATE" ? 1 : 0;

  return {
    templateCount,
    averagePackagePrice: result.total > 0 ? packagePrice : 0
  };
}

async function resolveAdminProductMetrics(
  search: string,
  typeId: number | null,
  result: Awaited<ReturnType<typeof getCatalogSearchResults>>
) {
  if (search.length === 0 || result.strategy === "browse") {
    return getBrowseMetrics(typeId);
  }

  if (result.strategy === "exact") {
    return getExactMetrics(result);
  }

  if (result.strategy === "trigram") {
    return getTrigramMetrics(search, typeId);
  }

  return getFullTextMetrics(search, typeId);
}

async function fetchTypesByIds(ids: number[]) {
  if (ids.length === 0) {
    return [];
  }

  const rows = await prisma.type.findMany({
    where: {
      id: {
        in: ids
      }
    },
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  const rowMap = new Map(rows.map((row) => [row.id, row]));
  return ids
    .map((id) => rowMap.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

async function getFilteredTypeList(page: number, search: string) {
  const safePage = Math.max(1, page);
  const loweredSearch = search.toLowerCase();
  const prefixLike = `${loweredSearch}%`;
  const useTrigram = search.length >= 3;
  const whereClause = useTrigram
    ? Prisma.sql`(
        lower(t.name) = ${loweredSearch} OR
        lower(t.name) LIKE ${prefixLike} OR
        t.name % ${search}
      )`
    : Prisma.sql`(
        lower(t.name) = ${loweredSearch} OR
        lower(t.name) LIKE ${prefixLike}
      )`;
  const ranking = useTrigram
    ? Prisma.sql`
        CASE
          WHEN lower(t.name) = ${loweredSearch} THEN 0
          WHEN lower(t.name) LIKE ${prefixLike} THEN 1
          ELSE 2
        END,
        similarity(t.name, ${search}) DESC,
        t.name ASC
      `
    : Prisma.sql`
        CASE
          WHEN lower(t.name) = ${loweredSearch} THEN 0
          ELSE 1
        END,
        t.name ASC
      `;

  const countRows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::int AS total
    FROM types t
    WHERE ${whereClause}
  `);
  const total = countRows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
  const normalizedPage = Math.min(safePage, totalPages);
  const idRows = await prisma.$queryRaw<TypeIdRow[]>(Prisma.sql`
    SELECT t.id
    FROM types t
    WHERE ${whereClause}
    ORDER BY ${ranking}
    OFFSET ${(normalizedPage - 1) * DEFAULT_PAGE_SIZE}
    LIMIT ${DEFAULT_PAGE_SIZE}
  `);
  const types = await fetchTypesByIds(idRows.map((row) => row.id));

  return {
    page: normalizedPage,
    total,
    totalPages,
    types
  };
}

export async function getAdminProductDashboard(options: {
  page: number;
  search?: string;
  typeId?: number | null;
}) {
  const page = Math.max(1, options.page);
  const trimmedSearch = normalizeSearchInput(options.search);
  const typeId = normalizeTypeId(options.typeId);

  const [result, types, typeSummaryRaw, latestProduct] = await Promise.all([
    getCatalogSearchResults({
      page,
      search: trimmedSearch,
      typeId
    }),
    getTypes(),
    getAdminTypeSummary(),
    getAdminLatestProduct()
  ]);
  const metrics = await resolveAdminProductMetrics(trimmedSearch, typeId, result);
  const typeSummary = sortTypeSummary(typeSummaryRaw);

  return {
    page: result.page,
    total: result.total,
    totalPages: result.totalPages,
    products: result.products,
    types,
    typeSummary,
    templateCount: metrics.templateCount,
    directCount: Math.max(0, result.total - metrics.templateCount),
    averagePackagePrice: metrics.averagePackagePrice,
    latestProduct
  };
}

const getAdminOverviewCached = unstable_cache(
  async () => {
    const productCount = await prisma.product.count();
    const typeCount = await prisma.type.count();
    const adminCount = await prisma.user.count({
      where: {
        role: "ADMIN"
      }
    });
    const typeSummaryRaw = await prisma.type.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });
    const trafficSummary = await getTrafficSummary(14);
    const templateProducts = await prisma.product.count({
      where: {
        cardMode: "TEMPLATE"
      }
    });
    const averages = await prisma.product.aggregate({
      _avg: {
        priceItem: true,
        priceInstall: true
      }
    });

    const typeSummary = sortTypeSummary(typeSummaryRaw);
    const activeTypes = typeSummary.filter((item) => item._count.products > 0).length;

    return {
      productCount,
      typeCount,
      activeTypes,
      adminCount,
      typeSummary,
      trafficSummary,
      templateProducts,
      directProducts: Math.max(0, productCount - templateProducts),
      averagePackagePrice:
        Math.round((averages._avg.priceItem ?? 0) + (averages._avg.priceInstall ?? 0))
    };
  },
  ["admin-overview"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.adminOverview, CACHE_TAGS.catalog, CACHE_TAGS.traffic]
  }
);

export async function getAdminOverview() {
  return getAdminOverviewCached();
}

export async function getTypeList(options: { page: number; search?: string }) {
  const page = Math.max(1, options.page);
  const search = normalizeSearchInput(options.search);
  const [result, summary] = await Promise.all([
    search.length === 0
      ? (async () => {
          const total = await prisma.type.count();
          const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
          const safePage = Math.min(page, totalPages);
          const types = await prisma.type.findMany({
            include: {
              _count: {
                select: {
                  products: true
                }
              }
            },
            orderBy: { name: "asc" },
            skip: (safePage - 1) * DEFAULT_PAGE_SIZE,
            take: DEFAULT_PAGE_SIZE
          });

          return {
            page: safePage,
            total,
            totalPages,
            types
          };
        })()
      : getFilteredTypeList(page, search),
    getAdminTypeSummary()
  ]);

  const assignedProducts = summary.reduce((sum, item) => sum + item._count.products, 0);
  const activeTypes = summary.filter((item) => item._count.products > 0).length;

  return {
    page: result.page,
    total: result.total,
    totalPages: result.totalPages,
    types: result.types,
    activeTypes,
    assignedProducts,
    totalTypes: summary.length
  };
}

export async function getAdminAccounts() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true
    },
    where: {
      role: "ADMIN"
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
}
