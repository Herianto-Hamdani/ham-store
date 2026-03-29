import Link from "next/link";

import { TemplateSettingsForm } from "@/components/template-settings-form";
import { updateTemplateSettingsAction } from "@/lib/actions/admin";
import { getSiteSettings } from "@/lib/site-settings";
import { getMaxUploadMb } from "@/lib/upload-config";
import { getSiteName, templateBackgroundUrl, templateLogoUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminTemplatePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;
  const settings = await getSiteSettings();
  const maxUploadMb = getMaxUploadMb();

  return (
    <>
      <section className="admin-head admin-head-stacked">
        <div>
          <span className="section-eyebrow">Creative system</span>
          <h1>Template Card</h1>
          <p className="admin-lead">
            Kelola posisi background, logo, dan area judul agar tampilan kartu produk tetap konsisten.
          </p>
        </div>
        <div className="filter-actions">
          <Link href="/admin/settings" className="btn btn-ghost">
            Pengaturan Situs
          </Link>
          <Link href="/admin/products" className="btn btn-ghost">
            Kembali ke Produk
          </Link>
        </div>
      </section>

      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      <TemplateSettingsForm
        action={updateTemplateSettingsAction}
        values={{
          siteName: getSiteName(settings.webName),
          backgroundUrl: templateBackgroundUrl(settings),
          logoUrl: templateLogoUrl(settings),
          templateBgPosX: settings.templateBgPosX,
          templateBgPosY: settings.templateBgPosY,
          templateBgScale: settings.templateBgScale,
          templateLogoTop: settings.templateLogoTop,
          templateLogoRight: settings.templateLogoRight,
          templateLogoWidth: settings.templateLogoWidth,
          templateTitleLeft: settings.templateTitleLeft,
          templateTitleWidth: settings.templateTitleWidth,
          templateTitleBottom: settings.templateTitleBottom,
          templateTitleFont: settings.templateTitleFont,
          templateSideTop: settings.templateSideTop,
          templateSideLeft: settings.templateSideLeft,
          templateSideRight: settings.templateSideRight,
          templateSideFont: settings.templateSideFont,
          templatePhotoTop: settings.templatePhotoTop,
          templatePhotoLeft: settings.templatePhotoLeft,
          templatePhotoWidth: settings.templatePhotoWidth,
          templatePhotoHeight: settings.templatePhotoHeight
        }}
        maxUploadMb={maxUploadMb}
      />
    </>
  );
}
