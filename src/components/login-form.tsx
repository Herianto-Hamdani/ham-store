"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";

import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type LoginFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  siteName: string;
  logoUrl: string;
  hasLogo: boolean;
};

export function LoginForm({
  action,
  siteName,
  logoUrl,
  hasLogo
}: LoginFormProps) {
  const [state, formAction] = useActionState(action, initialFormState);
  const brandMark = siteName.replace(/\s+/g, "").slice(0, 2).toUpperCase() || "HS";
  const displayName = siteName.toUpperCase();

  return (
      <section className="container main-content">
        <section className="login-shell">
        <div className="login-panel login-panel-admin">
          <aside className="login-brand-panel login-panel-brand" aria-label={`${siteName} brand`}>
            <div className="login-brand-head">
              {hasLogo ? (
                <span className="login-brand-logo-frame">
                  <Image
                    src={logoUrl}
                    alt={`${siteName} logo`}
                    className="login-brand-logo"
                    width={78}
                    height={78}
                    sizes="78px"
                  />
                </span>
              ) : (
                <span className="login-brand-mark">{brandMark}</span>
              )}
              <span className="login-brand-chip">Admin</span>
            </div>

            <div className="login-wordmark-stage" aria-hidden="true">
              <span className="login-wordmark-halo login-wordmark-halo-alpha" />
              <span className="login-wordmark-halo login-wordmark-halo-beta" />
              <span className="login-wordmark-grid" />
              <span className="login-wordmark-sweep" />
              <svg className="login-wordmark" viewBox="0 0 760 220" role="presentation">
                <text className="login-wordmark-shadow" x="50%" y="54%" textAnchor="middle">
                  {displayName}
                </text>
                <text className="login-wordmark-base" x="50%" y="54%" textAnchor="middle">
                  {displayName}
                </text>
                <text className="login-wordmark-energy" x="50%" y="54%" textAnchor="middle">
                  {displayName}
                </text>
              </svg>
            </div>

            <div className="login-brand-meta">
              <span className="login-brand-eyebrow">Secure Access</span>
              <p>Masuk ke panel.</p>
            </div>
          </aside>

          <div className="auth-card auth-card-login login-panel-form">
            <div className="login-card-head">
              <span className="login-card-kicker">HAM STORE</span>
              <h1>Login</h1>
              <p>Username dan password.</p>
            </div>

            {state.error ? <div className="alert alert-error">{state.error}</div> : null}

            <form action={formAction} className="form-grid login-form">
              <label className="login-field">
                <span>Username</span>
                <input
                  type="text"
                  name="username"
                  required
                  autoComplete="username"
                  placeholder="Username admin"
                />
              </label>
              <label className="login-field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="Password"
                />
              </label>
              <div className="form-actions auth-actions login-actions">
                <PendingSubmitButton
                  idleLabel="Masuk"
                  pendingLabel="Memverifikasi Login Admin..."
                  className="btn btn-primary"
                />
                <Link href="/" className="btn btn-ghost">
                  Katalog
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </section>
  );
}






