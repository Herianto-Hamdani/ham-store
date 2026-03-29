"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type TopNavProps = {
  siteName: string;
  logoUrl: string;
  hasLogo: boolean;
  isAdminUser: boolean;
};

export function TopNav({ siteName, logoUrl, hasLogo, isAdminUser }: TopNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedAdminRoute = isAdminRoute && pathname !== "/admin/login";

  if (isProtectedAdminRoute) {
    return (
      <header className="site-header site-header-admin">
        <div className="container header-inner header-inner-admin-only">
          <Link className="brand" href="/admin">
            {hasLogo ? (
              <Image
                className="brand-logo"
                src={logoUrl}
                alt={`${siteName} logo`}
                width={150}
                height={44}
                priority
                sizes="150px"
              />
            ) : (
              <span className="brand-mark">{siteName.slice(0, 2).toUpperCase()}</span>
            )}
            <span className="brand-text">{siteName}</span>
          </Link>
          <span className="admin-chip">Area Admin</span>
        </div>
      </header>
    );
  }

  return (
    <header className={`site-header${isAdminRoute ? " site-header-admin" : ""}`}>
      <div className="container header-inner">
        <Link className="brand" href="/">
          {hasLogo ? (
            <Image
              className="brand-logo"
              src={logoUrl}
              alt={`${siteName} logo`}
              width={150}
              height={44}
              priority
              sizes="150px"
            />
          ) : (
            <span className="brand-mark">{siteName.slice(0, 2).toUpperCase()}</span>
          )}
          <span className="brand-text">{siteName}</span>
        </Link>

        <button
          type="button"
          className={`nav-burger${open ? " is-active" : ""}`}
          aria-label="Buka menu navigasi"
          aria-controls="topNavMenu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`top-nav${open ? " is-open" : ""}`} id="topNavMenu">
          <Link
            className={!pathname.startsWith("/kontak") && !isAdminRoute ? "is-active" : ""}
            href="/"
            onClick={() => setOpen(false)}
          >
            Katalog
          </Link>
          <Link
            className={pathname.startsWith("/kontak") ? "is-active" : ""}
            href="/kontak"
            onClick={() => setOpen(false)}
          >
            Kontak
          </Link>
          <Link
            className={isAdminRoute ? "is-active" : ""}
            href={isAdminUser ? "/admin" : "/admin/login"}
            onClick={() => setOpen(false)}
          >
            {isAdminUser ? "Admin Portal" : "Login Admin"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
