import Image from "next/image";
import Link from "next/link";

import { LoadingLink } from "@/components/loading-link";
import { ProductCard } from "@/components/product-card";
import { getCatalog } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/site-settings";
import { buildWhatsappUrl, getSiteName, resolveImageUrl } from "@/lib/utils";

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const typeId = typeof params.type === "string" ? Number.parseInt(params.type, 10) : null;
  const page = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;

  const [settings, catalog] = await Promise.all([
    getSiteSettings(),
    getCatalog({
      page,
      search,
      typeId
    })
  ]);

  const siteName = getSiteName(settings.webName);
  const hasBanner = Boolean(settings.bannerThumbPath || settings.bannerPath);
  const bannerImage = hasBanner ? resolveImageUrl(settings.bannerThumbPath, settings.bannerPath) : null;
  const whatsappUrl = buildWhatsappUrl(settings.whatsappNumber, settings.whatsappMessage);

  return (
    <main className="container main-content">
      <section className={`hero-panel hero-panel-compact${hasBanner ? " hero-panel-with-banner" : ""}`}>
        <div className="hero-panel-top">
          <div className="hero-panel-content">
            <h1>{siteName}</h1>
            <p>Katalog sparepart premium, ringkas, cepat, dan siap kirim.</p>
            <div className="hero-badges">
              <span>{catalog.total.toLocaleString("id-ID")} produk</span>
              <span>{catalog.types.length.toLocaleString("id-ID")} type</span>
              <span>Mobile-friendly</span>
            </div>
          </div>
          <div className="hero-panel-actions">
            {whatsappUrl ? (
              <Link className="btn btn-primary" href="/kontak">
                Hubungi WhatsApp
              </Link>
            ) : null}
            <a className="btn btn-ghost" href="#katalogProduk">
              Lihat Katalog
            </a>
          </div>
        </div>
        {bannerImage ? (
          <div className="hero-banner-wrap hero-banner-wrap-compact">
            <Image
              src={bannerImage}
              alt={`Banner ${siteName}`}
              className="hero-banner-image hero-banner-image-compact"
              width={1600}
              height={400}
              priority
              sizes="(max-width: 980px) 100vw, 1200px"
            />
          </div>
        ) : null}
      </section>

      <section className="filter-panel filter-panel-compact">
        <form method="get" action="/" className="filter-grid">
          <label>
            Search Nama / Merek / Model / Kode Produk
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Contoh: LCD-0305-79"
            />
          </label>
          <label>
            Filter Type
            <select name="type" defaultValue={typeId ? String(typeId) : "0"}>
              <option value="0">Semua Type</option>
              {catalog.types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-actions">
            <button type="submit" className="btn btn-primary">
              Terapkan
            </button>
            <Link href="/" className="btn btn-ghost">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section id="katalogProduk">
        <div className="section-title">
          <h2>Daftar Harga Produk {siteName}</h2>
          <p>{catalog.total} item ditemukan</p>
        </div>

        {catalog.products.length === 0 ? (
          <div className="empty-state">Belum ada produk untuk filter ini.</div>
        ) : (
          <div className="card-grid">
            {catalog.products.map((product) => (
              <ProductCard key={product.id} product={product} settings={settings} />
            ))}
          </div>
        )}

        {catalog.totalPages > 1 ? (
          <nav className="pagination" aria-label="Pagination produk">
            {Array.from({ length: catalog.totalPages }, (_, index) => {
              const targetPage = index + 1;
              const next = new URLSearchParams();
              if (search) {
                next.set("q", search);
              }
              if (typeId) {
                next.set("type", String(typeId));
              }
              next.set("page", String(targetPage));

              if (targetPage === catalog.page) {
                return (
                  <span key={targetPage} className="active" aria-current="page">
                    {targetPage}
                  </span>
                );
              }

              return (
                <LoadingLink
                  key={targetPage}
                  href={`/?${next.toString()}`}
                  className=""
                  loadingLabel={`Memuat Halaman Katalog ${targetPage}...`}
                  showInlineSpinner={false}
                >
                  {targetPage}
                </LoadingLink>
              );
            })}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
