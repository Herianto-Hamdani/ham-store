import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/product-form";
import { updateProductAction } from "@/lib/actions/admin";
import { getTypes } from "@/lib/data/catalog";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getMaxUploadMb } from "@/lib/upload-config";
import {
  cardModeValue,
  encryptPublicId,
  getProductCode,
  getSiteName,
  resolveImageUrl,
  templateBackgroundUrl,
  templateLogoUrl,
  templateStyleVars
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductEditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number.parseInt(id, 10);
  const [product, types, settings] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId }
    }),
    getTypes(),
    getSiteSettings()
  ]);

  if (!product) {
    notFound();
  }

  const maxUploadMb = getMaxUploadMb();

  return (
    <>
      <section className="admin-head admin-head-stacked">
        <div>
          <span className="section-eyebrow">Catalog editor</span>
          <h1>Edit Produk</h1>
          <p className="admin-lead">
            Perbarui detail katalog, harga, dan posisi gambar untuk produk{" "}
            <strong>{getProductCode(product)}</strong>.
          </p>
        </div>
        <div className="filter-actions">
          <Link href={`/produk/${encryptPublicId(product.id)}`} className="btn btn-ghost">
            Lihat Publik
          </Link>
          <Link href="/admin/products" className="btn btn-ghost">
            Kembali ke Produk
          </Link>
        </div>
      </section>
      <ProductForm
        action={updateProductAction.bind(null, product.id)}
        submitLabel="Update"
        types={types}
        values={{
          name: product.name,
          brand: product.brand,
          model: product.model,
          detail: product.detail,
          typeId: product.typeId,
          cardMode: cardModeValue(product.cardMode),
          priceItem: product.priceItem,
          priceInstall: product.priceInstall,
          imagePosX: product.imagePosX,
          imagePosY: product.imagePosY,
          imageScale: product.imageScale,
          imageUrl: resolveImageUrl(product.thumbPath, product.imagePath)
        }}
        template={{
          siteName: getSiteName(settings.webName),
          style: templateStyleVars(settings),
          backgroundUrl: templateBackgroundUrl(settings),
          logoUrl: templateLogoUrl(settings)
        }}
        maxUploadMb={maxUploadMb}
      />
    </>
  );
}
