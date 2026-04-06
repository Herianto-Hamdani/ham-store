import Link from "next/link";
import { notFound } from "next/navigation";

import { getWhatsappContactData } from "@/app/kontak/redirect-to-whatsapp";
import { formatRupiah, resolveImageUrl } from "@/lib/utils";

export const revalidate = 300;

export default async function ContactRefPage({
  params
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const { product, siteName, settings, whatsappUrl } = await getWhatsappContactData(ref);

  if (!product) {
    notFound();
  }

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
              <p>Detail produk sudah disiapkan. Lanjutkan ke WhatsApp bila sudah cocok.</p>
            </div>
          </div>

          <div className="contact-identity-product">
            <strong>{product.name}</strong>
            <span>
              {product.type.name} | {product.brand || "-"} | {product.model || "-"} |{" "}
              {formatRupiah(product.priceItem + product.priceInstall)}
            </span>
          </div>

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
            <Link href={`/produk/${ref}`} className="btn btn-ghost">
              Kembali ke Produk
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
