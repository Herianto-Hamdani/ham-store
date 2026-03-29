import { redirectToWhatsapp } from "@/app/kontak/redirect-to-whatsapp";

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ContactPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const productRef =
    typeof params.product_ref === "string"
      ? params.product_ref
      : typeof params.product_id === "string"
        ? params.product_id
        : null;

  await redirectToWhatsapp(productRef);
}
