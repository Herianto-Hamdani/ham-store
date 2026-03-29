import { randomBytes } from "node:crypto";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { STORAGE_BUCKET } from "@/lib/constants";
import { env } from "@/lib/env";
import { normalizeUploadPath } from "@/lib/utils";

const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png"]);
const MASTER_MAX_WIDTH = 2000;
const THUMB_WIDTH = 480;

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

function getOutputExtension(mimeType: string) {
  return mimeType === "image/png" ? "png" : "jpg";
}

async function ensureLocalDirectory(targetPath: string) {
  await mkdir(path.dirname(targetPath), { recursive: true });
}

async function buildVariants(file: File) {
  if (!ALLOWED_MIMES.has(file.type)) {
    throw new Error("Format gambar harus JPG/JPEG/PNG.");
  }

  if (file.size <= 0 || file.size > MAX_SIZE) {
    throw new Error("Ukuran gambar harus <= 25MB.");
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(inputBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("File bukan gambar yang valid.");
  }

  const extension = getOutputExtension(file.type);
  const year = new Date().toISOString().slice(2, 4);
  const month = new Date().toISOString().slice(5, 7);
  const filename = randomBytes(16).toString("hex");
  const imagePath = `uploads/${year}/${month}/${filename}.${extension}`;
  const thumbPath = `uploads/${year}/${month}/thumb_${filename}.${extension}`;

  const encoder =
    extension === "png"
      ? (instance: sharp.Sharp) => instance.png({ compressionLevel: 8 })
      : (instance: sharp.Sharp) => instance.jpeg({ quality: 88, mozjpeg: true });

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
    contentType: extension === "png" ? "image/png" : "image/jpeg"
  };
}

export async function storeUploadedImage(file: File): Promise<StoredImageSet> {
  const variants = await buildVariants(file);
  const supabase = getStorageClient();

  if (supabase) {
    const [imageUpload, thumbUpload] = await Promise.all([
      supabase.storage.from(STORAGE_BUCKET).upload(variants.imagePath, variants.master, {
        contentType: variants.contentType,
        upsert: true
      }),
      supabase.storage.from(STORAGE_BUCKET).upload(variants.thumbPath, variants.thumb, {
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
