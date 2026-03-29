# Deploy ke Vercel + Supabase

Panduan ini menyiapkan project ini untuk:

- App Next.js di Vercel
- Database PostgreSQL di Supabase
- File upload di Supabase Storage

## 1. Siapkan project Supabase

1. Buat project baru di Supabase.
2. Buka menu `Storage`.
3. Buat bucket bernama `catalog-assets`.
4. Set bucket tersebut sebagai `public`.

Catatan:
- Project ini membentuk URL file dengan pola public bucket.
- Jika bucket dibuat private, kode aplikasi perlu diubah ke signed URL.

## 2. Siapkan environment variables

Salin isi `.env.vercel.example` ke env Vercel.

Nilai yang dibutuhkan:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `APP_URL`
- `APP_URL_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `UPLOAD_MAX_MB`
- `NEXT_PUBLIC_UPLOAD_MAX_MB`

Rekomendasi pengisian:

- `DATABASE_URL`: pakai pooled connection string dari Supabase
- `DIRECT_DATABASE_URL`: pakai direct connection string dari Supabase
- `SUPABASE_STORAGE_BUCKET`: `catalog-assets`
- `UPLOAD_MAX_MB`: `4`
- `NEXT_PUBLIC_UPLOAD_MAX_MB`: `4`

Catatan:
- Upload dibatasi 4MB agar aman untuk Server Action di Vercel.
- Jika ingin upload lebih besar, alurnya perlu diubah ke direct browser upload.

## 3. Pindahkan schema database ke Supabase

Set dulu env lokal ke Supabase, lalu jalankan:

```bash
npx prisma generate
npx prisma db push
```

Ini akan membuat tabel sesuai `prisma/schema.prisma`.

## 4. Pindahkan data database dari lokal ke Supabase

Jika kamu ingin membawa isi database lokal yang sekarang, export dulu dari PostgreSQL lokal:

```bash
pg_dump "postgresql://postgres:postgres@localhost:5432/web_katalog?schema=public" --clean --if-exists --no-owner --no-privileges > web_katalog.sql
```

Lalu import ke Supabase memakai `DIRECT_DATABASE_URL`:

```bash
psql "$DIRECT_DATABASE_URL" -f web_katalog.sql
```

Jika kamu belum punya `psql` atau `pg_dump`, kamu bisa import file SQL dari mesin yang sudah punya tool PostgreSQL.

## 5. Pindahkan uploads ke Supabase Storage

Repo ini sudah punya script sinkronisasi asset:

```bash
npm run supabase:assets
```

Script tersebut akan:

- membaca file dari `public/uploads`
- upload ke bucket `catalog-assets`
- mempertahankan path seperti `uploads/YY/MM/file.jpg`

Sebelum deploy, kamu juga bisa cek env dan koneksi dengan:

```bash
npm run supabase:check
```

Path ini sudah cocok dengan utilitas aplikasi di:

- `src/lib/storage/images.ts`
- `src/lib/utils.ts`

## 6. Deploy ke Vercel

1. Push repo ke GitHub
2. Import repo ke Vercel
3. Isi semua env yang ada di langkah 2
4. Deploy

Build command yang dipakai project ini sekarang:

```bash
npm run build
```

Dan script build sudah menjalankan:

```bash
prisma generate && next build
```

## 7. Verifikasi setelah deploy

Cek hal berikut:

- halaman publik terbuka
- admin login berhasil
- daftar produk tampil
- gambar lama muncul dari Supabase
- upload produk baru berhasil
- halaman [robots.txt](/robots.txt) dan [sitemap.xml](/sitemap.xml) aktif

## 8. Catatan penting

- Folder `public/uploads` tidak perlu dibawa ke Vercel setelah semua asset tersinkron ke Supabase.
- File `.env` dan `.env.local` lokal tidak ikut ke GitHub; env production harus diisi di dashboard Vercel.
- Jika deploy pertama gagal karena env belum lengkap, isi env dulu lalu redeploy.
