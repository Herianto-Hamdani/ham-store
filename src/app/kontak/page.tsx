import Link from "next/link";

import { getWhatsappContactData } from "@/app/kontak/redirect-to-whatsapp";
import { resolveImageUrl } from "@/lib/utils";

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ContactPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const productRef =
    typeof params.product_ref === "string"
      ? params.product_ref
      : typeof params.product_id === "string"
        ? params.product_id
        : null;

  const { siteName, settings, product, whatsappUrl } = await getWhatsappContactData(productRef);
  const logoUrl = resolveImageUrl(settings.logoThumbPath, settings.logoPath);
  const hasLogo = logoUrl !== "/assets/img/placeholder.svg";

  return (
    <main className="container main-content">
      <section className="contact-identity">
        <div className="contact-identity-card">
          <div className="contact-identity-head">
            {hasLogo ? (
              <img src={logoUrl} alt={`${siteName} logo`} className="contact-identity-logo" />
            ) : (
              <span className="contact-identity-mark">{siteName.slice(0, 2).toUpperCase()}</span>
            )}
            <div>
              <span className="section-eyebrow">Kontak Resmi</span>
              <h1>{siteName}</h1>
              <p>Hubungi admin melalui WhatsApp setelah cek detail singkat ini.</p>
            </div>
          </div>

          {product ? (
            <div className="contact-identity-product">
              <strong>{product.name}</strong>
              <span>
                {product.type.name} | {product.brand || "-"} | {product.model || "-"}
              </span>
            </div>
          ) : null}

          <div className="contact-identity-actions">
            {whatsappUrl ? (
              <a href={whatsappUrl} className="btn btn-primary" target="_blank" rel="noreferrer">
                Lanjut ke WhatsApp
              </a>
            ) : (
              <span className="contact-identity-note">
                Nomor WhatsApp belum diatur oleh admin.
              </span>
            )}
            <Link href={product && productRef ? `/produk/${productRef}` : "/"} className="btn btn-ghost">
              {product ? "Kembali ke Produk" : "Kembali ke Katalog"}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
