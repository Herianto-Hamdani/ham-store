type TemplatePosterContentProps = {
  backgroundUrl: string | null;
  logoUrl: string | null;
  siteName: string;
  title: string;
  modelLabel: string;
  brandLabel: string;
  imageUrl?: string | null;
  imageAlt?: string;
  imageStyle?: React.CSSProperties;
  imageLoading?: "eager" | "lazy";
  imageDecoding?: "async" | "auto" | "sync";
  placeholder?: React.ReactNode;
  showBackgroundLayer?: boolean;
};

export function TemplatePosterContent({
  backgroundUrl,
  logoUrl,
  siteName,
  title,
  modelLabel,
  brandLabel,
  imageUrl,
  imageAlt = "",
  imageStyle,
  imageLoading = "lazy",
  imageDecoding = "async",
  placeholder = null,
  showBackgroundLayer = true
}: TemplatePosterContentProps) {
  return (
    <>
      {showBackgroundLayer && backgroundUrl ? (
        <div className="poster-bg-layer">
          <img
            src={backgroundUrl}
            alt=""
            className="poster-bg-image"
            width={1200}
            height={900}
            loading={imageLoading}
            decoding={imageDecoding}
          />
        </div>
      ) : null}
      <div className="poster-logo">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${siteName} logo`}
            className="poster-logo-image"
            width={320}
            height={160}
            loading={imageLoading}
            decoding={imageDecoding}
          />
        ) : (
          <span className="poster-logo-text">{siteName}</span>
        )}
      </div>
      <div className="poster-side poster-side-left">{modelLabel}</div>
      <div className="poster-side poster-side-right">{brandLabel}</div>
      <div className="poster-photo-wrap">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            className="poster-photo"
            width={1200}
            height={900}
            loading={imageLoading}
            decoding={imageDecoding}
            style={imageStyle}
          />
        ) : (
          placeholder
        )}
      </div>
      <div className="poster-title-box">{title}</div>
    </>
  );
}
