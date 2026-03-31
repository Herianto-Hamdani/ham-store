export type LoaderSceneIcon =
  | "product"
  | "account"
  | "type"
  | "settings"
  | "template"
  | "delete"
  | "logout"
  | "navigate"
  | "save";

type LoaderSceneProps = {
  compact?: boolean;
  mode?: "wordmark" | "action";
  icon?: LoaderSceneIcon;
};

function ActionGlyph({ icon }: { icon: LoaderSceneIcon }) {
  switch (icon) {
    case "product":
      return (
        <svg viewBox="0 0 64 64" className="route-loading-action-glyph" role="presentation">
          <path d="M19 22.5h26v22H19z" />
          <path d="M24 18h16v6H24z" />
          <path d="M24 30h16" />
          <path d="M24 36h11" />
        </svg>
      );
    case "account":
      return (
        <svg viewBox="0 0 64 64" className="route-loading-action-glyph" role="presentation">
          <circle cx="32" cy="24" r="9" />
          <path d="M17 47c3.4-7 9.2-11 15-11s11.6 4 15 11" />
          <path d="M49 17v8" />
          <path d="M45 21h8" />
        </svg>
      );
    case "type":
      return (
        <svg viewBox="0 0 64 64" className="route-loading-action-glyph" role="presentation">
          <path d="M18 19h18l10 10-16 16-12-12z" />
          <circle cx="29" cy="26" r="2.5" />
          <path d="M39 29l7-7" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 64 64" className="route-loading-action-glyph" role="presentation">
          <path d="M18 21h28" />
          <path d="M18 32h28" />
          <path d="M18 43h28" />
          <circle cx="26" cy="21" r="4" />
          <circle cx="39" cy="32" r="4" />
          <circle cx="30" cy="43" r="4" />
        </svg>
      );
    case "template":
      return (
        <svg viewBox="0 0 64 64" className="route-loading-action-glyph" role="presentation">
          <rect x="18" y="16" width="28" height="34" rx="5" />
          <path d="M24 24h16" />
          <path d="M24 31h16" />
          <path d="M24 38h10" />
          <path d="M41 20l6 6" />
        </svg>
      );
    case "delete":
      return (
        <svg viewBox="0 0 64 64" className="route-loading-action-glyph" role="presentation">
          <path d="M22 22h20l-2 24H24z" />
          <path d="M18 20h28" />
          <path d="M27 20v-4h10v4" />
          <path d="M28 28v11" />
          <path d="M36 28v11" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 64 64" className="route-loading-action-glyph" role="presentation">
          <path d="M27 20H20v24h7" />
          <path d="M34 24l10 8-10 8" />
          <path d="M24 32h20" />
        </svg>
      );
    case "navigate":
      return (
        <svg viewBox="0 0 64 64" className="route-loading-action-glyph" role="presentation">
          <path d="M19 46l8-28 20 20-28 8z" />
          <path d="M30 29l5 5" />
        </svg>
      );
    case "save":
    default:
      return (
        <svg viewBox="0 0 64 64" className="route-loading-action-glyph" role="presentation">
          <path d="M20 18h20l6 6v22H20z" />
          <path d="M26 18v12h12V18" />
          <path d="M26 40h12" />
        </svg>
      );
  }
}

export function LoaderScene({
  compact = false,
  mode = "wordmark",
  icon = "save"
}: LoaderSceneProps) {
  return (
    <div
      className={`route-loading-scene ${compact ? "route-loading-scene-compact" : "route-loading-scene-main"} route-loading-scene-${mode}`}
      aria-hidden="true"
    >
      <span className="route-loading-backdrop-glow route-loading-backdrop-glow-alpha" />
      <span className="route-loading-backdrop-glow route-loading-backdrop-glow-beta" />

      <span className="route-loading-orbit route-loading-orbit-alpha">
        <span className="route-loading-orbit-particle route-loading-orbit-particle-alpha" />
      </span>
      <span className="route-loading-orbit route-loading-orbit-beta">
        <span className="route-loading-orbit-particle route-loading-orbit-particle-beta" />
      </span>
      <span className="route-loading-orbit route-loading-orbit-gamma">
        <span className="route-loading-orbit-particle route-loading-orbit-particle-gamma" />
      </span>

      <span className="route-loading-energy-wave route-loading-energy-wave-outer" />
      <span className="route-loading-energy-wave route-loading-energy-wave-inner" />
      <span className="route-loading-wordmark-sweep" />

      {mode === "wordmark" ? (
        <svg className="route-loading-wordmark" viewBox="0 0 760 260" role="presentation">
          <text className="route-loading-wordmark-shadow" x="50%" y="56%" textAnchor="middle">
            HAM STORE
          </text>
          <text className="route-loading-wordmark-base" x="50%" y="56%" textAnchor="middle">
            HAM STORE
          </text>
          <text className="route-loading-wordmark-energy" x="50%" y="56%" textAnchor="middle">
            HAM STORE
          </text>
        </svg>
      ) : (
        <div className="route-loading-action-core">
          <span className="route-loading-action-core-glow" />
          <span className="route-loading-action-core-frame" />
          <span className="route-loading-action-core-scan" />
          <ActionGlyph icon={icon} />
        </div>
      )}
    </div>
  );
}
