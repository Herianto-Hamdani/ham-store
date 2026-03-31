export function LoaderScene() {
  return (
    <div className="route-loading-scene" aria-hidden="true">
      <span className="route-loading-reactor-glow" />
      <span className="route-loading-reactor-ring route-loading-reactor-ring-alpha">
        <span className="route-loading-particle route-loading-particle-alpha" />
        <span className="route-loading-particle route-loading-particle-beta" />
      </span>
      <span className="route-loading-reactor-ring route-loading-reactor-ring-beta">
        <span className="route-loading-particle route-loading-particle-gamma" />
      </span>
      <span className="route-loading-reactor-ring route-loading-reactor-ring-gamma">
        <span className="route-loading-particle route-loading-particle-delta" />
      </span>

      <span className="route-loading-energy-pulse route-loading-energy-pulse-outer" />
      <span className="route-loading-energy-pulse route-loading-energy-pulse-inner" />

      <div className="route-loading-core">
        <span className="route-loading-core-halo" />
        <span className="route-loading-smartphone">
          <span className="route-loading-smartphone-frame" />
          <span className="route-loading-smartphone-screen" />
          <span className="route-loading-smartphone-notch" />
          <span className="route-loading-smartphone-chip" />
          <span className="route-loading-smartphone-scan" />
          <span className="route-loading-repair-arm route-loading-repair-arm-main" />
          <span className="route-loading-repair-arm route-loading-repair-arm-accent" />
          <span className="route-loading-repair-dot" />
        </span>
      </div>
    </div>
  );
}
