"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import type { Type } from "@prisma/client";

import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";

type ProductFormValues = {
  name: string;
  brand: string;
  model: string;
  detail: string;
  typeId: number;
  cardMode: "image" | "template";
  priceItem: number;
  priceInstall: number;
  imagePosX: number;
  imagePosY: number;
  imageScale: number;
  imageUrl: string;
};

type TemplatePreview = {
  siteName: string;
  style: React.CSSProperties;
  backgroundUrl: string | null;
  logoUrl: string | null;
};

type ProductFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  types: Type[];
  values: ProductFormValues;
  template: TemplatePreview;
  maxUploadMb: number;
};

export function ProductForm({
  action,
  submitLabel,
  types,
  values,
  template,
  maxUploadMb
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [clientError, setClientError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(values);
  const [imageUrl, setImageUrl] = useState(values.imageUrl);
  const [priceItemInput, setPriceItemInput] = useState(
    values.priceItem > 0 ? String(values.priceItem) : ""
  );
  const [priceInstallInput, setPriceInstallInput] = useState(
    values.priceInstall > 0 ? String(values.priceInstall) : ""
  );
  const objectUrlRef = useRef<string | null>(null);
  const dragTargetRef = useRef<"template" | "image" | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: values.imagePosX, posY: values.imagePosY });

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const typeName =
    types.find((item) => item.id === formValues.typeId)?.name?.trim() || "Type";
  const totalPrice = formValues.priceItem + formValues.priceInstall;
  const previewTitle = (formValues.name.trim() || "NAMA BARANG").toUpperCase();
  const previewBrand = formValues.brand.trim() ? formValues.brand.trim().toUpperCase() : "ORI";
  const previewModel = formValues.model.trim()
    ? `MODEL: ${formValues.model.trim().toUpperCase()}`
    : "MODEL: -";
  const previewDetail = formValues.detail.trim() || "Detail produk akan tampil di sini.";
  const maxUploadBytes = maxUploadMb * 1024 * 1024;
  const visibleError = clientError ?? state.error;

  const previewImageStyle = useMemo(
    () =>
      ({
        "--photo-pos-x": `${formValues.imagePosX}%`,
        "--photo-pos-y": `${formValues.imagePosY}%`,
        "--photo-pos-x-num": formValues.imagePosX,
        "--photo-pos-y-num": formValues.imagePosY,
        "--photo-scale": `${formValues.imageScale / 100}`
      }) as React.CSSProperties,
    [formValues.imagePosX, formValues.imagePosY, formValues.imageScale]
  );

  function updateField<K extends keyof ProductFormValues>(key: K, nextValue: ProductFormValues[K]) {
    setFormValues((current) => ({
      ...current,
      [key]: nextValue
    }));
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

  function handleFileChange(file: File | null) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!file) {
      setImageUrl(values.imageUrl);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setImageUrl(nextUrl);
  }

  function handlePriceChange(
    field: "priceItem" | "priceInstall",
    setInput: React.Dispatch<React.SetStateAction<string>>,
    value: string
  ) {
    const sanitized = value.replace(/\D+/g, "");
    setInput(sanitized);
    updateField(field, sanitized ? Number.parseInt(sanitized, 10) : 0);
  }

  function normalizePriceInput(
    field: "priceItem" | "priceInstall",
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) {
    setInput((current) => {
      const normalized = current.replace(/^0+(?=\d)/, "");
      updateField(field, normalized ? Number.parseInt(normalized, 10) : 0);
      return normalized;
    });
  }

  function startDrag(target: "template" | "image", event: React.PointerEvent<HTMLDivElement>) {
    dragTargetRef.current = target;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      posX: formValues.imagePosX,
      posY: formValues.imagePosY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragTargetRef.current) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((event.clientY - dragStartRef.current.y) / rect.height) * 100;
    updateField("imagePosX", Math.max(0, Math.min(100, Math.round(dragStartRef.current.posX + deltaX))));
    updateField("imagePosY", Math.max(0, Math.min(100, Math.round(dragStartRef.current.posY + deltaY))));
  }

  function stopDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragTargetRef.current) {
      return;
    }

    dragTargetRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section className="admin-modal-grid">
      <form action={formAction} className="form-grid admin-modal-form">
        {visibleError ? <div className="alert alert-error">{visibleError}</div> : null}

        <section className="form-section">
          <div className="form-section-head">
            <h2>Data Produk</h2>
          </div>

          <label>
            Nama Barang (Internal)
            <input
              type="text"
              name="nama_barang"
              required
              maxLength={160}
              value={formValues.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </label>

          <div className="field-row">
            <label>
              Merek
              <input
                type="text"
                name="brand"
                maxLength={80}
                value={formValues.brand}
                onChange={(event) => updateField("brand", event.target.value)}
              />
            </label>
            <label>
              Model
              <input
                type="text"
                name="model"
                maxLength={80}
                value={formValues.model}
                onChange={(event) => updateField("model", event.target.value)}
              />
            </label>
          </div>

          <div className="field-row">
            <label>
              Type
              <select
                name="type_id"
                required
                value={String(formValues.typeId || "")}
                onChange={(event) => updateField("typeId", Number.parseInt(event.target.value, 10) || 0)}
              >
                <option value="">Pilih Type</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Mode Kartu Publik
              <select
                name="card_mode"
                value={formValues.cardMode}
                onChange={(event) =>
                  updateField("cardMode", event.target.value === "template" ? "template" : "image")
                }
              >
                <option value="image">Gambar Langsung</option>
                <option value="template">Template Otomatis</option>
              </select>
            </label>
          </div>

          <label>
            Detail Produk
            <textarea
              name="detail_produk"
              rows={5}
              value={formValues.detail}
              onChange={(event) => updateField("detail", event.target.value)}
            />
          </label>
        </section>

        <section className="form-section">
          <div className="form-section-head">
            <h2>Harga</h2>
          </div>

          <div className="field-row">
            <label>
              Price Barang (Rp)
              <input
                type="text"
                name="price_barang"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Masukkan harga barang"
                value={priceItemInput}
                onChange={(event) =>
                  handlePriceChange("priceItem", setPriceItemInput, event.target.value)
                }
                onBlur={() => normalizePriceInput("priceItem", setPriceItemInput)}
              />
            </label>
            <label>
              Price Pasang (Rp)
              <input
                type="text"
                name="price_pasang"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Masukkan harga pasang"
                value={priceInstallInput}
                onChange={(event) =>
                  handlePriceChange("priceInstall", setPriceInstallInput, event.target.value)
                }
                onBlur={() => normalizePriceInput("priceInstall", setPriceInstallInput)}
              />
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-head">
            <h2>Gambar</h2>
          </div>

          <label>
            Gambar Produk
            <input
              type="file"
              name="gambar"
              accept=".jpg,.jpeg,.png"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                const error = validateImageFile(nextFile);
                if (error) {
                  setClientError(error);
                  event.currentTarget.value = "";
                  handleFileChange(null);
                  return;
                }

                setClientError(null);
                handleFileChange(nextFile);
              }}
            />
            <small>Maksimal {maxUploadMb}MB. Format JPG/JPEG/PNG.</small>
          </label>

          <div className="field-row field-row-tight">
            <label>
              Posisi Horizontal (0-100)
              <input
                type="range"
                min={0}
                max={100}
                value={formValues.imagePosX}
                onChange={(event) => updateField("imagePosX", Number.parseInt(event.target.value, 10))}
              />
              <input
                type="number"
                name="image_pos_x"
                min={0}
                max={100}
                value={formValues.imagePosX}
                onChange={(event) =>
                  updateField("imagePosX", Math.max(0, Math.min(100, Number.parseInt(event.target.value, 10) || 0)))
                }
              />
            </label>
            <label>
              Posisi Vertikal (0-100)
              <input
                type="range"
                min={0}
                max={100}
                value={formValues.imagePosY}
                onChange={(event) => updateField("imagePosY", Number.parseInt(event.target.value, 10))}
              />
              <input
                type="number"
                name="image_pos_y"
                min={0}
                max={100}
                value={formValues.imagePosY}
                onChange={(event) =>
                  updateField("imagePosY", Math.max(0, Math.min(100, Number.parseInt(event.target.value, 10) || 0)))
                }
              />
            </label>
          </div>

          <label>
            Ukuran Foto (%)
            <input
              type="range"
              min={10}
              max={500}
              value={formValues.imageScale}
              onChange={(event) => updateField("imageScale", Number.parseInt(event.target.value, 10))}
            />
            <input
              type="number"
              name="image_scale"
              min={10}
              value={formValues.imageScale}
              onChange={(event) =>
                updateField("imageScale", Math.max(10, Number.parseInt(event.target.value, 10) || 10))
              }
            />
          </label>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Menyimpan..." : submitLabel}
          </button>
          <a href="/admin/products" className="btn btn-ghost">
            Batal
          </a>
        </div>
      </form>

      <aside className="designer-preview-panel">
        <div className="section-title section-title-wide">
          <div>
            <h3>Preview</h3>
          </div>
        </div>
        <div
          className={`product-card ${
            formValues.cardMode === "template" ? "product-card-template" : "product-card-image"
          } designer-preview-card`}
        >
          {formValues.cardMode === "template" ? (
            <div
              className="poster-frame"
              style={template.style}
              onPointerDown={(event) => startDrag("template", event)}
              onPointerMove={onDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
            >
              {template.backgroundUrl ? (
                <div className="poster-bg-layer">
                  <img
                    src={template.backgroundUrl}
                    alt=""
                    className="poster-bg-image"
                    width={1200}
                    height={900}
                    decoding="async"
                  />
                </div>
              ) : null}
              <div className="poster-logo">
                {template.logoUrl ? (
                  <img
                    src={template.logoUrl}
                    alt={`${template.siteName} logo`}
                    className="poster-logo-image"
                    width={320}
                    height={160}
                    decoding="async"
                  />
                ) : (
                  <span className="poster-logo-text">{template.siteName}</span>
                )}
              </div>
              <div className="poster-side poster-side-left">{previewModel}</div>
              <div className="poster-side poster-side-right">{previewBrand}</div>
              <div className="poster-photo-wrap">
                <img
                  src={imageUrl}
                  alt="Preview produk"
                  className="poster-photo"
                  width={1200}
                  height={900}
                  decoding="async"
                  style={previewImageStyle}
                />
              </div>
              <div className="poster-title-box">{previewTitle}</div>
            </div>
          ) : (
            <div
              className="thumb-wrap thumb-wrap-direct"
              onPointerDown={(event) => startDrag("image", event)}
              onPointerMove={onDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
            >
              <img
                src={imageUrl}
                alt="Preview produk"
                className="thumb-direct"
                width={1200}
                height={900}
                decoding="async"
                style={previewImageStyle}
              />
            </div>
          )}
          <div className="card-body">
            <div className="chip">{typeName}</div>
            <p>{previewDetail}</p>
            <div className="price-table-wrap">
              <table className="price-table" aria-label="Preview harga paket">
                <tbody>
                  <tr>
                    <th>Harga Paket</th>
                    <td>{`Rp ${new Intl.NumberFormat("id-ID").format(totalPrice)}`}</td>
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


