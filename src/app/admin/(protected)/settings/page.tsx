import { LoadingLink } from "@/components/loading-link";
import { SiteSettingsForm } from "@/components/site-settings-form";
import { updateSiteSettingsAction } from "@/lib/actions/admin";
import { getSiteSettings } from "@/lib/site-settings";
import { getMaxUploadMb } from "@/lib/upload-config";
import { buildWhatsappUrl, resolveImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminSettingsPage({
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
          <span className="section-eyebrow">Brand settings</span>
          <h1>Pengaturan Situs</h1>
          <p className="admin-lead">
            Atur identitas brand dan koneksi WhatsApp dari satu tempat.
          </p>
        </div>
        <div className="filter-actions">
          <LoadingLink
            href="/admin/template"
            className="btn btn-ghost"
            loadingLabel="Membuka Pengaturan Template Card..."
            showInlineSpinner={false}
            showOverlay={false}
          >
            Atur Template Card
          </LoadingLink>
        </div>
      </section>
      <SiteSettingsForm
        action={updateSiteSettingsAction}
        values={{
          webName: settings.webName,
          whatsappNumber: settings.whatsappNumber,
          whatsappMessage: settings.whatsappMessage,
          logoPreview: resolveImageUrl(settings.logoThumbPath, settings.logoPath),
          waPreview: buildWhatsappUrl(settings.whatsappNumber, settings.whatsappMessage)
        }}
        maxUploadMb={maxUploadMb}
      />
    </>
  );
}

