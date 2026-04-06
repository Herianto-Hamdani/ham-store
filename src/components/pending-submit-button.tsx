"use client";

import { useFormStatus } from "react-dom";

import { ActionLoadingOverlay } from "@/components/action-loading-overlay";

type PendingSubmitButtonProps = {
  idleLabel: string;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  showOverlay?: boolean;
  overlayDelayMs?: number;
};

export function PendingSubmitButton({
  idleLabel,
  pendingLabel = "Memproses...",
  className = "btn btn-primary",
  disabled = false,
  showOverlay = true,
  overlayDelayMs = 40
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        className={`${className}${pending ? " is-pending" : ""}`}
        disabled={disabled || pending}
        aria-busy={pending}
      >
        <span className="btn-spinner" aria-hidden="true" />
        <span>{pending ? pendingLabel : idleLabel}</span>
      </button>

      {pending && showOverlay ? (
        <ActionLoadingOverlay label={pendingLabel} delayMs={overlayDelayMs} />
      ) : null}
    </>
  );
}
