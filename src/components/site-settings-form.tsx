"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";
import { PendingSubmitButton } from "@/components/pending-submit-button";

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
  waPreview: string | null;
};

type SiteSettingsFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: SiteSettingsValues;
  maxUploadMb: number;
};

export function SiteSettingsForm({ action, values, maxUploadMb }: SiteSettingsFormProps) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [clientError, setClientError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(values);
  const objectUrls = useRef<string[]>([]);
  const maxUploadBytes = maxUploadMb * 1024 * 1024;
  const visibleError = clientError ?? state.error;

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((item) => URL.revokeObjectURL(item));
    };
  }, []);

  useEffect(() => {
    objectUrls.current.forEach((item) => URL.revokeObjectURL(item));
    objectUrls.current = [];
    setFormValues(values);
    setClientError(null);
  }, [values]);

  function setPreview(file: File | null, fallback: string) {
    if (!file) {
      setFormValues((current) => ({ ...current, logoPreview: fallback }));
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrls.current.push(nextUrl);
    setFormValues((current) => ({ ...current, logoPreview: nextUrl }));
  }

  function validateImageFile(file: File | null) {
    if (!file) {
      return null;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      return "Format gambar harus JPG/JPEG/PNG.";
    }

    if (file.size <= 0 || file.size > maxUploadBytes) {
      return `Ukuran gambar harus <= ${maxUploadMb}MB.`;
    }

    return null;
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
        {visibleError ? <div className="alert alert-error">{visibleError}</div> : null}
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
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  const error = validateImageFile(nextFile);
                  if (error) {
                    setClientError(error);
                    event.currentTarget.value = "";
                    setPreview(null, values.logoPreview);
                    return;
                  }

                  setClientError(null);
                  setPreview(nextFile, values.logoPreview);
                }}
              />
              <small>Maksimal {maxUploadMb}MB. Format JPG/JPEG/PNG.</small>
            </label>
          </div>

          <div className="image-preview-block">
            <p>Preview Logo</p>
            <img src={formValues.logoPreview} alt="Preview logo web" className="preview-thumb preview-thumb-wide" />
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
            <PendingSubmitButton
              idleLabel="Simpan Pengaturan"
              pendingLabel="Memperbarui Pengaturan Situs..."
              className="btn btn-primary"
            />
            <a href="/admin/products" className="btn btn-ghost">
              Kembali
            </a>
          </div>
        </form>
      </div>
    </section>
  );
}


