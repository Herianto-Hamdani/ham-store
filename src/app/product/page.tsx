import { redirect } from "next/navigation";

import { encryptPublicId } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

export default async function LegacyProductPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const id = typeof params.id === "string" ? Number.parseInt(params.id, 10) : null;
  const ref = typeof params.ref === "string" ? params.ref : null;

  if (ref) {
    redirect(`/produk/${ref}`);
  }

  if (id && id > 0) {
    redirect(`/produk/${encryptPublicId(id)}`);
  }

  redirect("/");
}
