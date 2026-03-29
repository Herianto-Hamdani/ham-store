"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";

type LoginFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  error?: string | null;
  success?: string | null;
  siteName: string;
  logoUrl: string;
  hasLogo: boolean;
};

export function LoginForm({
  action,
  error,
  success,
  siteName,
  logoUrl,
  hasLogo
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const brandMark = siteName.replace(/\s+/g, "").slice(0, 2).toUpperCase() || "HS";

  return (
    <section className="container main-content">
      <section className="login-shell">
        <div className="login-panel">
          <aside className="login-brand-panel">
            <span className="login-brand-eyebrow">{siteName.toUpperCase()} CONTROL CENTER</span>
            <h1>Admin portal yang lebih rapi untuk operasional katalog.</h1>
            <p>
              Masuk ke panel admin untuk mengatur produk, type, branding situs, template card,
              dan akses tim dari satu tempat.
            </p>
            <ul className="login-feature-list" aria-label="Fitur utama panel admin">
              <li>Dashboard katalog dan traffic dalam satu workspace</li>
              <li>Preview desain produk sebelum dipublikasikan</li>
              <li>Keamanan login dengan proteksi rate-limit database</li>
            </ul>
            <div className="login-trust-grid">
              <div className="login-trust-card">
                <strong>Modern admin</strong>
                <span>Tampilan baru untuk kerja harian yang lebih cepat.</span>
              </div>
              <div className="login-trust-card">
                <strong>Production ready</strong>
                <span>Siap untuk alur deploy Vercel dan PostgreSQL.</span>
              </div>
            </div>
            <div className="login-brand-identity">
              {hasLogo ? (
                <img
                  src={logoUrl}
                  alt={`${siteName} logo`}
                  className="login-brand-logo"
                  width={72}
                  height={72}
                />
              ) : (
                <span className="login-brand-mark">{brandMark}</span>
              )}
              <div>
                <strong>{siteName}</strong>
                <small>Admin Access</small>
              </div>
            </div>
          </aside>

          <div className="auth-card auth-card-login">
            <h2>Login Admin</h2>
            <p>Masuk untuk mengelola katalog sparepart dan operasional situs.</p>

            {error ? <div className="alert alert-error">{error}</div> : null}
            {success ? <div className="alert alert-success">{success}</div> : null}
            {state.error ? <div className="alert alert-error">{state.error}</div> : null}

            <form action={formAction} className="form-grid login-form">
              <label>
                Username
                <input
                  type="text"
                  name="username"
                  required
                  autoComplete="username"
                  placeholder="Masukkan username admin"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                />
              </label>
              <div className="form-actions auth-actions login-actions">
                <button type="submit" className="btn btn-primary" disabled={pending}>
                  {pending ? "Memproses..." : "Masuk Panel"}
                </button>
                <Link href="/" className="btn btn-ghost">
                  Kembali ke Katalog
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </section>
  );
}






