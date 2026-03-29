import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const requiredEnv = [
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "APP_URL",
  "APP_URL_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET"
] as const;

function getMissingEnv() {
  return requiredEnv.filter((key) => !process.env[key]?.trim());
}

async function main() {
  const missingEnv = getMissingEnv();
  if (missingEnv.length > 0) {
    throw new Error(`Env belum lengkap: ${missingEnv.join(", ")}`);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database OK");
  } finally {
    await prisma.$disconnect();
  }

  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false }
    }
  );

  const bucketName = process.env.SUPABASE_STORAGE_BUCKET!;
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Gagal membaca bucket Supabase: ${error.message}`);
  }

  const bucket = buckets.find((item) => item.name === bucketName);
  if (!bucket) {
    throw new Error(`Bucket '${bucketName}' tidak ditemukan.`);
  }

  console.log(`Bucket OK: ${bucket.name}${bucket.public ? " (public)" : " (private)"}`);

  if (!bucket.public) {
    console.warn(
      "Bucket masih private. Project ini saat ini membentuk URL public, jadi sebaiknya bucket dibuat public."
    );
  }

  console.log("Konfigurasi Vercel + Supabase siap dipakai.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
