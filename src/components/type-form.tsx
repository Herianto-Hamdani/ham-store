"use client";

import { useActionState, useState } from "react";

import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type TypeFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  initialName?: string;
};

export function TypeForm({ action, submitLabel, initialName = "" }: TypeFormProps) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [name, setName] = useState(initialName);
  const normalizedName = name.trim() || "Nama Type";

  return (
    <section className="admin-modal-grid">
      <div className="auth-card">
        {state.error ? <div className="alert alert-error">{state.error}</div> : null}
        <form action={formAction} className="form-grid">
          <div className="form-section-head">
            <span className="section-eyebrow">Master data</span>
            <h2>Nama Kategori Produk</h2>
            <p>Buat nama type yang singkat, jelas, dan konsisten agar filter publik tetap rapi.</p>
          </div>
          <label>
            Nama Type
            <input
              type="text"
              name="name"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="form-actions">
            <PendingSubmitButton
              idleLabel={submitLabel}
              pendingLabel="Menyimpan Type..."
              className="btn btn-primary"
            />
            <a href="/admin/types" className="btn btn-ghost">
              Batal
            </a>
          </div>
        </form>
      </div>
      <aside className="designer-preview-panel">
        <div className="section-title section-title-wide">
          <div>
            <span className="section-eyebrow">Preview kategori</span>
            <h3>Tampilan Konteks</h3>
          </div>
          <p>Nama yang Anda isi nanti akan tampil di filter, dashboard, dan listing admin.</p>
        </div>
        <div className="surface-card form-metric-card">
          <span>Preview label</span>
          <strong>{normalizedName}</strong>
        </div>
        <div className="designer-tip-list">
          <div className="admin-list-item">
            <strong>Gunakan nama yang spesifik</strong>
            <span>Contoh: LCD, Touchscreen, Battery, Housing, Flexibel.</span>
          </div>
          <div className="admin-list-item">
            <strong>Hindari duplikasi arti</strong>
            <span>Pilih satu istilah baku agar data dan pencarian tetap konsisten.</span>
          </div>
        </div>
      </aside>
    </section>
  );
}


