"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ActionLoadingOverlay } from "@/components/action-loading-overlay";

type LoadingLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  loadingLabel: string;
};

export function LoadingLink({
  href,
  className = "btn btn-ghost",
  children,
  loadingLabel
}: LoadingLinkProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <>
      <a
        href={href}
        className={`${className}${pending ? " is-pending" : ""}`}
        aria-busy={pending}
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

          event.preventDefault();
          setPending(true);
          router.push(href);
        }}
      >
        <span className="btn-spinner" aria-hidden="true" />
        <span>{children}</span>
      </a>

      {pending ? <ActionLoadingOverlay label={loadingLabel} /> : null}
    </>
  );
}
