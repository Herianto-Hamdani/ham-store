import { LoaderScene } from "@/components/loader-scene";

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
      <LoaderScene />
    </div>
  );
}
