import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/product-card";
import { TemplatePosterContent } from "@/components/template-poster-content";
import { getProductByRef, getProductRecommendations } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/site-settings";
import {
  cardModeValue,
  formatRupiah,
  getSiteName,
  resolveImageUrl,
  templateBackgroundUrl,
  templateLogoUrl,
  templateStyleVars
} from "@/lib/utils";

export const revalidate = 300;

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const [product, settings] = await Promise.all([getProductByRef(ref), getSiteSettings()]);

  if (!product) {
    notFound();
  }

  const recommendations = await getProductRecommendations(product.id);
  const priceTotal = product.priceItem + product.priceInstall;
  const imageUrl = resolveImageUrl(product.imagePath, product.thumbPath);
  const siteName = getSiteName(settings.webName);
  const mode = cardModeValue(product.cardMode);
  const templateStyle = templateStyleVars(settings);
  const templateBgUrl = templateBackgroundUrl(settings);
  const templateLogo = templateLogoUrl(settings);

  return (
    <main className="container main-content">
      <article className="detail-layout">
        <div className="detail-image-wrap">
          {mode === "template" ? (
            <div className="poster-frame detail-poster-frame" style={templateStyle}>
              <TemplatePosterContent
                backgroundUrl={templateBgUrl}
                logoUrl={templateLogo}
                siteName={siteName}
                title={product.name.toUpperCase()}
                modelLabel={product.model ? `MODEL: ${product.model.toUpperCase()}` : "MODEL: -"}
                brandLabel={product.brand ? product.brand.toUpperCase() : "ORI"}
                imageUrl={imageUrl}
                imageAlt={product.name}
                imageLoading="eager"
                imageDecoding="sync"
                imageStyle={
                  {
                    "--photo-pos-x": `${product.imagePosX}%`,
                    "--photo-pos-y": `${product.imagePosY}%`,
                    "--photo-pos-x-num": product.imagePosX,
                    "--photo-pos-y-num": product.imagePosY,
                    "--photo-scale": `${product.imageScale / 100}`
                  } as React.CSSProperties
                }
              />
            </div>
          ) : (
            <div className="thumb-wrap thumb-wrap-direct detail-thumb-wrap">
              <img
                src={imageUrl}
                alt={product.name}
                className="thumb-direct detail-thumb-direct"
                width={1600}
                height={1200}
                loading="eager"
                decoding="sync"
                style={
                  {
                    "--photo-pos-x": `${product.imagePosX}%`,
                    "--photo-pos-y": `${product.imagePosY}%`,
                    "--photo-pos-x-num": product.imagePosX,
                    "--photo-pos-y-num": product.imagePosY,
                    "--photo-scale": `${product.imageScale / 100}`
                  } as React.CSSProperties
                }
              />
            </div>
          )}
        </div>

        <div className="detail-content">
          <div className="chip">{product.type.name}</div>
          <h1>{product.name}</h1>
          <p className="detail-meta">
            Merek: <strong>{product.brand || "-"}</strong> | Model:{" "}
            <strong>{product.model || "-"}</strong>
          </p>
          <p className="detail-text">{product.detail}</p>
          <div className="detail-controls">
            <div className="price-table-wrap detail-price-wrap">
              <table className="price-table" aria-label="Harga paket">
                <tbody>
                  <tr>
                    <th>Harga Paket</th>
                    <td>{formatRupiah(priceTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="detail-actions">
              <Link href={`/kontak/${ref}`} className="btn btn-primary">
                Hubungi via WhatsApp
              </Link>
              <Link href="/" className="btn btn-ghost">
                Kembali ke Katalog
              </Link>
            </div>
          </div>
        </div>
      </article>

      {recommendations.length > 0 ? (
        <section className="detail-recommendation-section">
          <div className="section-title">
            <h2>Rekomendasi Produk Terkait</h2>
          </div>
          <div className="card-grid recommendation-grid">
            {recommendations.map((item) => (
              <ProductCard key={item.id} product={item} settings={settings} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
