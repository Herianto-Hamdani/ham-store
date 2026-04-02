import Link from "next/link";

import { AdminLiveFilters } from "@/components/admin-live-filters";
import { LoadingLink } from "@/components/loading-link";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { deleteTypeAction } from "@/lib/actions/admin";
import { getTypeList } from "@/lib/data/admin";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminTypesPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const page = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const payload = await getTypeList({ page, search });

  return (
    <>
      <section className="admin-head admin-head-stacked">
        <div>
          <span className="section-eyebrow">Taxonomy management</span>
          <h1>Manajemen Type</h1>
          <p className="admin-lead">
            Susun kategori produk agar pencarian publik tetap ringkas dan admin lebih mudah
            menjaga kualitas katalog.
          </p>
        </div>
        <div className="filter-actions">
          <Link href="/admin/products" className="btn btn-ghost">
            Produk
          </Link>
          <Link href="/admin/types/new" className="btn btn-primary">
            Tambah Type
          </Link>
        </div>
      </section>

      <section className="admin-metric-grid">
        <article className="metric-card metric-card-highlight">
          <span>Total type</span>
          <strong>{payload.totalTypes.toLocaleString("id-ID")}</strong>
          <p>Seluruh kategori yang tersimpan di master data.</p>
        </article>
        <article className="metric-card">
          <span>Type aktif</span>
          <strong>{payload.activeTypes.toLocaleString("id-ID")}</strong>
          <p>Kategori yang saat ini sudah dipakai minimal oleh satu produk.</p>
        </article>
        <article className="metric-card">
          <span>Produk terhubung</span>
          <strong>{payload.assignedProducts.toLocaleString("id-ID")}</strong>
          <p>Total relasi produk terhadap seluruh kategori aktif.</p>
        </article>
      </section>

      <section className="surface-callout">
        <div>
          <span className="section-eyebrow">Why it matters</span>
          <strong>Type yang rapi membuat pencarian dan filtering jauh lebih konsisten.</strong>
          <p>Gunakan nama kategori yang jelas agar pelanggan dan tim internal sama-sama cepat menemukan produk.</p>
        </div>
      </section>

      <section className="filter-panel">
        <AdminLiveFilters mode="types" initialSearch={search} />
      </section>

      <section>
        {payload.types.length === 0 ? (
          <div className="empty-state">Belum ada data type.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Type</th>
                  <th>Produk</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payload.types.map((type) => {
                  const hasProducts = type._count.products > 0;

                  return (
                    <tr key={type.id}>
                      <td>
                        <strong>{type.name}</strong>
                      </td>
                      <td>{type._count.products.toLocaleString("id-ID")}</td>
                      <td>
                        <span className="admin-inline-pill">{hasProducts ? "Aktif" : "Kosong"}</span>
                      </td>
                      <td>{type.createdAt.toISOString().slice(0, 10)}</td>
                      <td>
                        <div className="row-actions">
                          <LoadingLink
                            className="btn btn-small btn-ghost"
                            href={`/admin/types/${type.id}/edit`}
                            loadingLabel="Membuka Editor Type..."
                          >
                            Edit
                          </LoadingLink>
                          <form action={deleteTypeAction.bind(null, type.id)}>
                            <PendingSubmitButton
                              idleLabel="Hapus"
                              pendingLabel="Menghapus Type..."
                              className="btn btn-small btn-danger"
                            />
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {payload.totalPages > 1 ? (
          <nav className="pagination" aria-label="Pagination admin type">
            {Array.from({ length: payload.totalPages }, (_, index) => {
              const targetPage = index + 1;
              const next = new URLSearchParams();
              if (search) {
                next.set("q", search);
              }
              next.set("page", String(targetPage));

              if (targetPage === payload.page) {
                return (
                  <span key={targetPage} className="active" aria-current="page">
                    {targetPage}
                  </span>
                );
              }

              return (
                <LoadingLink
                  key={targetPage}
                  href={`/admin/types?${next.toString()}`}
                  className=""
                  loadingLabel={`Memuat Halaman Type ${targetPage}...`}
                  showInlineSpinner={false}
                  overlayMode="wordmark"
                >
                  {targetPage}
                </LoadingLink>
              );
            })}
          </nav>
        ) : null}
      </section>
    </>
  );
}
