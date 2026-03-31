import Link from "next/link";

import { getAdminOverview } from "@/lib/data/admin";
import { formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const overview = await getAdminOverview();

  return (
    <>
      <section className="admin-head admin-head-stacked">
        <div>
          <span className="section-eyebrow">Admin overview</span>
          <h1>Dashboard Operasional</h1>
          <p className="admin-lead">Ringkasan singkat untuk kondisi katalog dan operasional inti.</p>
        </div>
        <div className="filter-actions">
          <Link href="/admin/products/new" className="btn btn-primary">
            Tambah Produk
          </Link>
          <Link href="/admin/settings" className="btn btn-ghost">
            Atur Situs
          </Link>
        </div>
      </section>

      <section className="admin-metric-grid">
        <article className="metric-card metric-card-highlight">
          <span>Total produk</span>
          <strong>{overview.productCount.toLocaleString("id-ID")}</strong>
          <p>Produk aktif yang sedang tampil di katalog.</p>
        </article>
        <article className="metric-card">
          <span>Type aktif</span>
          <strong>{overview.activeTypes.toLocaleString("id-ID")}</strong>
          <p>Dari {overview.typeCount.toLocaleString("id-ID")} kategori tersimpan.</p>
        </article>
        <article className="metric-card">
          <span>Akun admin</span>
          <strong>{overview.adminCount.toLocaleString("id-ID")}</strong>
          <p>Jumlah akun admin yang aktif saat ini.</p>
        </article>
        <article className="metric-card">
          <span>Rata-rata paket</span>
          <strong>{formatRupiah(overview.averagePackagePrice)}</strong>
          <p>Rata-rata harga barang dan jasa pasang.</p>
        </article>
      </section>

      <section className="admin-kpi-grid admin-kpi-grid-compact">
        <article className="admin-kpi-card">
          <div className="section-title section-title-wide">
            <div>
              <span className="section-eyebrow">Snapshot</span>
              <h2>Ringkasan Traffic</h2>
            </div>
            <p>Angka utama yang paling sering dibutuhkan admin.</p>
          </div>
          <div className="admin-stat-stack">
            <div className="admin-stat-row">
              <span>Hits hari ini</span>
              <strong>{overview.trafficSummary.todayHits.toLocaleString("id-ID")}</strong>
            </div>
            <div className="admin-stat-row">
              <span>Hits 14 hari</span>
              <strong>{overview.trafficSummary.windowHits.toLocaleString("id-ID")}</strong>
            </div>
            <div className="admin-stat-row">
              <span>Pengunjung unik</span>
              <strong>{overview.trafficSummary.windowUnique.toLocaleString("id-ID")}</strong>
            </div>
            <div className="admin-stat-row">
              <span>Produk template</span>
              <strong>{overview.templateProducts.toLocaleString("id-ID")}</strong>
            </div>
            <div className="admin-stat-row">
              <span>Produk direct image</span>
              <strong>{overview.directProducts.toLocaleString("id-ID")}</strong>
            </div>
          </div>
          <div className="admin-quick-actions">
            <Link href="/admin/products" className="btn btn-ghost btn-small">
              Kelola Produk
            </Link>
            <Link href="/admin/settings" className="btn btn-ghost btn-small">
              Pengaturan Situs
            </Link>
          </div>
        </article>

        <article className="admin-kpi-card">
          <div className="section-title section-title-wide">
            <div>
              <span className="section-eyebrow">Top categories</span>
              <h2>Kategori Teratas</h2>
            </div>
            <p>Kategori dengan produk paling banyak.</p>
          </div>
          <div className="admin-type-list">
            {overview.typeSummary.slice(0, 5).map((type) => (
              <div className="admin-type-row" key={type.id}>
                <span>{type.name}</span>
                <strong>{type._count.products.toLocaleString("id-ID")} produk</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
