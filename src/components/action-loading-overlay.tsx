"use client";

import { LoaderScene, type LoaderSceneIcon } from "@/components/loader-scene";

type ActionLoadingOverlayProps = {
  label: string;
};

function inferLoadingVisual(label: string): { mode: "wordmark" | "action"; icon: LoaderSceneIcon } {
  const normalized = label.toLowerCase();

  if (/(login|masuk|verifikasi)/i.test(normalized)) {
    return { mode: "wordmark", icon: "save" };
  }

  if (/(template|desain)/i.test(normalized)) {
    return { mode: "action", icon: "template" };
  }

  if (/(pengaturan|situs|setting)/i.test(normalized)) {
    return { mode: "action", icon: "settings" };
  }

  if (/(akun|admin)/i.test(normalized)) {
    return { mode: "action", icon: "account" };
  }

  if (/(type|kategori)/i.test(normalized)) {
    return { mode: "action", icon: "type" };
  }

  if (/(produk|katalog)/i.test(normalized)) {
    return { mode: "action", icon: "product" };
  }

  if (/(hapus|delete)/i.test(normalized)) {
    return { mode: "action", icon: "delete" };
  }

  if (/(keluar|logout|sesi)/i.test(normalized)) {
    return { mode: "action", icon: "logout" };
  }

  if (/(buka|membuka|halaman|editor|navigasi)/i.test(normalized)) {
    return { mode: "action", icon: "navigate" };
  }

  return { mode: "action", icon: "save" };
}

export function ActionLoadingOverlay({ label }: ActionLoadingOverlayProps) {
  const visual = inferLoadingVisual(label);

  if (visual.mode === "wordmark") {
    return (
      <div
        className="route-loading-overlay"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
        <LoaderScene />
      </div>
    );
  }

  return (
    <div
      className="route-loading-overlay route-loading-overlay-admin action-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="action-loading-card">
        <LoaderScene compact mode="action" icon={visual.icon} />
        <div className="action-loading-copy">
          <strong>{label}</strong>
          <span>Mohon tunggu, proses sedang dijalankan.</span>
        </div>
      </div>
    </div>
  );
}
