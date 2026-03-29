"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function TrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) {
      return;
    }

    const storageKey = `wk-track:${pathname}`;
    const now = Date.now();
    const lastTrackedAt = Number.parseInt(sessionStorage.getItem(storageKey) ?? "", 10);
    if (Number.isFinite(lastTrackedAt) && now - lastTrackedAt < 30 * 60 * 1000) {
      return;
    }

    const payload = JSON.stringify({ pathname });

    const send = () => {
      sessionStorage.setItem(storageKey, String(now));

      if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon(
          "/api/track",
          new Blob([payload], { type: "application/json" })
        );

        if (sent) {
          return;
        }
      }

      void fetch("/api/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: payload,
        keepalive: true
      });
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(send, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(send, 0);
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
}
