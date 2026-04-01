import { CatalogSearch } from "@/components/catalog-search";
import { createCatalogCardItems, createCatalogTemplateConfig } from "@/lib/catalog-card";
import { getCatalog } from "@/lib/data/catalog";
import { normalizeSearchInput, normalizeSearchPage, normalizeTypeId } from "@/lib/search-utils";
import { getSiteSettings } from "@/lib/site-settings";
import { buildWhatsappUrl, getSiteName } from "@/lib/utils";

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? normalizeSearchInput(params.q) : "";
  const typeId = typeof params.type === "string" ? normalizeTypeId(params.type) : null;
  const page = typeof params.page === "string" ? normalizeSearchPage(params.page) : 1;

  const [settings, catalog] = await Promise.all([
    getSiteSettings(),
    getCatalog({
      page,
      search,
      typeId
    })
  ]);

  const siteName = getSiteName(settings.webName);
  const whatsappUrl = buildWhatsappUrl(settings.whatsappNumber, settings.whatsappMessage);

  return (
    <main className="container main-content">
      <CatalogSearch
        initialSearch={search}
        initialTypeId={typeId}
        initialResults={{
          page: catalog.page,
          total: catalog.total,
          totalPages: catalog.totalPages,
          strategy: catalog.strategy,
          products: createCatalogCardItems(catalog.products)
        }}
        template={createCatalogTemplateConfig(settings)}
        types={catalog.types.map((type) => ({
          id: type.id,
          name: type.name
        }))}
        siteName={siteName}
        whatsappUrl={whatsappUrl}
      />
    </main>
  );
}
