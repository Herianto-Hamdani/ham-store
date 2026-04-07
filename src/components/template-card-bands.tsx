import type { HTMLAttributes, ReactNode, Ref } from "react";

type TemplateCardBandsProps = {
  typeName: string;
  detailText?: string | null;
  packagePriceText: string;
  priceLabel?: string;
  detailPlaceholder?: string;
  alwaysShowDetail?: boolean;
  className?: string;
  containerRef?: Ref<HTMLDivElement>;
  children?: ReactNode;
  onPointerMove?: HTMLAttributes<HTMLDivElement>["onPointerMove"];
  onPointerUp?: HTMLAttributes<HTMLDivElement>["onPointerUp"];
  onPointerCancel?: HTMLAttributes<HTMLDivElement>["onPointerCancel"];
};

export function TemplateCardBands({
  typeName,
  detailText,
  packagePriceText,
  priceLabel = "Harga paket",
  detailPlaceholder = "",
  alwaysShowDetail = false,
  className,
  containerRef,
  children,
  onPointerMove,
  onPointerUp,
  onPointerCancel
}: TemplateCardBandsProps) {
  const safeTypeName = typeName.trim() || "Type";
  const safeDetailText = detailText?.trim() ?? "";
  const showDetail = alwaysShowDetail || safeDetailText.length > 0;
  const detailContent = safeDetailText || detailPlaceholder;

  return (
    <div
      ref={containerRef}
      className={`template-card-band-stack${showDetail ? "" : " template-card-band-stack-no-detail"}${
        className ? ` ${className}` : ""
      }`}
      data-has-detail={showDetail ? "true" : "false"}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="template-card-band template-card-band-type">
        <div className="chip">{safeTypeName}</div>
      </div>

      {showDetail ? (
        <div className="template-card-band template-card-band-detail">
          <p>{detailContent}</p>
        </div>
      ) : null}

      <div className="template-card-band template-card-band-price">
        <div className="price-table-wrap">
          <div className="price-inline-card" aria-label={priceLabel}>
            <span className="price-inline-card-label">
              <span>Harga</span>
              <span>Paket</span>
            </span>
            <strong className="price-inline-card-value">{packagePriceText}</strong>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
