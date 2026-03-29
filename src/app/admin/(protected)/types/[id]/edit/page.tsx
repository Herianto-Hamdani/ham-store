import Link from "next/link";
import { notFound } from "next/navigation";

import { TypeForm } from "@/components/type-form";
import { updateTypeAction } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTypeEditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const type = await prisma.type.findUnique({
    where: {
      id: Number.parseInt(id, 10)
    }
  });

  if (!type) {
    notFound();
  }

  return (
    <>
      <section className="admin-head admin-head-stacked">
        <div>
          <span className="section-eyebrow">Taxonomy editor</span>
          <h1>Edit Type</h1>
          <p className="admin-lead">
            Perbarui kategori <strong>{type.name}</strong> agar relasi produk tetap rapi.
          </p>
        </div>
        <div className="filter-actions">
          <Link href="/admin/types" className="btn btn-ghost">
            Kembali ke Type
          </Link>
        </div>
      </section>
      <TypeForm
        action={updateTypeAction.bind(null, type.id)}
        submitLabel="Update"
        initialName={type.name}
      />
    </>
  );
}
