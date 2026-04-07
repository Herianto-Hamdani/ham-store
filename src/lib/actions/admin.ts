"use server";

import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import type { FormState } from "@/lib/form-state";
import {
  clearLoginRateLimit,
  getLoginDelayMs,
  hitLoginRateLimit,
  loginRateAvailableIn,
  loginTooManyAttempts
} from "@/lib/auth/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createAdminSession,
  destroyAdminSession,
  getOptionalAdminUser,
  requireAdmin
} from "@/lib/auth/session";
import { getMutableSiteSettings } from "@/lib/site-settings";
import { deleteImageSet, storeUploadedImage } from "@/lib/storage/images";
import {
  cardModeValue,
  encryptPublicId,
  normalizeUploadPath,
  normalizeWhatsappNumber
} from "@/lib/utils";

function redirectWithMessage(path: string, key: "error" | "success", message: string): never {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, message);
  redirect(`${url.pathname}${url.search}`);
}

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseRange(
  value: FormDataEntryValue | null,
  min: number,
  max: number,
  fallback: number,
  label: string
) {
  const raw = normalizeText(value);
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} harus di rentang ${min} - ${max}.`);
  }

  return parsed;
}

function parsePrice(value: FormDataEntryValue | null, label: string) {
  const raw = normalizeText(value);
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${label} harus angka bulat rupiah.`);
  }

  return Number.parseInt(raw, 10);
}

function getOptionalFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size <= 0) {
    return null;
  }

  return value;
}

function getClientIp(forwardedFor: string | null) {
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

async function getRequestMeta() {
  const headerStore = await headers();
  return {
    ip: getClientIp(headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip")),
    userAgent: headerStore.get("user-agent") ?? "unknown"
  };
}

function validateUsername(username: string) {
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
    throw new Error(
      "Username hanya boleh huruf, angka, titik, underscore, dash (3-40 karakter)."
    );
  }
}

function validatePassword(password: string, confirm: string, required: boolean) {
  if (!required && !password && !confirm) {
    return;
  }

  if (password.length < 6) {
    throw new Error("Password minimal 6 karakter.");
  }

  if (password !== confirm) {
    throw new Error("Konfirmasi password tidak sama.");
  }
}

function parseProductPayload(formData: FormData) {
  const name = normalizeText(formData.get("nama_barang"));
  const brand = normalizeText(formData.get("brand"));
  const model = normalizeText(formData.get("model"));
  const detail = normalizeText(formData.get("detail_produk"));
  const typeId = Number.parseInt(normalizeText(formData.get("type_id")), 10);

  if (!name) {
    throw new Error("Nama barang wajib diisi.");
  }

  if (!Number.isFinite(typeId) || typeId <= 0) {
    throw new Error("Type barang wajib dipilih.");
  }

  return {
    typeId,
    name,
    brand,
    model,
    detail,
    cardMode: cardModeValue(normalizeText(formData.get("card_mode"))),
    priceItem: parsePrice(formData.get("price_barang"), "Harga barang"),
    priceInstall: parsePrice(formData.get("price_pasang"), "Harga pasang"),
    imagePosX: parseRange(formData.get("image_pos_x"), 0, 100, 50, "Posisi horizontal foto"),
    imagePosY: parseRange(formData.get("image_pos_y"), 0, 100, 50, "Posisi vertikal foto"),
    imageScale: parseRange(formData.get("image_scale"), 10, 500, 100, "Ukuran foto")
  };
}

function revalidateCatalogPaths(productId?: number) {
  revalidateTag(CACHE_TAGS.catalog);
  revalidateTag(CACHE_TAGS.products);
  revalidateTag(CACHE_TAGS.types);
  revalidateTag(CACHE_TAGS.siteSettings);
  revalidateTag(CACHE_TAGS.sitemap);
  revalidateTag(CACHE_TAGS.adminOverview);

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/produk/[ref]", "page");
  revalidatePath("/kontak/[ref]", "page");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/template");
  if (productId) {
    revalidatePath(`/produk/${encryptPublicId(productId)}`);
  }
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const username = normalizeText(formData.get("username"));
    const password = String(formData.get("password") ?? "");
    const { ip } = await getRequestMeta();

    if (await loginTooManyAttempts(username, ip)) {
      const retry = await loginRateAvailableIn(username, ip);
      await new Promise((resolve) => setTimeout(resolve, getLoginDelayMs()));
      return {
        error: `Terlalu banyak percobaan login. Coba lagi dalam ${retry} detik.`,
        success: null
      };
    }

    const user = await prisma.user.findUnique({
      where: {
        username
      }
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      const lockSeconds = await hitLoginRateLimit(username, ip);
      await new Promise((resolve) => setTimeout(resolve, getLoginDelayMs()));

      return {
        error:
          lockSeconds > 0
            ? `Login diblokir sementara selama ${lockSeconds} detik karena percobaan berulang.`
            : "Username atau password salah.",
        success: null
      };
    }

    await clearLoginRateLimit(username, ip);
    await createAdminSession(user.id);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Login gagal.",
      success: null
    };
  }

  redirect("/admin/products?success=Login%20berhasil.");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login?success=Anda%20berhasil%20logout.");
}

export async function createProductAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const payload = parseProductPayload(formData);
    const imageFile = getOptionalFile(formData.get("gambar"));
    const imageSet = imageFile ? await storeUploadedImage(imageFile) : null;

    try {
      const product = await prisma.product.create({
        data: {
          ...payload,
          cardMode: payload.cardMode.toUpperCase() as "IMAGE" | "TEMPLATE",
          imagePath: imageSet?.imagePath ?? null,
          thumbPath: imageSet?.thumbPath ?? null
        }
      });

      revalidateCatalogPaths(product.id);
    } catch (error) {
      if (imageSet) {
        await deleteImageSet(imageSet.imagePath, imageSet.thumbPath);
      }
      throw error;
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Produk gagal disimpan.",
      success: null
    };
  }

  redirect("/admin/products?success=Produk%20berhasil%20ditambahkan.");
}

export async function updateProductAction(
  productId: number,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await requireAdmin();
    const current = await prisma.product.findUnique({
      where: { id: productId }
    });
    if (!current) {
      throw new Error("Produk tidak ditemukan.");
    }

    const payload = parseProductPayload(formData);
    const imageFile = getOptionalFile(formData.get("gambar"));
    const newImageSet = imageFile ? await storeUploadedImage(imageFile) : null;

    try {
      await prisma.product.update({
        where: { id: productId },
        data: {
          ...payload,
          cardMode: payload.cardMode.toUpperCase() as "IMAGE" | "TEMPLATE",
          imagePath: newImageSet?.imagePath ?? current.imagePath,
          thumbPath: newImageSet?.thumbPath ?? current.thumbPath
        }
      });
    } catch (error) {
      if (newImageSet) {
        await deleteImageSet(newImageSet.imagePath, newImageSet.thumbPath);
      }
      throw error;
    }

    if (newImageSet) {
      await deleteImageSet(current.imagePath, current.thumbPath);
    }

    revalidateCatalogPaths(productId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Produk gagal diperbarui.",
      success: null
    };
  }

  redirect("/admin/products?success=Produk%20berhasil%20diperbarui.");
}

export async function deleteProductAction(productId: number) {
  await requireAdmin();
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  if (!product) {
    redirectWithMessage("/admin/products", "error", "Produk tidak ditemukan.");
  }

  await prisma.product.delete({
    where: { id: productId }
  });
  await deleteImageSet(product.imagePath, product.thumbPath);
  revalidateCatalogPaths(productId);
  redirect("/admin/products?success=Produk%20berhasil%20dihapus.");
}

export async function createTypeAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const name = normalizeText(formData.get("name"));
    if (!name) {
      throw new Error("Nama type wajib diisi.");
    }
    if (name.length > 100) {
      throw new Error("Nama type maksimal 100 karakter.");
    }

    const exists = await prisma.type.findUnique({
      where: { name }
    });
    if (exists) {
      throw new Error("Nama type sudah dipakai.");
    }

    await prisma.type.create({
      data: { name }
    });
    revalidateCatalogPaths();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Type gagal disimpan.",
      success: null
    };
  }

  redirect("/admin/types?success=Type%20berhasil%20ditambahkan.");
}

export async function updateTypeAction(
  typeId: number,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await requireAdmin();
    const name = normalizeText(formData.get("name"));
    if (!name) {
      throw new Error("Nama type wajib diisi.");
    }
    if (name.length > 100) {
      throw new Error("Nama type maksimal 100 karakter.");
    }

    const existing = await prisma.type.findUnique({
      where: { id: typeId }
    });
    if (!existing) {
      throw new Error("Type tidak ditemukan.");
    }

    const duplicate = await prisma.type.findFirst({
      where: {
        name,
        id: {
          not: typeId
        }
      }
    });

    if (duplicate) {
      throw new Error("Nama type sudah dipakai type lain.");
    }

    await prisma.type.update({
      where: { id: typeId },
      data: { name }
    });
    revalidateCatalogPaths();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Type gagal diperbarui.",
      success: null
    };
  }

  redirect("/admin/types?success=Type%20berhasil%20diperbarui.");
}

export async function deleteTypeAction(typeId: number) {
  await requireAdmin();
  const existing = await prisma.type.findUnique({
    where: { id: typeId },
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  if (!existing) {
    redirectWithMessage("/admin/types", "error", "Type tidak ditemukan.");
  }

  if (existing._count.products > 0) {
    redirectWithMessage(
      "/admin/types",
      "error",
      "Type masih dipakai produk, tidak bisa dihapus."
    );
  }

  await prisma.type.delete({
    where: { id: typeId }
  });
  revalidateCatalogPaths();
  redirect("/admin/types?success=Type%20berhasil%20dihapus.");
}

export async function createAdminAccountAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await requireAdmin();
    const username = normalizeText(formData.get("username"));
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("password_confirm") ?? "");

    validateUsername(username);
    validatePassword(password, confirm, true);

    const exists = await prisma.user.findUnique({
      where: { username }
    });
    if (exists) {
      throw new Error("Username sudah dipakai.");
    }

    await prisma.user.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        role: "ADMIN"
      }
    });
    revalidateTag(CACHE_TAGS.adminOverview);
    revalidatePath("/admin/accounts");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Akun admin gagal dibuat.",
      success: null
    };
  }

  redirect("/admin/accounts?success=Akun%20admin%20baru%20berhasil%20dibuat.");
}

export async function updateAdminAccountAction(
  accountId: number,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await requireAdmin();
    const username = normalizeText(formData.get("username"));
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("password_confirm") ?? "");

    validateUsername(username);
    validatePassword(password, confirm, false);

    const existing = await prisma.user.findUnique({
      where: { id: accountId }
    });
    if (!existing) {
      throw new Error("Akun admin tidak ditemukan.");
    }

    const duplicate = await prisma.user.findFirst({
      where: {
        username,
        id: {
          not: accountId
        }
      }
    });
    if (duplicate) {
      throw new Error("Username sudah dipakai akun lain.");
    }

    await prisma.user.update({
      where: { id: accountId },
      data: {
        username,
        ...(password
          ? {
              passwordHash: await hashPassword(password)
            }
          : {})
      }
    });
    revalidateTag(CACHE_TAGS.adminOverview);
    revalidatePath("/admin/accounts");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Akun admin gagal diperbarui.",
      success: null
    };
  }

  redirect("/admin/accounts?success=Akun%20admin%20berhasil%20diperbarui.");
}

export async function deleteAdminAccountAction(accountId: number) {
  const currentUser = await requireAdmin();
  if (currentUser.id === accountId) {
    redirectWithMessage(
      "/admin/accounts",
      "error",
      "Akun yang sedang dipakai login tidak boleh dihapus."
    );
  }

  const totalAdmins = await prisma.user.count({
    where: {
      role: "ADMIN"
    }
  });

  if (totalAdmins <= 1) {
    redirectWithMessage("/admin/accounts", "error", "Minimal harus ada 1 akun admin.");
  }

  await prisma.user.delete({
    where: { id: accountId }
  });
  revalidateTag(CACHE_TAGS.adminOverview);
  revalidatePath("/admin/accounts");
  redirect("/admin/accounts?success=Akun%20admin%20berhasil%20dihapus.");
}

export async function updateSiteSettingsAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await requireAdmin();
    const current = await getMutableSiteSettings();
    const webName = normalizeText(formData.get("web_name"));
    if (!webName) {
      throw new Error("Nama web wajib diisi.");
    }
    if (webName.length > 160) {
      throw new Error("Nama web maksimal 160 karakter.");
    }

    const whatsappNumber = normalizeWhatsappNumber(normalizeText(formData.get("whatsapp_number") as string | null));
    const whatsappMessage = normalizeText(formData.get("whatsapp_message"));
    if (whatsappMessage.length > 255) {
      throw new Error("Pesan WhatsApp maksimal 255 karakter.");
    }

    const logoFile = getOptionalFile(formData.get("logo_web"));

    const logoSet = logoFile ? await storeUploadedImage(logoFile) : null;

    try {
      await prisma.siteSetting.upsert({
        where: { id: 1 },
        update: {
          webName,
          whatsappNumber,
          whatsappMessage,
          logoPath: logoSet?.imagePath ?? current.logoPath,
          logoThumbPath: logoSet?.thumbPath ?? current.logoThumbPath
        },
        create: {
          id: 1,
          webName,
          whatsappNumber,
          whatsappMessage,
          logoPath: logoSet?.imagePath ?? null,
          logoThumbPath: logoSet?.thumbPath ?? null
        }
      });
    } catch (error) {
      if (logoSet) {
        await deleteImageSet(logoSet.imagePath, logoSet.thumbPath);
      }
      throw error;
    }

    if (logoSet) {
      await deleteImageSet(current.logoPath, current.logoThumbPath);
    }

    revalidateCatalogPaths();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Pengaturan situs gagal diperbarui.",
      success: null
    };
  }

  redirect("/admin/settings?success=Pengaturan%20situs%20berhasil%20diperbarui.");
}

export async function updateTemplateSettingsAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await requireAdmin();
    const current = await getMutableSiteSettings();
    const bgFile = getOptionalFile(formData.get("template_bg"));
    const logoFile = getOptionalFile(formData.get("template_logo"));

    const [bgSet, logoSet] = await Promise.all([
      bgFile ? storeUploadedImage(bgFile) : Promise.resolve(null),
      logoFile ? storeUploadedImage(logoFile) : Promise.resolve(null)
    ]);

    try {
      await prisma.siteSetting.upsert({
        where: { id: 1 },
        update: {
          templateBgPath: bgSet?.imagePath ?? current.templateBgPath,
          templateBgThumbPath: bgSet?.thumbPath ?? current.templateBgThumbPath,
          templateLogoPath: logoSet?.imagePath ?? current.templateLogoPath,
          templateLogoThumbPath: logoSet?.thumbPath ?? current.templateLogoThumbPath,
          templateBgPosX: parseRange(formData.get("template_bg_pos_x"), 0, 100, current.templateBgPosX, "Posisi horizontal background"),
          templateBgPosY: parseRange(formData.get("template_bg_pos_y"), 0, 100, current.templateBgPosY, "Posisi vertikal background"),
          templateBgScale: parseRange(formData.get("template_bg_scale"), 10, 300, current.templateBgScale, "Skala background"),
          templateLogoTop: parseRange(formData.get("template_logo_top"), 0, 60, current.templateLogoTop, "Posisi atas logo"),
          templateLogoRight: parseRange(formData.get("template_logo_right"), 0, 60, current.templateLogoRight, "Posisi kanan logo"),
          templateLogoWidth: parseRange(formData.get("template_logo_width"), 8, 80, current.templateLogoWidth, "Lebar logo"),
          templateTitleLeft: parseRange(formData.get("template_title_left"), 0, 60, current.templateTitleLeft, "Posisi kiri kotak nama barang"),
          templateTitleWidth: parseRange(formData.get("template_title_width"), 30, 100, current.templateTitleWidth, "Lebar kotak nama barang"),
          templateTitleBottom: parseRange(formData.get("template_title_bottom"), 0, 40, current.templateTitleBottom, "Posisi bawah kotak nama barang"),
          templateTitleFont: parseRange(formData.get("template_title_font"), 10, 42, current.templateTitleFont, "Ukuran huruf nama barang"),
          templateSideTop: parseRange(formData.get("template_side_top"), 0, 80, current.templateSideTop, "Posisi atas teks samping"),
          templateSideLeft: parseRange(formData.get("template_side_left"), 0, 20, current.templateSideLeft, "Posisi kiri teks model"),
          templateSideRight: parseRange(formData.get("template_side_right"), 0, 20, current.templateSideRight, "Posisi kanan teks merek"),
          templateSideFont: parseRange(formData.get("template_side_font"), 8, 36, current.templateSideFont, "Ukuran huruf teks samping"),
          templatePhotoTop: parseRange(formData.get("template_photo_top"), 0, 80, current.templatePhotoTop, "Posisi atas area foto"),
          templatePhotoLeft: parseRange(formData.get("template_photo_left"), 0, 60, current.templatePhotoLeft, "Posisi kiri area foto"),
          templatePhotoWidth: parseRange(formData.get("template_photo_width"), 20, 100, current.templatePhotoWidth, "Lebar area foto"),
          templatePhotoHeight: parseRange(formData.get("template_photo_height"), 20, 90, current.templatePhotoHeight, "Tinggi area foto"),
          templateTypeTop: parseRange(formData.get("template_type_top"), 0, 80, current.templateTypeTop, "Posisi atas type"),
          templateTypeLeft: parseRange(formData.get("template_type_left"), 0, 80, current.templateTypeLeft, "Posisi kiri type"),
          templateTypeWidth: parseRange(formData.get("template_type_width"), 18, 70, current.templateTypeWidth, "Lebar type"),
          templateTypeHeight: parseRange(formData.get("template_type_height"), 16, 40, current.templateTypeHeight, "Tinggi type"),
          templateTypeFont: parseRange(formData.get("template_type_font"), 10, 22, current.templateTypeFont, "Ukuran huruf type"),
          templateDetailTop: parseRange(formData.get("template_detail_top"), 0, 84, current.templateDetailTop, "Posisi atas deskripsi"),
          templateDetailLeft: parseRange(formData.get("template_detail_left"), 0, 60, current.templateDetailLeft, "Posisi kiri deskripsi"),
          templateDetailWidth: parseRange(formData.get("template_detail_width"), 28, 94, current.templateDetailWidth, "Lebar deskripsi"),
          templateDetailHeight: parseRange(formData.get("template_detail_height"), 14, 46, current.templateDetailHeight, "Tinggi deskripsi"),
          templateDetailFont: parseRange(formData.get("template_detail_font"), 10, 18, current.templateDetailFont, "Ukuran huruf deskripsi"),
          templatePriceTop: parseRange(formData.get("template_price_top"), 0, 84, current.templatePriceTop, "Posisi atas harga paket"),
          templatePriceLeft: parseRange(formData.get("template_price_left"), 0, 60, current.templatePriceLeft, "Posisi kiri harga paket"),
          templatePriceWidth: parseRange(formData.get("template_price_width"), 32, 94, current.templatePriceWidth, "Lebar harga paket"),
          templatePriceHeight: parseRange(formData.get("template_price_height"), 16, 34, current.templatePriceHeight, "Tinggi harga paket")
        },
        create: {
          id: 1,
          webName: current.webName,
          whatsappNumber: current.whatsappNumber,
          whatsappMessage: current.whatsappMessage,
          logoPath: current.logoPath,
          logoThumbPath: current.logoThumbPath,
          templateBgPath: bgSet?.imagePath ?? null,
          templateBgThumbPath: bgSet?.thumbPath ?? null,
          templateLogoPath: logoSet?.imagePath ?? null,
          templateLogoThumbPath: logoSet?.thumbPath ?? null,
          templateBgPosX: parseRange(formData.get("template_bg_pos_x"), 0, 100, current.templateBgPosX, "Posisi horizontal background"),
          templateBgPosY: parseRange(formData.get("template_bg_pos_y"), 0, 100, current.templateBgPosY, "Posisi vertikal background"),
          templateBgScale: parseRange(formData.get("template_bg_scale"), 10, 300, current.templateBgScale, "Skala background"),
          templateLogoTop: parseRange(formData.get("template_logo_top"), 0, 60, current.templateLogoTop, "Posisi atas logo"),
          templateLogoRight: parseRange(formData.get("template_logo_right"), 0, 60, current.templateLogoRight, "Posisi kanan logo"),
          templateLogoWidth: parseRange(formData.get("template_logo_width"), 8, 80, current.templateLogoWidth, "Lebar logo"),
          templateTitleLeft: parseRange(formData.get("template_title_left"), 0, 60, current.templateTitleLeft, "Posisi kiri kotak nama barang"),
          templateTitleWidth: parseRange(formData.get("template_title_width"), 30, 100, current.templateTitleWidth, "Lebar kotak nama barang"),
          templateTitleBottom: parseRange(formData.get("template_title_bottom"), 0, 40, current.templateTitleBottom, "Posisi bawah kotak nama barang"),
          templateTitleFont: parseRange(formData.get("template_title_font"), 10, 42, current.templateTitleFont, "Ukuran huruf nama barang"),
          templateSideTop: parseRange(formData.get("template_side_top"), 0, 80, current.templateSideTop, "Posisi atas teks samping"),
          templateSideLeft: parseRange(formData.get("template_side_left"), 0, 20, current.templateSideLeft, "Posisi kiri teks model"),
          templateSideRight: parseRange(formData.get("template_side_right"), 0, 20, current.templateSideRight, "Posisi kanan teks merek"),
          templateSideFont: parseRange(formData.get("template_side_font"), 8, 36, current.templateSideFont, "Ukuran huruf teks samping"),
          templatePhotoTop: parseRange(formData.get("template_photo_top"), 0, 80, current.templatePhotoTop, "Posisi atas area foto"),
          templatePhotoLeft: parseRange(formData.get("template_photo_left"), 0, 60, current.templatePhotoLeft, "Posisi kiri area foto"),
          templatePhotoWidth: parseRange(formData.get("template_photo_width"), 20, 100, current.templatePhotoWidth, "Lebar area foto"),
          templatePhotoHeight: parseRange(formData.get("template_photo_height"), 20, 90, current.templatePhotoHeight, "Tinggi area foto"),
          templateTypeTop: parseRange(formData.get("template_type_top"), 0, 80, current.templateTypeTop, "Posisi atas type"),
          templateTypeLeft: parseRange(formData.get("template_type_left"), 0, 80, current.templateTypeLeft, "Posisi kiri type"),
          templateTypeWidth: parseRange(formData.get("template_type_width"), 18, 70, current.templateTypeWidth, "Lebar type"),
          templateTypeHeight: parseRange(formData.get("template_type_height"), 16, 40, current.templateTypeHeight, "Tinggi type"),
          templateTypeFont: parseRange(formData.get("template_type_font"), 10, 22, current.templateTypeFont, "Ukuran huruf type"),
          templateDetailTop: parseRange(formData.get("template_detail_top"), 0, 84, current.templateDetailTop, "Posisi atas deskripsi"),
          templateDetailLeft: parseRange(formData.get("template_detail_left"), 0, 60, current.templateDetailLeft, "Posisi kiri deskripsi"),
          templateDetailWidth: parseRange(formData.get("template_detail_width"), 28, 94, current.templateDetailWidth, "Lebar deskripsi"),
          templateDetailHeight: parseRange(formData.get("template_detail_height"), 14, 46, current.templateDetailHeight, "Tinggi deskripsi"),
          templateDetailFont: parseRange(formData.get("template_detail_font"), 10, 18, current.templateDetailFont, "Ukuran huruf deskripsi"),
          templatePriceTop: parseRange(formData.get("template_price_top"), 0, 84, current.templatePriceTop, "Posisi atas harga paket"),
          templatePriceLeft: parseRange(formData.get("template_price_left"), 0, 60, current.templatePriceLeft, "Posisi kiri harga paket"),
          templatePriceWidth: parseRange(formData.get("template_price_width"), 32, 94, current.templatePriceWidth, "Lebar harga paket"),
          templatePriceHeight: parseRange(formData.get("template_price_height"), 16, 34, current.templatePriceHeight, "Tinggi harga paket")
        }
      });
    } catch (error) {
      await Promise.all([
        bgSet ? deleteImageSet(bgSet.imagePath, bgSet.thumbPath) : Promise.resolve(),
        logoSet ? deleteImageSet(logoSet.imagePath, logoSet.thumbPath) : Promise.resolve()
      ]);
      throw error;
    }

    await Promise.all([
      bgSet
        ? deleteImageSet(
            normalizeUploadPath(current.templateBgPath),
            normalizeUploadPath(current.templateBgThumbPath)
          )
        : Promise.resolve(),
      logoSet
        ? deleteImageSet(
            normalizeUploadPath(current.templateLogoPath),
            normalizeUploadPath(current.templateLogoThumbPath)
          )
        : Promise.resolve()
    ]);

    revalidateCatalogPaths();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Template card gagal diperbarui.",
      success: null
    };
  }

  redirect("/admin/template?success=Template%20card%20berhasil%20diperbarui.");
}

export async function ensureLoginPageRedirect() {
  const user = await getOptionalAdminUser();
  if (user) {
    redirect("/admin/products");
  }
}




