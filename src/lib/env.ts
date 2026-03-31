import { z } from "zod";

const DEFAULT_APP_URL_SECRET = "web_katalog_secret_2026_change_me";

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi."),
  DIRECT_DATABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  APP_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  APP_URL_SECRET: z.string().min(16).default(DEFAULT_APP_URL_SECRET),
  SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_STORAGE_BUCKET: z.preprocess(emptyToUndefined, z.string().optional()),
  UPLOAD_MAX_MB: z.preprocess(emptyToUndefined, z.string().optional()),
  NEXT_PUBLIC_UPLOAD_MAX_MB: z.preprocess(emptyToUndefined, z.string().optional())
});

const parsedEnv = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  APP_URL: process.env.APP_URL,
  APP_URL_SECRET: process.env.APP_URL_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
  UPLOAD_MAX_MB: process.env.UPLOAD_MAX_MB,
  NEXT_PUBLIC_UPLOAD_MAX_MB: process.env.NEXT_PUBLIC_UPLOAD_MAX_MB
});

if (
  process.env.NODE_ENV === "production" &&
  (parsedEnv.APP_URL_SECRET === DEFAULT_APP_URL_SECRET || parsedEnv.APP_URL_SECRET.length < 32)
) {
  throw new Error(
    "APP_URL_SECRET production harus unik, tidak boleh default, dan minimal 32 karakter."
  );
}

export const env = parsedEnv;
