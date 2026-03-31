"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type AdminShellFrameProps = {
  siteName: string;
  logoUrl: string;
  hasLogo: boolean;
  username: string;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    description: "Ringkasan operasional dan traffic"
  },
  {
    href: "/admin/products",
    label: "Produk",
    description: "Kelola katalog dan harga"
  },
  {
    href: "/admin/accounts",
    label: "Akun Admin",
    description: "Atur akses tim admin"
  },
  {
    href: "/admin/types",
    label: "Master Type",
    description: "Kelola kategori produk"
  },
  {
    href: "/admin/settings",
    label: "Pengaturan Situs",
    description: "Logo, banner, dan WhatsApp"
  },
  {
    href: "/admin/template",
    label: "Template Card",
    description: "Atur tampilan kartu produk"
  }
] as const;

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShellFrame({
  siteName,
  logoUrl,
  hasLogo,
  username,
  logoutAction,
  children
}: AdminShellFrameProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("admin-sidebar-open", sidebarOpen);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.classList.remove("admin-sidebar-open");
      window.removeEventListener("keydown", handleEscape);
    };
  }, [sidebarOpen]);

  const currentSection = useMemo(
    () => navItems.find((item) => isItemActive(pathname, item.href)) ?? navItems[0],
    [pathname]
  );

  return (
    <div className="admin-app-shell">
      <header className="admin-top-panel">
        <div className="admin-top-panel-main">
          <button
            type="button"
            className={`admin-sidebar-toggle${sidebarOpen ? " is-active" : ""}`}
            aria-label="Buka navigasi admin"
            aria-controls="adminSidePanel"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="admin-top-panel-brand">
            <span className="admin-top-panel-logo-wrap">
              {hasLogo ? (
                <Image
                  src={logoUrl}
                  alt={`${siteName} logo`}
                  className="admin-top-panel-logo"
                  width={52}
                  height={52}
                  priority
                  sizes="52px"
                />
              ) : (
                <span className="admin-top-panel-mark">{siteName.slice(0, 2).toUpperCase()}</span>
              )}
            </span>
            <div className="admin-top-panel-copy">
              <span className="admin-top-panel-eyebrow">Admin Workspace</span>
              <strong>{currentSection.label}</strong>
              <small>{currentSection.description}</small>
            </div>
          </div>
        </div>

        <div className="admin-top-panel-meta">
          <span className="admin-chip">User: {username}</span>
        </div>
      </header>

      <div className="admin-workspace">
        <button
          type="button"
          className={`admin-side-overlay${sidebarOpen ? " is-open" : ""}`}
          aria-label="Tutup navigasi admin"
          onClick={() => setSidebarOpen(false)}
        />

        <aside
          className={`admin-side-panel${sidebarOpen ? " is-open" : ""}`}
          id="adminSidePanel"
        >
          <div className="admin-side-panel-head">
            <span className="admin-sidebar-title">Navigasi Admin</span>
            <small>Semua menu utama ada di sini dan isi halaman tampil di panel utama.</small>
          </div>

          <nav className="admin-side-nav admin-side-nav-panel">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isItemActive(pathname, item.href) ? "is-active" : ""}
              >
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </Link>
            ))}
            <Link href="/" className="admin-side-nav-external">
              <strong>Preview Publik</strong>
              <small>Lihat halaman user</small>
            </Link>
          </nav>

          <div className="admin-sidebar-card">
            <span className="section-eyebrow">Signed in</span>
            <strong>{username}</strong>
            <p>Gunakan sidebar untuk berpindah menu, dan panel utama untuk mengelola kontennya.</p>
          </div>

          <form action={logoutAction} className="admin-side-logout">
            <PendingSubmitButton
              idleLabel="Keluar Admin"
              pendingLabel="Menutup Sesi Admin..."
              className="btn btn-danger"
            />
          </form>
        </aside>

        <section className="admin-main-panel">{children}</section>
      </div>
    </div>
  );
}
