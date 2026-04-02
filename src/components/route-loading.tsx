"use client";

import { useEffect, useState } from "react";

import { LoaderScene } from "@/components/loader-scene";

type RouteLoadingProps = {
  variant?: "public" | "admin";
};

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
      <LoaderScene />
    </div>
  );
}
