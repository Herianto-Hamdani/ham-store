import Image from "next/image";
import Link from "next/link";

import { deleteProductAction } from "@/lib/actions/admin";
import { getAdminProductDashboard } from "@/lib/data/admin";
import { cardModeValue, encryptPublicId, formatRupiah, getProductCode, resolveImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const typeId = typeof params.type === "string" ? Number.parseInt(params.type, 10) : null;
  const page = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const dashboard = await getAdminProductDashboard({
    page,
    search,
    typeId
  });

  const activeTypes = dashboard.typeSummary.filter((item) => item._count.products > 0).length;

  return (
    <>
      <section className="admin-head admin-head-stacked">
        <div>
          <span className="section-eyebrow">Catalog operations</span>
          <h1>Manajemen Produk</h1>
          <p className="admin-lead">
            Kelola listing publik, pantau distribusi kategori, dan cek produk terbaru dari satu
            workspace.
          </p>
        </div>
        <div className="filter-actions">
          <Link href="/admin" className="btn btn-ghost">
            Dashboard
          </Link>
          <Link href="/admin/products/new" className="btn btn-primary">
            Tambah Produk
          </Link>
        </div>
      </section>

      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="admin-metric-grid">
        <article className="metric-card metric-card-highlight">
          <span>Total produk</span>
          <strong>{dashboard.total.toLocaleString("id-ID")}</strong>
          <p>Jumlah produk untuk filter yang sedang aktif.</p>
        </article>
        <article className="metric-card">
          <span>Type aktif</span>
          <strong>{activeTypes.toLocaleString("id-ID")}</strong>
          <p>Dari {dashboard.typeSummary.length.toLocaleString("id-ID")} kategori terdaftar.</p>
        </article>
        <article className="metric-card">
          <span>Template mode</span>
          <strong>{dashboard.templateCount.toLocaleString("id-ID")}</strong>
          <p>{dashboard.directCount.toLocaleString("id-ID")} produk tampil dengan gambar langsung.</p>
        </article>
        <article className="metric-card">
          <span>Rata-rata paket</span>
          <strong>{formatRupiah(dashboard.averagePackagePrice)}</strong>
          <p>Rata-rata harga barang + pasang untuk dataset ini.</p>
        </article>
      </section>

      {dashboard.latestProduct ? (
        <section className="surface-callout">
          <div>
            <span className="section-eyebrow">Latest product</span>
            <strong>{dashboard.latestProduct.name}</strong>
            <p>
              {dashboard.latestProduct.type.name} •{" "}
              {getProductCode(dashboard.latestProduct)}
            </p>
          </div>
          <div className="filter-actions">
            <Link
              href={`/produk/${encryptPublicId(dashboard.latestProduct.id)}`}
              className="btn btn-ghost"
            >
              Lihat Publik
            </Link>
            <Link
              href={`/admin/products/${dashboard.latestProduct.id}/edit`}
              className="btn btn-primary"
            >
              Edit Produk Terbaru
            </Link>
          </div>
        </section>
      ) : null}

      <section className="filter-panel">
        <form method="get" action="/admin/products" className="filter-grid">
          <label>
            Cari nama, merek, model, atau kode
            <input type="text" name="q" defaultValue={search} placeholder="Contoh: LCD-0305-79" />
          </label>
          <label>
            Filter type
            <select name="type" defaultValue={typeId ? String(typeId) : "0"}>
              <option value="0">Semua Type</option>
              {dashboard.types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-actions">
            <button type="submit" className="btn btn-primary">
              Terapkan
            </button>
            <Link href="/admin/products" className="btn btn-ghost">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section>
        {dashboard.products.length === 0 ? (
          <div className="empty-state">Belum ada data produk.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Type</th>
                  <th>Mode</th>
                  <th>Paket</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.products.map((product) => {
                  const totalPrice = product.priceItem + product.priceInstall;
                  const publicRef = encryptPublicId(product.id);
                  const modeLabel =
                    cardModeValue(product.cardMode) === "template" ? "Template" : "Image";

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="admin-product-cell">
                          <Image
                            className="table-thumb"
                            src={resolveImageUrl(product.thumbPath, product.imagePath)}
                            alt={product.name}
                            width={96}
                            height={70}
                            sizes="96px"
                          />
                          <div>
                            <strong>{product.name}</strong>
                            <span>{getProductCode(product)}</span>
                            <small>
                              {product.brand || "Tanpa brand"}
                              {product.model ? ` • ${product.model}` : ""}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{product.type.name}</td>
                      <td>
                        <span className="admin-inline-pill">{modeLabel}</span>
                      </td>
                      <td>{formatRupiah(totalPrice)}</td>
                      <td>{product.createdAt.toISOString().slice(0, 10)}</td>
                      <td>
                        <div className="row-actions">
                          <Link className="btn btn-small btn-ghost" href={`/produk/${publicRef}`}>
                            Publik
                          </Link>
                          <Link className="btn btn-small btn-ghost" href={`/admin/products/${product.id}/edit`}>
                            Edit
                          </Link>
                          <form action={deleteProductAction.bind(null, product.id)}>
                            <button type="submit" className="btn btn-small btn-danger">
                              Hapus
                            </button>
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

        {dashboard.totalPages > 1 ? (
          <nav className="pagination" aria-label="Pagination admin produk">
            {Array.from({ length: dashboard.totalPages }, (_, index) => {
              const targetPage = index + 1;
              const next = new URLSearchParams();
              if (search) next.set("q", search);
              if (typeId) next.set("type", String(typeId));
              next.set("page", String(targetPage));
              return (
                <Link
                  key={targetPage}
                  href={`/admin/products?${next.toString()}`}
                  className={targetPage === dashboard.page ? "active" : ""}
                >
                  {targetPage}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </section>
    </>
  );
}
