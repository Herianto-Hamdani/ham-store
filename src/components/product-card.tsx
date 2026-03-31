import type { Product, SiteSetting, Type } from "@prisma/client";
import Link from "next/link";

import { TemplatePosterContent } from "@/components/template-poster-content";
import {
  cardModeValue,
  encryptPublicId,
  excerpt,
  formatRupiah,
  getSiteName,
  resolveImageUrl,
  templateBackgroundUrl,
  templateLogoUrl,
  templateStyleVars
} from "@/lib/utils";

type ProductWithType = Product & {
  type: Type;
};

type ProductCardProps = {
  product: ProductWithType;
  settings: SiteSetting;
};

export function ProductCard({ product, settings }: ProductCardProps) {
  const href = `/produk/${encryptPublicId(product.id)}`;
  const thumb = resolveImageUrl(product.thumbPath, product.imagePath);
  const packagePrice = product.priceItem + product.priceInstall;
  const mode = cardModeValue(product.cardMode);
  const isTemplateMode = mode === "template";
  const templateStyle = templateStyleVars(settings);
  const templateBgUrl = templateBackgroundUrl(settings);
  const templateLogo = templateLogoUrl(settings);
  const siteName = getSiteName(settings.webName);
  const brand = product.brand.trim();
  const model = product.model.trim();
  const title =
    product.name.trim() || `${product.type.name} ${brand} ${model}`.trim() || "NAMA BARANG";

  return (
    <article className={`product-card ${isTemplateMode ? "product-card-template" : "product-card-image"}`}>
      {isTemplateMode ? (
        <Link className="poster-frame product-card-media" href={href} style={templateStyle}>
          <TemplatePosterContent
            backgroundUrl={templateBgUrl}
            logoUrl={templateLogo}
            siteName={siteName}
            title={title.toUpperCase()}
            modelLabel={model ? `MODEL: ${model.toUpperCase()}` : "MODEL: -"}
            brandLabel={brand ? brand.toUpperCase() : "ORI"}
            imageUrl={thumb}
            imageAlt={title}
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
        </Link>
      ) : (
        <Link className="thumb-wrap thumb-wrap-direct product-card-media" href={href}>
          <img
            src={thumb}
            alt={title}
            className="thumb-direct"
            width={720}
            height={540}
            loading="lazy"
            decoding="async"
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
        </Link>
      )}

      <Link className="card-body card-body-link" href={href}>
        <div className="chip">{product.type.name}</div>
        <p>{excerpt(product.detail, 120)}</p>
        <div className="price-table-wrap">
          <div className="price-inline-card" aria-label="Harga paket">
            <span className="price-inline-card-label">Harga Paket</span>
            <strong className="price-inline-card-value">{formatRupiah(packagePrice)}</strong>
          </div>
        </div>
      </Link>
    </article>
  );
}
