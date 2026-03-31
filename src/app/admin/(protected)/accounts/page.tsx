import Link from "next/link";

import { LoadingLink } from "@/components/loading-link";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { AccountForm } from "@/components/account-form";
import {
  createAdminAccountAction,
  deleteAdminAccountAction,
  updateAdminAccountAction
} from "@/lib/actions/admin";
import { getOptionalAdminUser } from "@/lib/auth/session";
import { getAdminAccounts } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminAccountsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? Number.parseInt(params.edit, 10) : null;

  const accounts = await getAdminAccounts();
  const currentUser = await getOptionalAdminUser();
  const editingAccount = editId ? accounts.find((account) => account.id === editId) ?? null : null;
  const newestAccount = accounts[0] ?? null;

  return (
    <>
      <section className="admin-head admin-head-stacked">
        <div>
          <span className="section-eyebrow">Access management</span>
          <h1>Akun Admin</h1>
          <p className="admin-lead">
            Kelola akses tim admin dengan alur yang lebih jelas dan tetap aman untuk operasional
            harian.
          </p>
        </div>
        <div className="filter-actions">
          <Link className="btn btn-ghost" href="/admin">
            Dashboard
          </Link>
          <Link className="btn btn-ghost" href="/admin/products">
            Produk
          </Link>
        </div>
      </section>

      <section className="admin-metric-grid">
        <article className="metric-card metric-card-highlight">
          <span>Total admin</span>
          <strong>{accounts.length.toLocaleString("id-ID")}</strong>
          <p>Jumlah akun yang punya akses ke panel admin saat ini.</p>
        </article>
        <article className="metric-card">
          <span>Akun aktif Anda</span>
          <strong>{currentUser?.username ?? "-"}</strong>
          <p>Gunakan akun ini untuk mengelola data dan melakukan audit cepat.</p>
        </article>
        <article className="metric-card">
          <span>Admin terbaru</span>
          <strong>{newestAccount?.username ?? "-"}</strong>
          <p>{newestAccount ? newestAccount.createdAt.toISOString().slice(0, 10) : "Belum ada data"}</p>
        </article>
      </section>

      <section className="admin-kpi-grid admin-kpi-grid-expanded">
        <article className="admin-kpi-card">
          <div className="section-title section-title-wide">
            <div>
              <span className="section-eyebrow">Security note</span>
              <h2>Standar Keamanan</h2>
            </div>
            <p>Password tetap disimpan dalam bentuk hash dan tidak pernah ditampilkan ulang.</p>
          </div>
          <div className="admin-list-grid">
            <div className="admin-list-item">
              <strong>Password terenkripsi</strong>
              <span>Hash tersimpan aman di database</span>
            </div>
            <div className="admin-list-item">
              <strong>Edit tanpa reset wajib</strong>
              <span>Password boleh dikosongkan saat tidak ingin diubah</span>
            </div>
            <div className="admin-list-item">
              <strong>Proteksi akun utama</strong>
              <span>Akun login aktif tidak bisa dihapus sembarangan</span>
            </div>
          </div>
        </article>

        <article className="admin-kpi-card">
          <div className="section-title section-title-wide">
            <div>
              <span className="section-eyebrow">Current roster</span>
              <h2>Daftar Admin Aktif</h2>
            </div>
            <p>Ringkasan cepat siapa saja yang saat ini punya akses panel.</p>
          </div>
          <div className="admin-list-grid">
            {accounts.map((account) => (
              <div className="admin-list-item" key={account.id}>
                <strong>{account.username}</strong>
                <span>ADMIN</span>
                <small>{account.createdAt.toISOString().slice(0, 10)}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <AccountForm
        action={createAdminAccountAction}
        title="Registrasi Admin Baru"
        description="Tambahkan akun admin baru untuk tim operasional atau owner."
        submitLabel="Buat Akun Admin"
        pendingLabel="Membuat Akun Admin Baru..."
      />

      {editingAccount ? (
        <AccountForm
          action={updateAdminAccountAction.bind(null, editingAccount.id)}
          title={`Edit Akun #${editingAccount.id}`}
          description="Isi password baru hanya jika memang ingin mengganti kredensial akun ini."
          submitLabel="Simpan Perubahan"
          pendingLabel="Memperbarui Akun Admin..."
          initialUsername={editingAccount.username}
          optionalPassword
        />
      ) : null}

      <section>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Password</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const isSelf = currentUser?.id === account.id;
                const canDelete = !isSelf && accounts.length > 1;
                return (
                  <tr key={account.id}>
                    <td>{account.id}</td>
                    <td>
                      <strong>{account.username}</strong>
                      {isSelf ? <small> (akun aktif)</small> : null}
                    </td>
                    <td>
                      <span className="admin-inline-pill">ADMIN</span>
                    </td>
                    <td>********</td>
                    <td>{account.createdAt.toISOString().slice(0, 10)}</td>
                      <td>
                        <div className="row-actions">
                          <LoadingLink
                            className="btn btn-small btn-ghost"
                            href={`/admin/accounts?edit=${account.id}`}
                            loadingLabel="Membuka Editor Akun Admin..."
                          >
                            Edit
                          </LoadingLink>
                        {canDelete ? (
                          <form action={deleteAdminAccountAction.bind(null, account.id)}>
                            <PendingSubmitButton
                              idleLabel="Hapus"
                              pendingLabel="Menghapus Akun Admin..."
                              className="btn btn-small btn-danger"
                            />
                          </form>
                        ) : (
                          <span className="btn btn-small btn-ghost">Terkunci</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
