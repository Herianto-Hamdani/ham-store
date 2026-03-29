import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { absoluteUrl, encryptPublicId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        updatedAt: true
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 20000
    });

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
