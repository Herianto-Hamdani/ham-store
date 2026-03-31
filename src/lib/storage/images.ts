import { randomBytes } from "node:crypto";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { STORAGE_BUCKET } from "@/lib/constants";
import { env } from "@/lib/env";
import { getMaxUploadBytes, getMaxUploadMb } from "@/lib/upload-config";
import { normalizeUploadPath } from "@/lib/utils";

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_PIXELS = 24_000_000;
const MAX_SOURCE_DIMENSION = 4096;
const MASTER_MAX_WIDTH = 1600;
const THUMB_WIDTH = 360;

type StoredImageSet = {
  imagePath: string;
  thumbPath: string;
};

function getStorageClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

function getOutputExtension(hasAlpha: boolean) {
  return hasAlpha ? "png" : "webp";
}

async function ensureLocalDirectory(targetPath: string) {
  await mkdir(path.dirname(targetPath), { recursive: true });
}

async function buildVariants(file: File) {
  const maxSize = getMaxUploadBytes();
  const maxSizeMb = getMaxUploadMb();

  if (!ALLOWED_MIMES.has(file.type)) {
    throw new Error("Format gambar harus JPG/JPEG/PNG.");
  }

  if (file.size <= 0 || file.size > maxSize) {
    throw new Error(`Ukuran gambar harus <= ${maxSizeMb}MB.`);
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(inputBuffer, { limitInputPixels: MAX_SOURCE_PIXELS }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("File bukan gambar yang valid.");
  }

  if (metadata.width > MAX_SOURCE_DIMENSION || metadata.height > MAX_SOURCE_DIMENSION) {
    throw new Error(`Dimensi gambar maksimal ${MAX_SOURCE_DIMENSION}px.`);
  }

  const hasAlpha = Boolean(metadata.hasAlpha);
  const extension = getOutputExtension(hasAlpha);
  const year = new Date().toISOString().slice(2, 4);
  const month = new Date().toISOString().slice(5, 7);
  const filename = randomBytes(16).toString("hex");
  const imagePath = `uploads/${year}/${month}/${filename}.${extension}`;
  const thumbPath = `uploads/${year}/${month}/thumb_${filename}.${extension}`;

  const encoder =
    extension === "png"
      ? (instance: sharp.Sharp) =>
          instance.png({ compressionLevel: 9, palette: true, effort: 8 })
      : (instance: sharp.Sharp) => instance.webp({ quality: 78, effort: 5 });

  const master = await encoder(
    sharp(inputBuffer).rotate().resize({
      width: MASTER_MAX_WIDTH,
      withoutEnlargement: true
    })
  ).toBuffer();

  const thumb = await encoder(
    sharp(inputBuffer).rotate().resize({
      width: THUMB_WIDTH,
      withoutEnlargement: true
    })
  ).toBuffer();

  return {
    imagePath,
    thumbPath,
    master,
    thumb,
    contentType: extension === "png" ? "image/png" : "image/webp"
  };
}

export async function storeUploadedImage(file: File): Promise<StoredImageSet> {
  const variants = await buildVariants(file);
  const supabase = getStorageClient();

  if (!supabase && process.env.VERCEL) {
    throw new Error("Supabase Storage wajib diisi saat deploy di Vercel.");
  }

  if (supabase) {
    const [imageUpload, thumbUpload] = await Promise.all([
      supabase.storage.from(STORAGE_BUCKET).upload(variants.imagePath, variants.master, {
        cacheControl: "31536000",
        contentType: variants.contentType,
        upsert: true
      }),
      supabase.storage.from(STORAGE_BUCKET).upload(variants.thumbPath, variants.thumb, {
        cacheControl: "31536000",
        contentType: variants.contentType,
        upsert: true
      })
    ]);

    if (imageUpload.error || thumbUpload.error) {
      throw new Error(imageUpload.error?.message || thumbUpload.error?.message || "Upload gambar gagal.");
    }

    return {
      imagePath: variants.imagePath,
      thumbPath: variants.thumbPath
    };
  }

  const imageAbsolute = path.join(process.cwd(), "public", variants.imagePath);
  const thumbAbsolute = path.join(process.cwd(), "public", variants.thumbPath);
  await ensureLocalDirectory(imageAbsolute);
  await ensureLocalDirectory(thumbAbsolute);
  await writeFile(imageAbsolute, variants.master);
  await writeFile(thumbAbsolute, variants.thumb);

  return {
    imagePath: variants.imagePath,
    thumbPath: variants.thumbPath
  };
}

async function deleteLocalFile(relativePath: string) {
  const absolutePath = path.join(process.cwd(), "public", relativePath);
  try {
    await stat(absolutePath);
    await rm(absolutePath, { force: true });
  } catch {
    return;
  }
}

export async function deleteImageSet(imagePath?: string | null, thumbPath?: string | null) {
  const image = normalizeUploadPath(imagePath);
  const thumb = normalizeUploadPath(thumbPath);
  const targets = [image, thumb].filter((value): value is string => Boolean(value));
  if (targets.length === 0) {
    return;
  }

  const supabase = getStorageClient();
  if (supabase) {
    await supabase.storage.from(STORAGE_BUCKET).remove(targets);
    return;
  }

  await Promise.all(targets.map(deleteLocalFile));
}
