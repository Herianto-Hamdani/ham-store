# Web Katalog Next.js

Migrasi project katalog PHP lama ke:

- `Next.js` App Router untuk frontend + backend
- `PostgreSQL` untuk database utama
- `Supabase Storage` untuk upload gambar
- `Vercel` untuk deployment

## Fitur Yang Sudah Dipindah

- Katalog publik dengan search, filter type, pagination
- Detail produk dan rekomendasi produk terkait
- Redirect kontak WhatsApp dengan pesan otomatis per produk
- Login admin dengan session cookie + rate limit di database
- CRUD produk
- CRUD type
- CRUD akun admin
- Pengaturan situs
- Pengaturan template card
- Tracking traffic publik
- `robots.txt` dan `sitemap.xml`
- Legacy rewrites untuk path PHP lama yang umum

## Local Setup

1. Copy `.env.example` menjadi `.env` dan `.env.local`
2. Jalankan PostgreSQL lokal

Opsi Docker:

```bash
docker compose up -d
```

3. Install dependency:

```bash
npm install
```

4. Generate Prisma client dan push schema:

```bash
npx prisma generate
npx prisma db push
```

5. Seed awal:

```bash
npm run prisma:seed
```

6. Jalankan app:

```bash
npm run dev
```

## Migrasi Data Lama

Script migrasi sekarang akan memprioritaskan database MySQL legacy yang masih hidup jika tersedia.
Jika koneksi MySQL legacy gagal, script otomatis fallback ke `seed.sql`.

Import data legacy:

```bash
npm run migrate:legacy -- --reset
```

Env opsional untuk sumber MySQL legacy:

- `LEGACY_MYSQL_COMMAND`
- `LEGACY_MYSQL_USER`
- `LEGACY_MYSQL_PASSWORD`
- `LEGACY_MYSQL_DATABASE`
- `LEGACY_MYSQL_HOST`
- `LEGACY_MYSQL_PORT`

Jika ingin upload seluruh asset lama ke Supabase Storage:

```bash
npm run supabase:assets
```

## Deploy Vercel + Supabase

1. Buat project PostgreSQL di Supabase
2. Buat bucket public bernama `catalog-assets`
3. Isi env di Vercel:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `APP_URL`
- `APP_URL_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

4. Jalankan sekali di environment yang terhubung ke database:

```bash
npx prisma db push
npm run migrate:legacy -- --reset
npm run supabase:assets
```

5. Deploy ke Vercel

## Catatan Penting

- Folder `public/uploads` sudah disalin dari project lama untuk mempermudah fallback lokal.
- Sumber migrasi legacy yang masih dipertahankan hanya `seed.sql`, `storage/site_settings.json`, dan `storage/metrics/traffic.json`.
- Untuk production Vercel, upload baru sebaiknya memakai Supabase Storage, dan itu sudah didukung oleh utilitas storage di project ini.
- Jika ingin data lama diambil langsung dari MySQL aktif, script tambahan bisa dibuat, tetapi migrasi saat ini sudah menutup file sumber yang ada di repo.
