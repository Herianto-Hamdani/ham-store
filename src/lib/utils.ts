import { createHmac, randomBytes } from "node:crypto";
import type { CSSProperties } from "react";

import type { CardMode, SiteSetting } from "@prisma/client";

import { APP_NAME, DEFAULT_WHATSAPP_MESSAGE, STORAGE_BUCKET } from "@/lib/constants";
import { env } from "@/lib/env";

type ProductCodeInput = {
  id: number;
  createdAt: Date | string;
  typeName?: string | null;
  type?: { name: string | null } | null;
};

type TemplateInput = Pick<
  SiteSetting,
  | "templateBgPath"
  | "templateBgThumbPath"
  | "templateLogoPath"
  | "templateLogoThumbPath"
  | "logoPath"
  | "logoThumbPath"
  | "templateBgPosX"
  | "templateBgPosY"
  | "templateBgScale"
  | "templateLogoTop"
  | "templateLogoRight"
  | "templateLogoWidth"
  | "templateTitleLeft"
  | "templateTitleWidth"
  | "templateTitleBottom"
  | "templateTitleFont"
  | "templateSideTop"
  | "templateSideLeft"
  | "templateSideRight"
  | "templateSideFont"
  | "templatePhotoTop"
  | "templatePhotoLeft"
  | "templatePhotoWidth"
  | "templatePhotoHeight"
>;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function toPositiveInt(value: string | number | null | undefined, fallback = 1): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function formatRupiah(amount: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0
  }).format(Math.max(0, amount))}`;
}

export function excerpt(text: string, length = 120): string {
  const cleaned = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= length) {
    return cleaned;
  }

  return `${cleaned.slice(0, Math.max(0, length - 3)).trim()}...`;
}

export function normalizeWhatsappNumber(value: string): string {
  const digits = value.replace(/\D+/g, "");
  if (!digits) {
    return "";
  }

  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  if (normalized.length < 9 || normalized.length > 16) {
    throw new Error("Nomor WhatsApp tidak valid.");
  }

  return normalized;
}

export function buildWhatsappUrl(number?: string | null, message?: string | null): string | null {
  const safeNumber = number ? number.replace(/\D+/g, "") : "";
  if (!safeNumber) {
    return null;
  }

  const url = new URL(`https://wa.me/${safeNumber}`);
  const safeMessage = (message ?? "").trim();
  if (safeMessage) {
    url.searchParams.set("text", safeMessage);
  }

  return url.toString();
}

function base64urlEncode(value: Buffer): string {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecode(value: string): Buffer | null {
  if (!/^[A-Za-z0-9\-_]+$/.test(value)) {
    return null;
  }

  const padding = value.length % 4;
  const normalized = padding === 0 ? value : `${value}${"=".repeat(4 - padding)}`;

  try {
    return Buffer.from(normalized.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  } catch {
    return null;
  }
}

export function encryptPublicId(id: number): string {
  const plain = Buffer.from(String(id));
  const secret = env.APP_URL_SECRET;
  const nonce = randomBytes(8);
  const mask = createHmac("sha256", secret).update(nonce).digest();
  const cipher = Buffer.alloc(plain.length);

  for (let index = 0; index < plain.length; index += 1) {
    cipher[index] = plain[index] ^ mask[index % mask.length];
  }

  const mac = createHmac("sha256", secret)
    .update(Buffer.concat([nonce, cipher]))
    .digest()
    .subarray(0, 16);

  return base64urlEncode(Buffer.concat([nonce, mac, cipher]));
}

export function decryptPublicId(token?: string | null): number | null {
  const safeToken = (token ?? "").trim();
  if (!safeToken) {
    return null;
  }

  const payload = base64urlDecode(safeToken);
  if (!payload || payload.length < 25) {
    return null;
  }

  const nonce = payload.subarray(0, 8);
  const mac = payload.subarray(8, 24);
  const cipher = payload.subarray(24);
  const expectedMac = createHmac("sha256", env.APP_URL_SECRET)
    .update(Buffer.concat([nonce, cipher]))
    .digest()
    .subarray(0, 16);

  if (!expectedMac.equals(mac)) {
    return null;
  }

  const mask = createHmac("sha256", env.APP_URL_SECRET).update(nonce).digest();
  const plain = Buffer.alloc(cipher.length);

  for (let index = 0; index < cipher.length; index += 1) {
    plain[index] = cipher[index] ^ mask[index % mask.length];
  }

  const decoded = plain.toString("utf8");
  return /^\d+$/.test(decoded) ? Number.parseInt(decoded, 10) : null;
}

export function normalizeUploadPath(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized || null;
}

export function resolveStorageUrl(path?: string | null): string | null {
  const normalized = normalizeUploadPath(path);
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${normalized}`;
  }

  return `/${normalized}`;
}

export function resolveImageUrl(primary?: string | null, fallback?: string | null): string {
  return (
    resolveStorageUrl(primary) ??
    resolveStorageUrl(fallback) ??
    "/assets/img/placeholder.svg"
  );
}

export function getSiteName(name?: string | null): string {
  return (name ?? "").trim() || APP_NAME;
}

export function toDateValue(value: Date | string | number | null | undefined): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function formatDateOnly(value: Date | string | number | null | undefined, fallback = "-"): string {
  const date = toDateValue(value);
  return date ? date.toISOString().slice(0, 10) : fallback;
}

export function getDateRevisionToken(
  value: Date | string | number | null | undefined,
  fallback = "unknown"
): string {
  const date = toDateValue(value);
  return date ? date.toISOString() : fallback;
}

export function getProductCode(product: ProductCodeInput): string {
  const typeRaw = (product.typeName ?? product.type?.name ?? "TYPE").trim().toUpperCase();
  const typeToken = typeRaw.replace(/[^A-Z0-9]+/g, "") || "TYPE";
  const createdAt = toDateValue(product.createdAt) ?? new Date(0);
  const monthDay = new Intl.DateTimeFormat("en-GB", {
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC"
  })
    .format(createdAt)
    .replace("/", "");

  return `${typeToken}-${monthDay}-${product.id}`;
}

export function cardModeValue(mode?: CardMode | string | null): "image" | "template" {
  return String(mode).toLowerCase() === "template" ? "template" : "image";
}

export function templateStyleVars(settings: TemplateInput): CSSProperties {
  return {
    ["--tpl-bg-pos-x" as string]: `${clamp(settings.templateBgPosX, 0, 100)}%`,
    ["--tpl-bg-pos-y" as string]: `${clamp(settings.templateBgPosY, 0, 100)}%`,
    ["--tpl-bg-scale" as string]: `${clamp(settings.templateBgScale, 10, 300) / 100}`,
    ["--tpl-logo-top" as string]: `${clamp(settings.templateLogoTop, 0, 60)}%`,
    ["--tpl-logo-right" as string]: `${clamp(settings.templateLogoRight, 0, 60)}%`,
    ["--tpl-logo-width" as string]: `${clamp(settings.templateLogoWidth, 8, 80)}%`,
    ["--tpl-title-left" as string]: `${clamp(settings.templateTitleLeft, 0, 60)}%`,
    ["--tpl-title-width" as string]: `${clamp(settings.templateTitleWidth, 30, 100)}%`,
    ["--tpl-title-bottom" as string]: `${clamp(settings.templateTitleBottom, 0, 40)}%`,
    ["--tpl-title-font" as string]: clamp(settings.templateTitleFont, 10, 42),
    ["--tpl-side-top" as string]: `${clamp(settings.templateSideTop, 0, 80)}%`,
    ["--tpl-side-left" as string]: `${clamp(settings.templateSideLeft, 0, 20)}%`,
    ["--tpl-side-right" as string]: `${clamp(settings.templateSideRight, 0, 20)}%`,
    ["--tpl-side-font" as string]: clamp(settings.templateSideFont, 8, 36),
    ["--tpl-photo-top" as string]: `${clamp(settings.templatePhotoTop, 0, 80)}%`,
    ["--tpl-photo-left" as string]: `${clamp(settings.templatePhotoLeft, 0, 60)}%`,
    ["--tpl-photo-width" as string]: `${clamp(settings.templatePhotoWidth, 20, 100)}%`,
    ["--tpl-photo-height" as string]: `${clamp(settings.templatePhotoHeight, 20, 90)}%`
  };
}

export function templateBackgroundUrl(settings: TemplateInput): string | null {
  return (
    resolveStorageUrl(settings.templateBgThumbPath) ??
    resolveStorageUrl(settings.templateBgPath)
  );
}

export function templateLogoUrl(settings: TemplateInput): string | null {
  return (
    resolveStorageUrl(settings.templateLogoThumbPath) ??
    resolveStorageUrl(settings.templateLogoPath) ??
    resolveStorageUrl(settings.logoThumbPath) ??
    resolveStorageUrl(settings.logoPath)
  );
}

export function absoluteUrl(path = "/"): string {
  const base = env.APP_URL?.replace(/\/+$/g, "") || "http://localhost:3000";
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getDefaultWhatsappMessage(message?: string | null): string {
  return (message ?? "").trim() || DEFAULT_WHATSAPP_MESSAGE;
}
