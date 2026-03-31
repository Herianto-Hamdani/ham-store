import type { Product, SiteSetting, Type } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

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

const CARD_MEDIA_SIZES =
  "(max-width: 640px) 44vw, (max-width: 820px) 30vw, (max-width: 1180px) 24vw, (max-width: 1540px) 18vw, 240px";

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
          {templateBgUrl ? (
            <div className="poster-bg-layer">
              <Image
                src={templateBgUrl}
                alt=""
                className="poster-bg-image"
                fill
                sizes={CARD_MEDIA_SIZES}
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
                sizes="(max-width: 640px) 18vw, (max-width: 980px) 11vw, 88px"
              />
            ) : (
              <span className="poster-logo-text">{siteName}</span>
            )}
          </div>
          <div className="poster-side poster-side-left">
            {model ? `MODEL: ${model.toUpperCase()}` : "MODEL: -"}
          </div>
          <div className="poster-side poster-side-right">{brand ? brand.toUpperCase() : "ORI"}</div>
          <div className="poster-photo-wrap">
            <Image
              src={thumb}
              alt={title}
              className="poster-photo"
              fill
              sizes={CARD_MEDIA_SIZES}
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
          <div className="poster-title-box">{title.toUpperCase()}</div>
        </Link>
      ) : (
        <Link className="thumb-wrap thumb-wrap-direct product-card-media" href={href}>
          <Image
            src={thumb}
            alt={title}
            className="thumb-direct"
            fill
            sizes={CARD_MEDIA_SIZES}
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
