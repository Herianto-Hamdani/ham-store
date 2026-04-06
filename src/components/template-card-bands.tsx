type TemplateCardBandsProps = {
  typeName: string;
  detailText: string;
  packagePriceText: string;
  priceLabel?: string;
};

export function TemplateCardBands({
  typeName,
  detailText,
  packagePriceText,
  priceLabel = "Harga paket"
}: TemplateCardBandsProps) {
  return (
    <>
      <div className="template-card-band template-card-band-type">
        <div className="chip">{typeName}</div>
      </div>
      <div className="template-card-band template-card-band-detail">
        <p>{detailText}</p>
      </div>
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
    </>
  );
}
