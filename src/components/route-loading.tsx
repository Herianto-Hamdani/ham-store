type RouteLoadingProps = {
  variant?: "public" | "admin";
};

export function RouteLoading({ variant = "public" }: RouteLoadingProps) {
  return (
    <div
      className={`route-loading-overlay route-loading-overlay-${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Memuat halaman"
    >
      <div className="route-loading-center" aria-hidden="true">
        <span className="route-loading-spinner route-loading-spinner-outer" />
        <span className="route-loading-spinner route-loading-spinner-inner" />
        <span className="route-loading-pulse" />
      </div>
    </div>
  );
}
