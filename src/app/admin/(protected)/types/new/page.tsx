import Link from "next/link";

import { TypeForm } from "@/components/type-form";
import { createTypeAction } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default function AdminTypeNewPage() {
  return (
    <>
      <section className="admin-head admin-head-stacked">
        <div>
          <span className="section-eyebrow">Taxonomy editor</span>
          <h1>Tambah Type</h1>
          <p className="admin-lead">
            Tambahkan kategori baru untuk menjaga struktur katalog tetap konsisten.
          </p>
        </div>
        <div className="filter-actions">
          <Link href="/admin/types" className="btn btn-ghost">
            Kembali ke Type
          </Link>
        </div>
      </section>
      <TypeForm action={createTypeAction} submitLabel="Simpan" />
    </>
  );
}
