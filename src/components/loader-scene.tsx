type LoaderSceneProps = {
  compact?: boolean;
};

export function LoaderScene({ compact = false }: LoaderSceneProps) {
  return (
    <div
      className={`route-loading-scene ${compact ? "route-loading-scene-compact" : "route-loading-scene-main"}`}
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
    </div>
  );
}
