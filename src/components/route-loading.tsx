"use client";

import { useEffect, useState } from "react";

import { LoaderScene } from "@/components/loader-scene";

type RouteLoadingProps = {
  variant?: "public" | "admin";
};

function AdminRouteLoadingSkeleton() {
  return (
    <div className="route-loading-admin-shell" aria-hidden="true">
      <section className="route-loading-admin-surface route-loading-admin-top">
        <div className="route-loading-admin-copy">
          <span className="route-loading-skeleton-block route-loading-admin-chip" />
          <span className="route-loading-skeleton-block route-loading-admin-title" />
          <span className="route-loading-skeleton-block route-loading-admin-subtitle" />
        </div>
        <span className="route-loading-skeleton-block route-loading-admin-meta" />
      </section>

      <section className="route-loading-admin-metrics">
        {Array.from({ length: 4 }, (_, index) => (
          <article className="route-loading-admin-surface route-loading-admin-metric" key={index}>
            <span className="route-loading-skeleton-block route-loading-admin-metric-label" />
            <span className="route-loading-skeleton-block route-loading-admin-metric-value" />
            <span className="route-loading-skeleton-block route-loading-admin-metric-note" />
          </article>
        ))}
      </section>

      <section className="route-loading-admin-content">
        <article className="route-loading-admin-surface route-loading-admin-panel">
          <div className="route-loading-admin-panel-head">
            <span className="route-loading-skeleton-block route-loading-admin-panel-title" />
            <span className="route-loading-skeleton-block route-loading-admin-panel-action" />
          </div>
          <div className="route-loading-admin-table">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="route-loading-admin-row" key={index}>
                <span className="route-loading-skeleton-block route-loading-admin-row-thumb" />
                <div className="route-loading-admin-row-copy">
                  <span className="route-loading-skeleton-block route-loading-admin-row-line route-loading-admin-row-line-primary" />
                  <span className="route-loading-skeleton-block route-loading-admin-row-line route-loading-admin-row-line-secondary" />
                </div>
                <span className="route-loading-skeleton-block route-loading-admin-row-pill" />
              </div>
            ))}
          </div>
        </article>

        <aside className="route-loading-admin-surface route-loading-admin-side">
          <span className="route-loading-skeleton-block route-loading-admin-side-title" />
          <div className="route-loading-admin-side-stack">
            {Array.from({ length: 4 }, (_, index) => (
              <span
                className="route-loading-skeleton-block route-loading-admin-side-line"
                key={index}
              />
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

export function RouteLoading({ variant = "public" }: RouteLoadingProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setVisible(true);
    }, 180);

    return () => {
      window.clearTimeout(handle);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`route-loading-overlay route-loading-overlay-${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Memuat halaman"
    >
      {variant === "admin" ? <AdminRouteLoadingSkeleton /> : <LoaderScene />}
    </div>
  );
}
