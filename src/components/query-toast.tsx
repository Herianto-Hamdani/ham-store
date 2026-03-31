"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ToastState = {
  type: "success" | "error";
  message: string;
};

export function QueryToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<ToastState | null>(null);

  const searchKey = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (!success && !error) {
      return;
    }

    setToast({
      type: success ? "success" : "error",
      message: success ?? error ?? ""
    });

    const next = new URLSearchParams(searchParams.toString());
    next.delete("success");
    next.delete("error");

    const nextUrl = next.toString() ? `${pathname}?${next.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, searchKey]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={`query-toast query-toast-${toast.type}`}
      role="status"
      aria-live="polite"
    >
      <div className="query-toast-copy">
        <strong>{toast.type === "success" ? "Berhasil" : "Perhatian"}</strong>
        <span>{toast.message}</span>
      </div>
      <button
        type="button"
        className="query-toast-close"
        aria-label="Tutup notifikasi"
        onClick={() => setToast(null)}
      >
        ×
      </button>
    </div>
  );
}
