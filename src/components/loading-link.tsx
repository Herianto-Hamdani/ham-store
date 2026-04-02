"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ActionLoadingOverlay } from "@/components/action-loading-overlay";

type LoadingLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  loadingLabel: string;
  showInlineSpinner?: boolean;
  showOverlay?: boolean;
  overlayMode?: "auto" | "wordmark" | "action";
};

export function LoadingLink({
  href,
  className = "btn btn-ghost",
  children,
  loadingLabel,
  showInlineSpinner = true,
  showOverlay = true,
  overlayMode = "auto"
}: LoadingLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const currentLocation = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    setPending(false);
  }, [currentLocation]);

  const prefetchRoute = useCallback(() => {
    router.prefetch(href);
  }, [href, router]);

  return (
    <>
      <a
        href={href}
        className={`${className}${pending ? " is-pending" : ""}`}
        aria-busy={pending}
        onMouseEnter={prefetchRoute}
        onTouchStart={prefetchRoute}
        onFocus={prefetchRoute}
        onClick={(event) => {
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }

          if (href === currentLocation || (href === pathname && !searchParams.toString())) {
            return;
          }

          event.preventDefault();
          setPending(true);
          router.push(href);
        }}
      >
        {showInlineSpinner ? <span className="btn-spinner" aria-hidden="true" /> : null}
        <span>{children}</span>
      </a>

      {pending && showOverlay ? (
        <ActionLoadingOverlay label={loadingLabel} modeOverride={overlayMode} />
      ) : null}
    </>
  );
}
