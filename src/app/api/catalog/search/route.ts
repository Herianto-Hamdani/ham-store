import { NextResponse } from "next/server";
import { z } from "zod";

import { createCatalogCardItems } from "@/lib/catalog-card";
import { getCatalogSearchResults } from "@/lib/data/catalog";
import { normalizeSearchInput, normalizeSearchPage, normalizeTypeId } from "@/lib/search-utils";

const SearchRequestSchema = z.object({
  q: z.string().optional().default(""),
  type: z.string().optional().default(""),
  page: z.string().optional().default("1")
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = SearchRequestSchema.safeParse({
    q: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "",
    page: searchParams.get("page") ?? "1"
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Parameter pencarian tidak valid."
      },
      {
        status: 400
      }
    );
  }

  const search = normalizeSearchInput(parsed.data.q);
  const typeId = normalizeTypeId(parsed.data.type);
  const page = normalizeSearchPage(parsed.data.page);

  const catalog = await getCatalogSearchResults({
    page,
    search,
    typeId
  });

  return NextResponse.json(
    {
      ok: true,
      data: {
        page: catalog.page,
        total: catalog.total,
        totalPages: catalog.totalPages,
        strategy: catalog.strategy,
        products: createCatalogCardItems(catalog.products)
      }
    },
    {
      headers: {
        "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300"
      }
    }
  );
}
