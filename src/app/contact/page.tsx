import { redirect } from "next/navigation";

import { encryptPublicId } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

export default async function LegacyContactPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const productRef = typeof params.product_ref === "string" ? params.product_ref : null;
  const productId =
    typeof params.product_id === "string" ? Number.parseInt(params.product_id, 10) : null;

  if (productRef) {
    redirect(`/kontak/${productRef}`);
  }

  if (productId && productId > 0) {
    redirect(`/kontak/${encryptPublicId(productId)}`);
  }

  redirect("/kontak");
}
