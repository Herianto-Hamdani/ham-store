import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "catalog-assets";

if (!supabaseUrl || !serviceKey) {
  throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(target);
      }

      return target;
    })
  );

  return files.flat();
}

function detectContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

async function main() {
  const sourceDir = path.join(process.cwd(), "public", "uploads");
  const info = await stat(sourceDir).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error("Folder public/uploads tidak ditemukan.");
  }

  const files = await walk(sourceDir);
  let uploaded = 0;

  for (const file of files) {
    const relative = path
      .relative(path.join(process.cwd(), "public"), file)
      .replace(/\\/g, "/");
    const buffer = await readFile(file);
    const { error } = await supabase.storage.from(bucket).upload(relative, buffer, {
      contentType: detectContentType(file),
      upsert: true
    });

    if (error) {
      throw error;
    }

    uploaded += 1;
    console.log(`Uploaded ${relative}`);
  }

  console.log(`Sinkronisasi asset selesai. Total file: ${uploaded}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
