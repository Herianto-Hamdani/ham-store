import { AdminShellFrame } from "@/components/admin-shell-frame";
import { logoutAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/site-settings";
import { getSiteName, resolveImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, settings] = await Promise.all([requireAdmin(), getSiteSettings()]);
  const siteName = getSiteName(settings.webName);
  const logoUrl = resolveImageUrl(settings.logoThumbPath, settings.logoPath);
  const hasLogo = logoUrl !== "/assets/img/placeholder.svg";

  return (
    <main className="container main-content main-content-admin">
      <AdminShellFrame
        siteName={siteName}
        logoUrl={logoUrl}
        hasLogo={hasLogo}
        username={user.username}
        logoutAction={logoutAction}
      >
        {children}
      </AdminShellFrame>
    </main>
  );
}
