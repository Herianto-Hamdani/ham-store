"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  idleLabel: string;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function PendingSubmitButton({
  idleLabel,
  pendingLabel = "Memproses...",
  className = "btn btn-primary",
  disabled = false
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`${className}${pending ? " is-pending" : ""}`}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      <span className="btn-spinner" aria-hidden="true" />
      <span>{pending ? pendingLabel : idleLabel}</span>
    </button>
  );
}
