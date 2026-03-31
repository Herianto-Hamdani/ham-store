import Link from "next/link";
import { Suspense } from "react";

import type { Metadata } from "next";

import { BodyClassManager } from "@/components/body-class-manager";
import { DeferredTrafficTracker } from "@/components/deferred-traffic-tracker";
import { QueryToast } from "@/components/query-toast";
import { TopNav } from "@/components/top-nav";
import { APP_NAME } from "@/lib/constants";
import { getSiteSettings } from "@/lib/site-settings";
import { buildWhatsappUrl, getSiteName, resolveImageUrl } from "@/lib/utils";

import "./globals.css";
import "./enterprise-refresh.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Katalog sparepart premium dengan panel admin Next.js siap deploy ke Vercel."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const siteName = getSiteName(settings.webName);
  const logoUrl = resolveImageUrl(settings.logoThumbPath, settings.logoPath);
  const hasLogo = logoUrl !== "/assets/img/placeholder.svg";
  const whatsappUrl = buildWhatsappUrl(settings.whatsappNumber, settings.whatsappMessage);

  return (
    <html lang="id">
      <body className="public-area">
        <BodyClassManager />
        <Suspense fallback={null}>
          <QueryToast />
        </Suspense>
        <TopNav
          siteName={siteName}
          logoUrl={logoUrl}
          hasLogo={hasLogo}
        />
        {children}
        <footer className="site-footer">
          <div className="container footer-inner">
            <p>Daftar Harga Produk {siteName}</p>
            {whatsappUrl ? (
              <Link href="/kontak" className="btn btn-primary btn-small">
                Kontak WhatsApp
              </Link>
            ) : null}
          </div>
        </footer>
        <DeferredTrafficTracker />
      </body>
    </html>
  );
}




