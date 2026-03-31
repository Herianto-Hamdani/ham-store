import Link from "next/link";

import { ProductForm } from "@/components/product-form";
import { createProductAction } from "@/lib/actions/admin";
import { getTypes } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/site-settings";
import { getMaxUploadMb } from "@/lib/upload-config";
import {
  getSiteName,
  templateBackgroundUrl,
  templateLogoUrl,
  templateStyleVars
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductNewPage() {
  const [types, settings] = await Promise.all([getTypes(), getSiteSettings()]);
  const maxUploadMb = getMaxUploadMb();

  return (
    <>
      <section className="admin-head admin-head-stacked">
        <div>
          <span className="section-eyebrow">Catalog editor</span>
          <h1>Tambah Produk</h1>
          <p className="admin-lead">
            Tambahkan produk baru dengan harga, kategori, dan preview visual yang siap tampil di
            katalog publik.
          </p>
        </div>
        <div className="filter-actions">
          <Link href="/admin/products" className="btn btn-ghost">
            Kembali ke Produk
          </Link>
        </div>
      </section>
      <ProductForm
        key="product-form-create"
        action={createProductAction}
        submitLabel="Simpan"
        pendingLabel="Menyimpan Produk Baru..."
        types={types}
        values={{
          name: "",
          brand: "",
          model: "",
          detail: "",
          typeId: 0,
          cardMode: "image",
          priceItem: 0,
          priceInstall: 0,
          imagePosX: 50,
          imagePosY: 50,
          imageScale: 100,
          imageUrl: "/assets/img/placeholder.svg"
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

