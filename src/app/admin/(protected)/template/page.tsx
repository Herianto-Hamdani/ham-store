import { LoadingLink } from "@/components/loading-link";
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
  await searchParams;
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
          <LoadingLink
            href="/admin/settings"
            className="btn btn-ghost"
            loadingLabel="Membuka Pengaturan Situs..."
            showInlineSpinner={false}
            showOverlay={false}
          >
            Pengaturan Situs
          </LoadingLink>
          <LoadingLink
            href="/admin/products"
            className="btn btn-ghost"
            loadingLabel="Kembali ke Manajemen Produk..."
            showInlineSpinner={false}
            showOverlay={false}
          >
            Kembali ke Produk
          </LoadingLink>
        </div>
      </section>

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
