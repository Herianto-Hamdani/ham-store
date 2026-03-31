"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TemplatePosterContent } from "@/components/template-poster-content";

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

type DesignerNode =
  | "background"
  | "logo"
  | "title"
  | "photo"
  | "sideLeft"
  | "sideRight";

type InteractionState = {
  node: DesignerNode;
  mode: "drag" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  snapshot: TemplateValues;
};

const NODE_LABELS: Record<DesignerNode, string> = {
  background: "Background",
  logo: "Logo",
  title: "Judul",
  photo: "Foto Produk",
  sideLeft: "Label Model",
  sideRight: "Label Brand"
};

const RESIZABLE_NODES = new Set<DesignerNode>(["background", "logo", "title", "photo"]);

const HIDDEN_FIELD_MAP: Array<[name: string, key: keyof TemplateValues]> = [
  ["template_bg_pos_x", "templateBgPosX"],
  ["template_bg_pos_y", "templateBgPosY"],
  ["template_bg_scale", "templateBgScale"],
  ["template_logo_top", "templateLogoTop"],
  ["template_logo_right", "templateLogoRight"],
  ["template_logo_width", "templateLogoWidth"],
  ["template_title_left", "templateTitleLeft"],
  ["template_title_width", "templateTitleWidth"],
  ["template_title_bottom", "templateTitleBottom"],
  ["template_title_font", "templateTitleFont"],
  ["template_side_top", "templateSideTop"],
  ["template_side_left", "templateSideLeft"],
  ["template_side_right", "templateSideRight"],
  ["template_side_font", "templateSideFont"],
  ["template_photo_top", "templatePhotoTop"],
  ["template_photo_left", "templatePhotoLeft"],
  ["template_photo_width", "templatePhotoWidth"],
  ["template_photo_height", "templatePhotoHeight"]
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function TemplateSettingsForm({ action, values, maxUploadMb }: TemplateSettingsFormProps) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [clientError, setClientError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(values);
  const [activeNode, setActiveNode] = useState<DesignerNode>("photo");
  const [dragging, setDragging] = useState(false);
  const objectUrls = useRef<string[]>([]);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<InteractionState | null>(null);
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
    setActiveNode("photo");
    setDragging(false);
    interactionRef.current = null;
  }, [values]);

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

  function startInteraction(
    node: DesignerNode,
    mode: "drag" | "resize",
    event: React.PointerEvent<HTMLElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    setActiveNode(node);
    setDragging(true);
    interactionRef.current = {
      node,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      snapshot: formValues
    };

    frameRef.current?.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const interaction = interactionRef.current;
    const frame = frameRef.current;
    if (!interaction || !frame) {
      return;
    }

    const rect = frame.getBoundingClientRect();
    const deltaX = ((event.clientX - interaction.startX) / rect.width) * 100;
    const deltaY = ((event.clientY - interaction.startY) / rect.height) * 100;
    const snapshot = interaction.snapshot;

    setFormValues((current) => {
      const next = { ...current };

      if (interaction.mode === "drag") {
        switch (interaction.node) {
          case "background":
            next.templateBgPosX = clamp(snapshot.templateBgPosX + deltaX, 0, 100);
            next.templateBgPosY = clamp(snapshot.templateBgPosY + deltaY, 0, 100);
            break;
          case "logo":
            next.templateLogoTop = clamp(snapshot.templateLogoTop + deltaY, 0, 60);
            next.templateLogoRight = clamp(snapshot.templateLogoRight - deltaX, 0, 60);
            break;
          case "title":
            next.templateTitleLeft = clamp(snapshot.templateTitleLeft + deltaX, 0, 60);
            next.templateTitleBottom = clamp(snapshot.templateTitleBottom - deltaY, 0, 40);
            break;
          case "photo":
            next.templatePhotoTop = clamp(snapshot.templatePhotoTop + deltaY, 0, 80);
            next.templatePhotoLeft = clamp(snapshot.templatePhotoLeft + deltaX, 0, 60);
            break;
          case "sideLeft":
            next.templateSideTop = clamp(snapshot.templateSideTop + deltaY, 0, 80);
            next.templateSideLeft = clamp(snapshot.templateSideLeft + deltaX, 0, 20);
            break;
          case "sideRight":
            next.templateSideTop = clamp(snapshot.templateSideTop + deltaY, 0, 80);
            next.templateSideRight = clamp(snapshot.templateSideRight - deltaX, 0, 20);
            break;
        }
      } else {
        switch (interaction.node) {
          case "background":
            next.templateBgScale = clamp(
              snapshot.templateBgScale + (deltaX + deltaY) * 1.5,
              10,
              300
            );
            break;
          case "logo":
            next.templateLogoWidth = clamp(snapshot.templateLogoWidth + deltaX, 8, 80);
            break;
          case "title":
            next.templateTitleWidth = clamp(snapshot.templateTitleWidth + deltaX, 30, 100);
            break;
          case "photo":
            next.templatePhotoWidth = clamp(snapshot.templatePhotoWidth + deltaX, 20, 100);
            next.templatePhotoHeight = clamp(snapshot.templatePhotoHeight + deltaY, 20, 90);
            break;
        }
      }

      return next;
    });
  }

  function finishInteraction(event?: React.PointerEvent<HTMLDivElement>) {
    if (!interactionRef.current) {
      return;
    }

    if (event) {
      frameRef.current?.releasePointerCapture?.(event.pointerId);
    }

    interactionRef.current = null;
    setDragging(false);
  }

  function nudgeActive(deltaX: number, deltaY: number) {
    setFormValues((current) => {
      const next = { ...current };

      switch (activeNode) {
        case "background":
          next.templateBgPosX = clamp(current.templateBgPosX + deltaX, 0, 100);
          next.templateBgPosY = clamp(current.templateBgPosY + deltaY, 0, 100);
          break;
        case "logo":
          next.templateLogoRight = clamp(current.templateLogoRight - deltaX, 0, 60);
          next.templateLogoTop = clamp(current.templateLogoTop + deltaY, 0, 60);
          break;
        case "title":
          next.templateTitleLeft = clamp(current.templateTitleLeft + deltaX, 0, 60);
          next.templateTitleBottom = clamp(current.templateTitleBottom - deltaY, 0, 40);
          break;
        case "photo":
          next.templatePhotoLeft = clamp(current.templatePhotoLeft + deltaX, 0, 60);
          next.templatePhotoTop = clamp(current.templatePhotoTop + deltaY, 0, 80);
          break;
        case "sideLeft":
          next.templateSideLeft = clamp(current.templateSideLeft + deltaX, 0, 20);
          next.templateSideTop = clamp(current.templateSideTop + deltaY, 0, 80);
          break;
        case "sideRight":
          next.templateSideRight = clamp(current.templateSideRight - deltaX, 0, 20);
          next.templateSideTop = clamp(current.templateSideTop + deltaY, 0, 80);
          break;
      }

      return next;
    });
  }

  function resizeActive(delta: number) {
    setFormValues((current) => {
      const next = { ...current };

      switch (activeNode) {
        case "background":
          next.templateBgScale = clamp(current.templateBgScale + delta * 3, 10, 300);
          break;
        case "logo":
          next.templateLogoWidth = clamp(current.templateLogoWidth + delta, 8, 80);
          break;
        case "title":
          next.templateTitleWidth = clamp(current.templateTitleWidth + delta, 30, 100);
          break;
        case "photo":
          next.templatePhotoWidth = clamp(current.templatePhotoWidth + delta, 20, 100);
          next.templatePhotoHeight = clamp(current.templatePhotoHeight + delta, 20, 90);
          break;
      }

      return next;
    });
  }

  function adjustFont(delta: number) {
    setFormValues((current) => {
      const next = { ...current };

      if (activeNode === "title") {
        next.templateTitleFont = clamp(current.templateTitleFont + delta, 10, 42);
      } else if (activeNode === "sideLeft" || activeNode === "sideRight") {
        next.templateSideFont = clamp(current.templateSideFont + delta, 8, 36);
      }

      return next;
    });
  }

  const previewStyle = useMemo(
    () =>
      ({
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
      }) as React.CSSProperties,
    [formValues]
  );

  const designerNodeStyles = useMemo(
    () =>
      ({
        background: {
          inset: 0
        },
        logo: {
          top: `${formValues.templateLogoTop}%`,
          right: `${formValues.templateLogoRight}%`,
          width: `${formValues.templateLogoWidth}%`,
          height: `${Math.max(14, formValues.templateLogoWidth * 0.44)}%`
        },
        title: {
          left: `${formValues.templateTitleLeft}%`,
          width: `${formValues.templateTitleWidth}%`,
          bottom: `${formValues.templateTitleBottom}%`,
          height: `${Math.max(52, formValues.templateTitleFont * 3.1)}px`
        },
        photo: {
          top: `${formValues.templatePhotoTop}%`,
          left: `${formValues.templatePhotoLeft}%`,
          width: `${formValues.templatePhotoWidth}%`,
          height: `${formValues.templatePhotoHeight}%`
        },
        sideLeft: {
          top: `${formValues.templateSideTop}%`,
          left: `${formValues.templateSideLeft}%`,
          width: `${Math.max(24, formValues.templateSideFont * 2.1)}px`,
          height: `${Math.max(120, formValues.templateSideFont * 9)}px`
        },
        sideRight: {
          top: `${formValues.templateSideTop}%`,
          right: `${formValues.templateSideRight}%`,
          width: `${Math.max(24, formValues.templateSideFont * 2.1)}px`,
          height: `${Math.max(120, formValues.templateSideFont * 9)}px`
        }
      }) satisfies Record<DesignerNode, React.CSSProperties>,
    [formValues]
  );

  return (
    <section className="admin-modal-grid template-designer-grid">
      <form action={formAction} className="form-grid admin-modal-form template-designer-form">
        {visibleError ? <div className="alert alert-error">{visibleError}</div> : null}

        <div className="form-section-head">
          <span className="section-eyebrow">Canvas editor</span>
          <h2>Atur Template Langsung di Canvas</h2>
          <p>
            Drag elemen di canvas, kecilkan dengan handle sudut, lalu simpan. Semua produk mode
            template di halaman publik akan langsung mengikuti pengaturan ini setelah disimpan.
          </p>
        </div>

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

        <div className="designer-toolbar">
          {(Object.keys(NODE_LABELS) as DesignerNode[]).map((node) => (
            <button
              key={node}
              type="button"
              className={`designer-layer-button${activeNode === node ? " is-active" : ""}`}
              onClick={() => setActiveNode(node)}
            >
              {NODE_LABELS[node]}
            </button>
          ))}
        </div>

        <div className="designer-inspector">
          <div>
            <strong>Elemen Aktif: {NODE_LABELS[activeNode]}</strong>
            <p>Gunakan drag di canvas atau tombol cepat ini untuk penyesuaian presisi.</p>
          </div>

          <div className="designer-quick-actions">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => nudgeActive(-1, 0)}>
              Geser Kiri
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => nudgeActive(1, 0)}>
              Geser Kanan
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => nudgeActive(0, -1)}>
              Geser Atas
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => nudgeActive(0, 1)}>
              Geser Bawah
            </button>
            {RESIZABLE_NODES.has(activeNode) ? (
              <>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => resizeActive(-2)}>
                  Kecilkan
                </button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => resizeActive(2)}>
                  Besarkan
                </button>
              </>
            ) : null}
            {activeNode === "title" || activeNode === "sideLeft" || activeNode === "sideRight" ? (
              <>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => adjustFont(-1)}>
                  Font -
                </button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => adjustFont(1)}>
                  Font +
                </button>
              </>
            ) : null}
          </div>
        </div>

        {HIDDEN_FIELD_MAP.map(([name, key]) => (
          <input key={name} type="hidden" name={name} value={String(formValues[key] as number)} />
        ))}

        <div className="form-actions">
          <PendingSubmitButton
            idleLabel="Simpan Template"
            pendingLabel="Menerapkan Desain Template..."
            className="btn btn-primary"
          />
          <a href="/admin/products" className="btn btn-ghost">
            Kembali
          </a>
        </div>
      </form>

      <aside className="designer-preview-panel">
        <div className="section-title section-title-wide">
          <div>
            <span className="section-eyebrow">Live canvas</span>
            <h3>Template Editor</h3>
          </div>
          <p>Drag elemen langsung di canvas. Handle sudut dipakai untuk resize.</p>
        </div>

        <div className="designer-frame-shell">
          <div
            ref={frameRef}
            id="templateDesignerFrame"
            className={`product-card product-card-template designer-preview-card${dragging ? " designer-dragging" : ""}`}
            onPointerMove={handlePointerMove}
            onPointerUp={finishInteraction}
            onPointerCancel={finishInteraction}
          >
            <div className="poster-frame product-card-media" style={previewStyle}>
              <TemplatePosterContent
                backgroundUrl={formValues.backgroundUrl}
                logoUrl={formValues.logoUrl}
                siteName={formValues.siteName}
                title="BATERAI REDMI 9"
                modelLabel="MODEL: BN52"
                brandLabel="ORI BRD"
                placeholder={
                  <div className="designer-photo-placeholder" aria-hidden="true">
                    <div className="designer-photo-placeholder-shell" />
                    <span className="designer-photo-placeholder-label">Foto Produk</span>
                  </div>
                }
              />

              {(Object.keys(NODE_LABELS) as DesignerNode[]).map((node) => (
                <div
                  key={node}
                  className={`designer-node designer-node-${node}${activeNode === node ? " is-active" : ""}`}
                  style={designerNodeStyles[node]}
                  onPointerDown={(event) => startInteraction(node, "drag", event)}
                >
                  <span className="designer-node-badge">{NODE_LABELS[node]}</span>
                  {RESIZABLE_NODES.has(node) ? (
                    <button
                      type="button"
                      className="designer-resize-handle"
                      aria-label={`Resize ${NODE_LABELS[node]}`}
                      onPointerDown={(event) => startInteraction(node, "resize", event)}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="card-body">
              <div className="chip">Type</div>
              <p>Perubahan di canvas ini akan menjadi template global untuk semua kartu mode template.</p>
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
        </div>

        <div className="designer-note">
          Simpan template untuk menerapkan perubahan ke semua produk yang menggunakan mode
          template pada halaman publik.
        </div>
      </aside>
    </section>
  );
}
