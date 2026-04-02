import type { CSSProperties } from "react";
import Link from "next/link";

import { TemplatePosterContent } from "@/components/template-poster-content";
import type { CatalogCardItem, CatalogCardTemplateConfig } from "@/lib/catalog-card";

type ProductCardViewProps = {
  item: CatalogCardItem;
  template: CatalogCardTemplateConfig;
};

export function ProductCardView({ item, template }: ProductCardViewProps) {
  const isTemplateMode = item.mode === "template";
  const templateCardStyle = isTemplateMode
    ? ({
        ...template.style,
        ...(template.backgroundUrl
          ? {
              ["--template-card-background-image" as string]: `url("${template.backgroundUrl}")`
            }
          : {})
      } as CSSProperties)
    : undefined;

  return (
    <article
      className={`product-card ${isTemplateMode ? "product-card-template" : "product-card-image"}`}
      data-title-density={item.titleDensity}
      style={templateCardStyle}
    >
      {isTemplateMode ? (
        <Link className="poster-frame product-card-media product-card-template-shell" href={item.href}>
          <TemplatePosterContent
            backgroundUrl={template.backgroundUrl}
            logoUrl={template.logoUrl}
            siteName={template.siteName}
            title={item.title.toUpperCase()}
            modelLabel={item.modelLabel}
            brandLabel={item.brandLabel}
            imageUrl={item.thumbUrl}
            imageAlt={item.title}
            imageStyle={item.imageStyle}
          />
          <div className="card-body card-body-link card-body-template">
            <div className="chip">{item.typeName}</div>
            <p>{item.detailExcerpt}</p>
            <div className="price-table-wrap">
              <div className="price-inline-card" aria-label="Harga paket">
                <span className="price-inline-card-label">
                  <span>Harga</span>
                  <span>Paket</span>
                </span>
                <strong className="price-inline-card-value">{item.packagePriceText}</strong>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <Link className="thumb-wrap thumb-wrap-direct product-card-media" href={item.href}>
          <img
            src={item.thumbUrl}
            alt={item.title}
            className="thumb-direct"
            width={720}
            height={540}
            loading="lazy"
            decoding="async"
            style={item.imageStyle}
          />
        </Link>
      )}

      {!isTemplateMode ? (
        <Link className="card-body card-body-link" href={item.href}>
          <div className="chip">{item.typeName}</div>
          <p>{item.detailExcerpt}</p>
          <div className="price-table-wrap">
            <div className="price-inline-card" aria-label="Harga paket">
              <span className="price-inline-card-label">
                <span>Harga</span>
                <span>Paket</span>
              </span>
              <strong className="price-inline-card-value">{item.packagePriceText}</strong>
            </div>
          </div>
        </Link>
      ) : null}
    </article>
  );
}
