"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type TemplateValues = {
  siteName: string;
  backgroundUrl: string | null;
  logoUrl: string | null;
  templateBgPosX: number;
  templateBgPosY: number;
  templateBgScale: number;
  templateLogoTop: number;
  templateLogoRight: number;
  templateLogoWidth: number;
  templateTitleLeft: number;
  templateTitleWidth: number;
  templateTitleBottom: number;
  templateTitleFont: number;
  templateSideTop: number;
  templateSideLeft: number;
  templateSideRight: number;
  templateSideFont: number;
  templatePhotoTop: number;
  templatePhotoLeft: number;
  templatePhotoWidth: number;
  templatePhotoHeight: number;
};

type TemplateSettingsFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: TemplateValues;
  maxUploadMb: number;
};

export function TemplateSettingsForm({ action, values, maxUploadMb }: TemplateSettingsFormProps) {
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

  function updateNumber(key: keyof TemplateValues, nextValue: number) {
    setFormValues((current) => ({ ...current, [key]: nextValue }));
  }

  function setPreview(field: "backgroundUrl" | "logoUrl", file: File | null) {
    if (!file) {
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrls.current.push(nextUrl);
    setFormValues((current) => ({ ...current, [field]: nextUrl }));
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

  const previewStyle = {
    "--tpl-bg-pos-x": `${formValues.templateBgPosX}%`,
    "--tpl-bg-pos-y": `${formValues.templateBgPosY}%`,
    "--tpl-bg-scale": `${formValues.templateBgScale / 100}`,
    "--tpl-logo-top": `${formValues.templateLogoTop}%`,
    "--tpl-logo-right": `${formValues.templateLogoRight}%`,
    "--tpl-logo-width": `${formValues.templateLogoWidth}%`,
    "--tpl-title-left": `${formValues.templateTitleLeft}%`,
    "--tpl-title-width": `${formValues.templateTitleWidth}%`,
    "--tpl-title-bottom": `${formValues.templateTitleBottom}%`,
    "--tpl-title-font": formValues.templateTitleFont,
    "--tpl-side-top": `${formValues.templateSideTop}%`,
    "--tpl-side-left": `${formValues.templateSideLeft}%`,
    "--tpl-side-right": `${formValues.templateSideRight}%`,
    "--tpl-side-font": formValues.templateSideFont,
    "--tpl-photo-top": `${formValues.templatePhotoTop}%`,
    "--tpl-photo-left": `${formValues.templatePhotoLeft}%`,
    "--tpl-photo-width": `${formValues.templatePhotoWidth}%`,
    "--tpl-photo-height": `${formValues.templatePhotoHeight}%`
  } as React.CSSProperties;

  const fields: Array<{
    key: keyof TemplateValues;
    label: string;
    min: number;
    max: number;
  }> = [
    { key: "templateBgPosX", label: "BG Posisi X", min: 0, max: 100 },
    { key: "templateBgPosY", label: "BG Posisi Y", min: 0, max: 100 },
    { key: "templateBgScale", label: "BG Skala", min: 10, max: 300 },
    { key: "templateLogoTop", label: "Logo Top", min: 0, max: 60 },
    { key: "templateLogoRight", label: "Logo Right", min: 0, max: 60 },
    { key: "templateLogoWidth", label: "Lebar Logo", min: 8, max: 80 },
    { key: "templateTitleLeft", label: "Kotak Nama Left", min: 0, max: 60 },
    { key: "templateTitleWidth", label: "Kotak Nama Width", min: 30, max: 100 },
    { key: "templateTitleBottom", label: "Kotak Nama Bottom", min: 0, max: 40 },
    { key: "templateTitleFont", label: "Font Nama", min: 10, max: 42 },
    { key: "templateSideTop", label: "Side Top", min: 0, max: 80 },
    { key: "templateSideLeft", label: "Model Left", min: 0, max: 20 },
    { key: "templateSideRight", label: "Merek Right", min: 0, max: 20 },
    { key: "templateSideFont", label: "Font Teks Samping", min: 8, max: 36 },
    { key: "templatePhotoTop", label: "Foto Top", min: 0, max: 80 },
    { key: "templatePhotoLeft", label: "Foto Left", min: 0, max: 60 },
    { key: "templatePhotoWidth", label: "Lebar Foto", min: 20, max: 100 },
    { key: "templatePhotoHeight", label: "Tinggi Foto", min: 20, max: 90 }
  ];

  return (
    <section className="admin-modal-grid">
      <form action={formAction} className="form-grid admin-modal-form">
        {visibleError ? <div className="alert alert-error">{visibleError}</div> : null}

        <div className="field-row">
          <label>
            Background Template (opsional)
            <input
              type="file"
              name="template_bg"
              accept=".jpg,.jpeg,.png"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                const error = validateImageFile(nextFile);
                if (error) {
                  setClientError(error);
                  event.currentTarget.value = "";
                  return;
                }

                setClientError(null);
                setPreview("backgroundUrl", nextFile);
              }}
            />
            <small>Maksimal {maxUploadMb}MB. Format JPG/JPEG/PNG.</small>
          </label>
          <label>
            Logo Template (opsional)
            <input
              type="file"
              name="template_logo"
              accept=".jpg,.jpeg,.png"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                const error = validateImageFile(nextFile);
                if (error) {
                  setClientError(error);
                  event.currentTarget.value = "";
                  return;
                }

                setClientError(null);
                setPreview("logoUrl", nextFile);
              }}
            />
            <small>Maksimal {maxUploadMb}MB. Format JPG/JPEG/PNG.</small>
          </label>
        </div>

        {fields.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="number"
              name={field.key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)}
              min={field.min}
              max={field.max}
              value={formValues[field.key] as number}
              onChange={(event) =>
                updateNumber(
                  field.key,
                  Math.max(
                    field.min,
                    Math.min(field.max, Number.parseInt(event.target.value, 10) || field.min)
                  )
                )
              }
            />
          </label>
        ))}

        <div className="form-actions">
          <PendingSubmitButton
            idleLabel="Simpan Template"
            pendingLabel="Menyimpan Template..."
            className="btn btn-primary"
          />
          <a href="/admin/products" className="btn btn-ghost">
            Kembali
          </a>
        </div>
      </form>

      <aside className="designer-preview-panel">
        <h3>Preview Template</h3>
        <div className="product-card product-card-template designer-preview-card">
          <div className="poster-frame product-card-media" style={previewStyle}>
            {formValues.backgroundUrl ? (
              <div className="poster-bg-layer">
                <img src={formValues.backgroundUrl} alt="" className="poster-bg-image" />
              </div>
            ) : null}
            <div className="poster-logo">
              {formValues.logoUrl ? (
                <img src={formValues.logoUrl} alt={`${formValues.siteName} logo`} className="poster-logo-image" />
              ) : (
                <span className="poster-logo-text">{formValues.siteName}</span>
              )}
            </div>
            <div className="poster-side poster-side-left">MODEL: BN52</div>
            <div className="poster-side poster-side-right">ORI BRD</div>
            <div className="poster-photo-wrap">
              <img
                src="/assets/img/placeholder.svg"
                alt="Preview photo"
                className="poster-photo"
                style={
                  {
                    "--photo-pos-x": "50%",
                    "--photo-pos-y": "50%",
                    "--photo-pos-x-num": 50,
                    "--photo-pos-y-num": 50,
                    "--photo-scale": 1
                  } as React.CSSProperties
                }
              />
            </div>
            <div className="poster-title-box">BATERAI REDMI 9</div>
          </div>
          <div className="card-body">
            <div className="chip">Type</div>
            <p>Preview ini hanya untuk desain template card.</p>
            <div className="price-table-wrap">
              <table className="price-table">
                <tbody>
                  <tr>
                    <th>Harga Paket</th>
                    <td>Rp 250.000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}


