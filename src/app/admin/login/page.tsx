import { LoginForm } from "@/components/login-form";
import { ensureLoginPageRedirect, loginAction } from "@/lib/actions/admin";
import { getSiteSettings } from "@/lib/site-settings";
import { getSiteName, resolveImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  await ensureLoginPageRedirect();

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const success = typeof params.success === "string" ? params.success : null;
  const settings = await getSiteSettings();
  const siteName = getSiteName(settings.webName);
  const logoUrl = resolveImageUrl(settings.logoThumbPath, settings.logoPath);
  const hasLogo = logoUrl !== "/assets/img/placeholder.svg";

  return (
    <LoginForm
      action={loginAction}
      error={error}
      success={success}
      siteName={siteName}
      logoUrl={logoUrl}
      hasLogo={hasLogo}
    />
  );
}
