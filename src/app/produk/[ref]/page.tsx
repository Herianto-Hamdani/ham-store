import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/product-card";
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
              {templateBgUrl ? (
                <div className="poster-bg-layer">
                  <Image
                    src={templateBgUrl}
                    alt=""
                    className="poster-bg-image"
                    fill
                    sizes="(max-width: 980px) 100vw, 56vw"
                  />
                </div>
              ) : null}
              <div className="poster-logo">
                {templateLogo ? (
                  <Image
                    src={templateLogo}
                    alt={`${siteName} logo`}
                    className="poster-logo-image"
                    fill
                    sizes="(max-width: 980px) 28vw, 180px"
                  />
                ) : (
                  <span className="poster-logo-text">{siteName}</span>
                )}
              </div>
              <div className="poster-side poster-side-left">
                {product.model ? `MODEL: ${product.model.toUpperCase()}` : "MODEL: -"}
              </div>
              <div className="poster-side poster-side-right">
                {product.brand ? product.brand.toUpperCase() : "ORI"}
              </div>
              <div className="poster-photo-wrap">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  className="poster-photo"
                  fill
                  priority
                  sizes="(max-width: 980px) 100vw, 56vw"
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
              <div className="poster-title-box">{product.name.toUpperCase()}</div>
            </div>
          ) : (
            <div className="thumb-wrap thumb-wrap-direct detail-thumb-wrap">
              <Image
                src={imageUrl}
                alt={product.name}
                className="thumb-direct detail-thumb-direct"
                fill
                priority
                sizes="(max-width: 980px) 100vw, 56vw"
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
