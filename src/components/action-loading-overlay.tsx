"use client";

import { LoaderScene } from "@/components/loader-scene";

type ActionLoadingOverlayProps = {
  label: string;
};

export function ActionLoadingOverlay({ label }: ActionLoadingOverlayProps) {
  return (
    <div
      className="route-loading-overlay route-loading-overlay-admin action-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="action-loading-card">
        <LoaderScene compact />
        <div className="action-loading-copy">
          <strong>{label}</strong>
          <span>Mohon tunggu, proses sedang dijalankan.</span>
        </div>
      </div>
    </div>
  );
}
