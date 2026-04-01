import type { Product, SiteSetting, Type } from "@prisma/client";

import { ProductCardView } from "@/components/product-card-view";
import { createCatalogCardItem, createCatalogTemplateConfig } from "@/lib/catalog-card";

type ProductWithType = Product & {
  type: Type;
};

type ProductCardProps = {
  product: ProductWithType;
  settings: SiteSetting;
};

export function ProductCard({ product, settings }: ProductCardProps) {
  const item = createCatalogCardItem(product);
  const template = createCatalogTemplateConfig(settings);

  return <ProductCardView item={item} template={template} />;
}
