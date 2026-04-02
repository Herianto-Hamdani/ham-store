import type { Product, SiteSetting, Type } from "@prisma/client";

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

export type ProductWithType = Product & {
  type: Type;
};

export type CatalogCardItem = {
  id: number;
  href: string;
  detailExcerpt: string;
  typeName: string;
  title: string;
  titleDensity: "regular" | "compact" | "tight";
  brandLabel: string;
  modelLabel: string;
  mode: "image" | "template";
  packagePriceText: string;
  thumbUrl: string;
  imageStyle: React.CSSProperties;
};

export type CatalogCardTemplateConfig = {
  siteName: string;
  backgroundUrl: string | null;
  logoUrl: string | null;
  style: React.CSSProperties;
};

export function createCatalogTemplateConfig(settings: SiteSetting): CatalogCardTemplateConfig {
  return {
    siteName: getSiteName(settings.webName),
    backgroundUrl: templateBackgroundUrl(settings),
    logoUrl: templateLogoUrl(settings),
    style: templateStyleVars(settings)
  };
}

export function createCatalogCardItem(product: ProductWithType): CatalogCardItem {
  const brand = product.brand.trim();
  const model = product.model.trim();
  const title =
    product.name.trim() || `${product.type.name} ${brand} ${model}`.trim() || "NAMA BARANG";
  const titleWordCount = title.split(/\s+/).filter(Boolean).length;
  const titleDensity =
    title.length > 32 || titleWordCount >= 5
      ? "tight"
      : title.length > 22 || titleWordCount >= 4
        ? "compact"
        : "regular";

  return {
    id: product.id,
    href: `/produk/${encryptPublicId(product.id)}`,
    detailExcerpt: excerpt(product.detail, 120),
    typeName: product.type.name,
    title,
    titleDensity,
    brandLabel: brand ? brand.toUpperCase() : "ORI",
    modelLabel: model ? `MODEL: ${model.toUpperCase()}` : "MODEL: -",
    mode: cardModeValue(product.cardMode),
    packagePriceText: formatRupiah(product.priceItem + product.priceInstall),
    thumbUrl: resolveImageUrl(product.thumbPath, product.imagePath),
    imageStyle: {
      "--photo-pos-x": `${product.imagePosX}%`,
      "--photo-pos-y": `${product.imagePosY}%`,
      "--photo-pos-x-num": product.imagePosX,
      "--photo-pos-y-num": product.imagePosY,
      "--photo-scale": `${product.imageScale / 100}`
    } as React.CSSProperties
  };
}

export function createCatalogCardItems(products: ProductWithType[]): CatalogCardItem[] {
  return products.map((product) => createCatalogCardItem(product));
}
