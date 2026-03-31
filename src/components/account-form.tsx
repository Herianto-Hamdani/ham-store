"use client";

import { useActionState, useState } from "react";

import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type AccountFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  title: string;
  description: string;
  submitLabel: string;
  pendingLabel: string;
  initialUsername?: string;
  optionalPassword?: boolean;
};

export function AccountForm({
  action,
  title,
  description,
  submitLabel,
  pendingLabel,
  initialUsername = "",
  optionalPassword = false
}: AccountFormProps) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [username, setUsername] = useState(initialUsername);

  return (
    <section className="auth-wrap" style={{ marginBottom: "1rem" }}>
      <div className="auth-card">
        <h2>{title}</h2>
        <p>{description}</p>
        {state.error ? <div className="alert alert-error">{state.error}</div> : null}
        <form action={formAction} className="form-grid">
          <label>
            Username
            <input
              type="text"
              name="username"
              required
              maxLength={40}
              autoComplete="off"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            Password {optionalPassword ? "Baru (Opsional)" : "Baru"}
            <input
              type="password"
              name="password"
              minLength={6}
              autoComplete="new-password"
              required={!optionalPassword}
            />
          </label>
          <label>
            Konfirmasi Password {optionalPassword ? "Baru" : ""}
            <input
              type="password"
              name="password_confirm"
              minLength={6}
              autoComplete="new-password"
              required={!optionalPassword}
            />
          </label>
          <div className="form-actions">
            <PendingSubmitButton
              idleLabel={submitLabel}
              pendingLabel={pendingLabel}
              className="btn btn-primary"
            />
          </div>
        </form>
      </div>
    </section>
  );
}


