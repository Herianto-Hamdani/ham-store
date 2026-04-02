"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import type { Type } from "@prisma/client";

import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TemplatePosterContent } from "@/components/template-poster-content";

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
  pendingLabel: string;
  types: Type[];
  values: ProductFormValues;
  template: TemplatePreview;
  maxUploadMb: number;
};

export function ProductForm({
  action,
  submitLabel,
  pendingLabel,
  types,
  values,
  template,
  maxUploadMb
}: ProductFormProps) {
  const [state, formAction] = useActionState(action, initialFormState);
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
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<{
    mode: "drag" | "resize";
    pointerId: number;
    startX: number;
    startY: number;
    posX: number;
    posY: number;
    scale: number;
  } | null>(null);
  const [previewInteracting, setPreviewInteracting] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setFormValues(values);
    setImageUrl(values.imageUrl);
    setPriceItemInput(values.priceItem > 0 ? String(values.priceItem) : "");
    setPriceInstallInput(values.priceInstall > 0 ? String(values.priceInstall) : "");
    setClientError(null);
    setPreviewInteracting(false);
    interactionRef.current = null;
  }, [values]);

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
  const templateCardStyle = useMemo(
    () =>
      formValues.cardMode === "template"
        ? ({
            ...template.style,
            ...(template.backgroundUrl
              ? {
                  ["--template-card-background-image" as string]: `url("${template.backgroundUrl}")`
                }
              : {})
          } as React.CSSProperties)
        : undefined,
    [formValues.cardMode, template.backgroundUrl, template.style]
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

  function startPreviewInteraction(
    mode: "drag" | "resize",
    event: React.PointerEvent<HTMLElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      posX: formValues.imagePosX,
      posY: formValues.imagePosY,
      scale: formValues.imageScale
    };
    setPreviewInteracting(true);
    previewFrameRef.current?.setPointerCapture?.(event.pointerId);
  }

  function onPreviewMove(event: React.PointerEvent<HTMLDivElement>) {
    const interaction = interactionRef.current;
    const frame = previewFrameRef.current;

    if (!interaction || !frame) {
      return;
    }

    const rect = frame.getBoundingClientRect();
    const deltaX = ((event.clientX - interaction.startX) / rect.width) * 100;
    const deltaY = ((event.clientY - interaction.startY) / rect.height) * 100;

    if (interaction.mode === "drag") {
      updateField(
        "imagePosX",
        Math.max(0, Math.min(100, Math.round(interaction.posX + deltaX)))
      );
      updateField(
        "imagePosY",
        Math.max(0, Math.min(100, Math.round(interaction.posY + deltaY)))
      );
      return;
    }

    const deltaScale = (((event.clientX - interaction.startX) / rect.width) + ((event.clientY - interaction.startY) / rect.height)) * 120;
    updateField("imageScale", Math.max(10, Math.min(500, Math.round(interaction.scale + deltaScale))));
  }

  function stopPreviewInteraction(event?: React.PointerEvent<HTMLDivElement>) {
    if (!interactionRef.current) {
      return;
    }

    if (event) {
      previewFrameRef.current?.releasePointerCapture?.(event.pointerId);
    }

    interactionRef.current = null;
    setPreviewInteracting(false);
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
            <p>Geser foto langsung di preview dan tarik handle sudut untuk mengubah skala.</p>
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
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
            className="btn btn-primary"
          />
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
          ref={previewFrameRef}
          className={`product-card ${
            formValues.cardMode === "template" ? "product-card-template" : "product-card-image"
          } designer-preview-card${previewInteracting ? " designer-dragging" : ""}`}
          style={templateCardStyle}
          onPointerMove={onPreviewMove}
          onPointerUp={stopPreviewInteraction}
          onPointerCancel={stopPreviewInteraction}
        >
          {formValues.cardMode === "template" ? (
            <div className="product-card-template-shell">
              <div
                className="poster-frame product-card-media product-card-template-stage"
                style={template.style}
              >
                <TemplatePosterContent
                  backgroundUrl={template.backgroundUrl}
                  logoUrl={template.logoUrl}
                  siteName={template.siteName}
                  title={previewTitle}
                  modelLabel={previewModel}
                  brandLabel={previewBrand}
                  imageUrl={imageUrl}
                  imageAlt="Preview produk"
                  imageStyle={previewImageStyle}
                  showBackgroundLayer={false}
                />
                <div
                  className="product-preview-node product-preview-node-template"
                  onPointerDown={(event) => startPreviewInteraction("drag", event)}
                >
                  <span className="designer-node-badge">Foto Produk</span>
                  <button
                    type="button"
                    className="designer-resize-handle"
                    aria-label="Resize foto produk"
                    onPointerDown={(event) => startPreviewInteraction("resize", event)}
                  />
                </div>
              </div>
              <div className="card-body card-body-template">
                <div className="chip">{typeName}</div>
                <p>{previewDetail}</p>
                <div className="price-table-wrap">
                  <div className="price-inline-card" aria-label="Preview harga paket">
                    <span className="price-inline-card-label">
                      <span>Harga</span>
                      <span>Paket</span>
                    </span>
                    <strong className="price-inline-card-value">{`Rp ${new Intl.NumberFormat("id-ID").format(totalPrice)}`}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="thumb-wrap thumb-wrap-direct product-card-media"
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
              <div
                className="product-preview-node product-preview-node-image"
                onPointerDown={(event) => startPreviewInteraction("drag", event)}
              >
                <span className="designer-node-badge">Foto Produk</span>
                <button
                  type="button"
                  className="designer-resize-handle"
                  aria-label="Resize foto produk"
                  onPointerDown={(event) => startPreviewInteraction("resize", event)}
                />
              </div>
            </div>
          )}
          {formValues.cardMode === "image" ? (
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
          ) : null}
        </div>
      </aside>
    </section>
  );
}


