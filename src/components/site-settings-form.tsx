"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";

function buildWhatsappPreviewUrl(number?: string | null, message?: string | null): string | null {
  const safeNumber = number ? number.replace(/\D+/g, "") : "";
  if (!safeNumber) {
    return null;
  }

  const url = new URL(`https://wa.me/${safeNumber}`);
  const safeMessage = (message ?? "").trim();
  if (safeMessage) {
    url.searchParams.set("text", safeMessage);
  }

  return url.toString();
}

type SiteSettingsValues = {
  webName: string;
  whatsappNumber: string;
  whatsappMessage: string;
  logoPreview: string;
  bannerPreview: string;
  waPreview: string | null;
};

type SiteSettingsFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: SiteSettingsValues;
};

export function SiteSettingsForm({ action, values }: SiteSettingsFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [formValues, setFormValues] = useState(values);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((item) => URL.revokeObjectURL(item));
    };
  }, []);

  function setPreview(field: "logoPreview" | "bannerPreview", file: File | null, fallback: string) {
    if (!file) {
      setFormValues((current) => ({ ...current, [field]: fallback }));
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrls.current.push(nextUrl);
    setFormValues((current) => ({ ...current, [field]: nextUrl }));
  }

  function updateWhatsappField(field: "whatsappNumber" | "whatsappMessage", value: string) {
    setFormValues((current) => {
      const next = {
        ...current,
        [field]: value
      };

      return {
        ...next,
        waPreview: buildWhatsappPreviewUrl(next.whatsappNumber, next.whatsappMessage)
      };
    });
  }

  return (
    <section className="form-wrap">
      <div className="auth-card">
        {state.error ? <div className="alert alert-error">{state.error}</div> : null}
        <form action={formAction} className="form-grid">
          <label>
            Nama Web
            <input
              type="text"
              name="web_name"
              required
              maxLength={160}
              value={formValues.webName}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, webName: event.target.value }))
              }
            />
          </label>

          <label>
            Nomor WhatsApp (format internasional)
            <input
              type="text"
              name="whatsapp_number"
              value={formValues.whatsappNumber}
              onChange={(event) => updateWhatsappField("whatsappNumber", event.target.value)}
            />
          </label>

          <label>
            Pesan Default WhatsApp
            <textarea
              name="whatsapp_message"
              rows={3}
              maxLength={255}
              value={formValues.whatsappMessage}
              onChange={(event) => updateWhatsappField("whatsappMessage", event.target.value)}
            />
          </label>

          <div className="field-row">
            <label>
              Logo Web (opsional)
              <input
                type="file"
                name="logo_web"
                accept=".jpg,.jpeg,.png"
                onChange={(event) =>
                  setPreview(
                    "logoPreview",
                    event.target.files?.[0] ?? null,
                    values.logoPreview
                  )
                }
              />
            </label>
            <label>
              Banner Halaman Publik (opsional)
              <input
                type="file"
                name="banner_web"
                accept=".jpg,.jpeg,.png"
                onChange={(event) =>
                  setPreview(
                    "bannerPreview",
                    event.target.files?.[0] ?? null,
                    values.bannerPreview
                  )
                }
              />
            </label>
          </div>

          <div className="settings-preview-grid">
            <div className="image-preview-block">
              <p>Preview Logo</p>
              <img src={formValues.logoPreview} alt="Preview logo web" className="preview-thumb preview-thumb-wide" />
            </div>
            <div className="image-preview-block">
              <p>Preview Banner</p>
              <img src={formValues.bannerPreview} alt="Preview banner web" className="preview-thumb preview-thumb-banner" />
            </div>
          </div>

          <div className="settings-wa-preview">
            <strong>Link WA Saat Ini:</strong>{" "}
            {formValues.waPreview ? (
              <a href={formValues.waPreview} target="_blank" rel="noreferrer">
                Tes Link WhatsApp
              </a>
            ) : (
              <span>belum diatur</span>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
            <a href="/admin/products" className="btn btn-ghost">
              Kembali
            </a>
          </div>
        </form>
      </div>
    </section>
  );
}


