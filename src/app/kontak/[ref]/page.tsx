import { redirectToWhatsapp } from "@/app/kontak/redirect-to-whatsapp";

export const revalidate = 300;

export default async function ContactRefPage({
  params
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  await redirectToWhatsapp(ref);
}
