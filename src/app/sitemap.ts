import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, encryptPublicId } from "@/lib/utils";

export const revalidate = 3600;

const getSitemapProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      select: {
        id: true,
        updatedAt: true
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 20000
    }),
  ["sitemap-products"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.sitemap, CACHE_TAGS.products]
  }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const products = await getSitemapProducts();

    return [
      {
        url: absoluteUrl("/"),
        lastModified: new Date(),
        changeFrequency: "hourly",
        priority: 1
      },
      {
        url: absoluteUrl("/kontak"),
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.6
      },
      ...products.map((product) => ({
        url: absoluteUrl(`/produk/${encryptPublicId(product.id)}`),
        lastModified: product.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8
      }))
    ];
  } catch {
    return [
      {
        url: absoluteUrl("/"),
        lastModified: new Date(),
        changeFrequency: "hourly",
        priority: 1
      }
    ];
  }
}
