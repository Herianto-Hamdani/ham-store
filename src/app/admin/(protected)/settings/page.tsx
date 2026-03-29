import Link from "next/link";

import { SiteSettingsForm } from "@/components/site-settings-form";
import { updateSiteSettingsAction } from "@/lib/actions/admin";
import { getSiteSettings } from "@/lib/site-settings";
import { buildWhatsappUrl, resolveImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminSettingsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;
  const settings = await getSiteSettings();

  return (
    <>
      <section className="admin-head admin-head-stacked">
        <div>
          <span className="section-eyebrow">Brand settings</span>
          <h1>Pengaturan Situs</h1>
          <p className="admin-lead">
            Atur identitas brand, banner publik, dan koneksi WhatsApp dari satu tempat.
          </p>
        </div>
        <div className="filter-actions">
          <Link href="/admin/template" className="btn btn-ghost">
            Atur Template Card
          </Link>
        </div>
      </section>
      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}
      <SiteSettingsForm
        action={updateSiteSettingsAction}
        values={{
          webName: settings.webName,
          whatsappNumber: settings.whatsappNumber,
          whatsappMessage: settings.whatsappMessage,
          logoPreview: resolveImageUrl(settings.logoThumbPath, settings.logoPath),
          bannerPreview: resolveImageUrl(settings.bannerThumbPath, settings.bannerPath),
          waPreview: buildWhatsappUrl(settings.whatsappNumber, settings.whatsappMessage)
        }}
      />
    </>
  );
}

