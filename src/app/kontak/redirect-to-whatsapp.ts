import { redirect } from "next/navigation";

import { getProductByRef } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/site-settings";
import {
  buildWhatsappUrl,
  formatRupiah,
  getDefaultWhatsappMessage,
  getProductCode
} from "@/lib/utils";

export async function redirectToWhatsapp(productRef?: string | null) {
  const settings = await getSiteSettings();
  let message = getDefaultWhatsappMessage(settings.whatsappMessage);

  if (productRef) {
    const product = await getProductByRef(productRef);
    if (product) {
      const lines = [
        message,
        `Saya tertarik dengan produk: ${product.name}`,
        product.brand ? `Merek: ${product.brand}` : null,
        product.model ? `Model: ${product.model}` : null,
        `Harga paket: ${formatRupiah(product.priceItem + product.priceInstall)}`,
        `Kode produk: ${getProductCode({
          id: product.id,
          createdAt: product.createdAt,
          type: { name: product.type.name }
        })}`
      ].filter(Boolean);
      message = lines.join("\n");
    }
  }

  const whatsappUrl = buildWhatsappUrl(settings.whatsappNumber, message);
  if (!whatsappUrl) {
    redirect("/?error=Kontak%20WhatsApp%20belum%20diatur%20oleh%20admin.");
  }

  redirect(whatsappUrl);
}
