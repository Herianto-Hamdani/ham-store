import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { getRecentTraffic, getTopPages, getTrafficSummary } from "@/lib/data/traffic";

function sortTypeSummary<T extends { name: string; _count: { products: number } }>(rows: T[]) {
  return [...rows].sort(
    (left, right) => right._count.products - left._count.products || left.name.localeCompare(right.name)
  );
}

export async function getAdminProductDashboard(options: {
  page: number;
  search?: string;
  typeId?: number | null;
}) {
  const page = Math.max(1, options.page);
  const trimmedSearch = options.search?.trim() ?? "";
  const typeId = options.typeId && options.typeId > 0 ? options.typeId : null;

  const where = {
    ...(typeId ? { typeId } : {}),
    ...(trimmedSearch
      ? {
          OR: [
            { name: { contains: trimmedSearch, mode: "insensitive" as const } },
            { brand: { contains: trimmedSearch, mode: "insensitive" as const } },
            { model: { contains: trimmedSearch, mode: "insensitive" as const } },
            {
              type: {
                name: { contains: trimmedSearch, mode: "insensitive" as const }
              }
            }
          ]
        }
      : {})
  };

  const perPage = 12;
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);

  const [products, types, typeSummaryRaw, templateCount, averagePrice, latestProduct] =
    await Promise.all([
      prisma.product.findMany({
        where,
        include: { type: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (safePage - 1) * perPage,
        take: perPage
      }),
      prisma.type.findMany({ orderBy: { name: "asc" } }),
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
      }),
      prisma.product.findFirst({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          type: true
        }
      })
    ]);

  const typeSummary = sortTypeSummary(typeSummaryRaw);

  return {
    page: safePage,
    total,
    totalPages,
    products,
    types,
    typeSummary,
    templateCount,
    directCount: Math.max(0, total - templateCount),
    averagePackagePrice:
      Math.round((averagePrice._avg.priceItem ?? 0) + (averagePrice._avg.priceInstall ?? 0)),
    latestProduct
  };
}

const getAdminOverviewCached = unstable_cache(
  async () => {
    const [
      productCount,
      typeCount,
      adminAccounts,
      recentProducts,
      typeSummaryRaw,
      trafficSummary,
      trafficDaily,
      trafficPages,
      templateProducts,
      averages
    ] = await Promise.all([
      prisma.product.count(),
      prisma.type.count(),
      prisma.user.findMany({
        where: {
          role: "ADMIN"
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
      }),
      prisma.product.findMany({
        include: {
          type: true
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 8
      }),
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
      getTrafficSummary(14),
      getRecentTraffic(14),
      getTopPages(10),
      prisma.product.count({
        where: {
          cardMode: "TEMPLATE"
        }
      }),
      prisma.product.aggregate({
        _avg: {
          priceItem: true,
          priceInstall: true
        }
      })
    ]);

    const typeSummary = sortTypeSummary(typeSummaryRaw);
    const activeTypes = typeSummary.filter((item) => item._count.products > 0).length;

    return {
      productCount,
      typeCount,
      activeTypes,
      adminAccounts,
      recentProducts,
      typeSummary,
      trafficSummary,
      trafficDaily,
      trafficPages,
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
  const search = options.search?.trim() ?? "";
  const perPage = 12;
  const where = search
    ? {
        name: {
          contains: search,
          mode: "insensitive" as const
        }
      }
    : {};
  const total = await prisma.type.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);

  const [types, summary] = await Promise.all([
    prisma.type.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: { name: "asc" },
      skip: (safePage - 1) * perPage,
      take: perPage
    }),
    prisma.type.findMany({
      include: {
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: { name: "asc" }
    })
  ]);

  const assignedProducts = summary.reduce((sum, item) => sum + item._count.products, 0);
  const activeTypes = summary.filter((item) => item._count.products > 0).length;

  return {
    page: safePage,
    total,
    totalPages,
    types,
    activeTypes,
    assignedProducts,
    totalTypes: summary.length
  };
}

export async function getAdminAccounts() {
  return prisma.user.findMany({
    where: {
      role: "ADMIN"
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
}
