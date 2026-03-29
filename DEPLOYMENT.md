# Deployment Checklist

Dokumen ini merangkum langkah deploy ke server dengan dua opsi:

- non-Docker (PM2 + Nginx)
- Docker untuk PostgreSQL

Jika target deploy kamu adalah Vercel + Supabase, pakai panduan khusus di [VERCEL_SUPABASE.md](./VERCEL_SUPABASE.md).

## 1) Konfigurasi Environment

Buat file env di server, misalnya `.env.production`.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/web_katalog?schema=public"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/web_katalog?schema=public"
APP_URL="https://domain-anda.com"
APP_URL_SECRET="ganti_dengan_secret_panjang"

NEXT_PUBLIC_SUPABASE_URL=""
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_STORAGE_BUCKET="catalog-assets"
UPLOAD_MAX_MB=""
NEXT_PUBLIC_UPLOAD_MAX_MB=""
```

Catatan:

- `APP_URL` wajib `https` saat produksi.
- `APP_URL_SECRET` sebaiknya random panjang, minimal 32 karakter.
- Jika memakai Supabase Storage, isi semua env Supabase.
- Jika tidak memakai Supabase, upload tetap akan ditulis ke `public/uploads`.

## 2) Setup Database PostgreSQL

Pastikan PostgreSQL tersedia dan buat database `web_katalog`.

Contoh:

```sql
CREATE DATABASE web_katalog;
CREATE USER web_katalog_user WITH PASSWORD 'password_kuat';
GRANT ALL PRIVILEGES ON DATABASE web_katalog TO web_katalog_user;
```

Lalu jalankan:

```bash
npx prisma generate
npx prisma db push
```

## 3) Deploy Tanpa Docker

1. Install Node.js 20 LTS atau 22 LTS
2. Install dependency:

```bash
npm ci
```

3. Build:

```bash
npm run build
```

4. Jalankan dengan PM2:

```bash
npx pm2 start npm --name web-katalog -- run start
npx pm2 save
```

5. Arahkan Nginx ke `http://127.0.0.1:3000`

## 4) Deploy Dengan Docker

Repo ini sudah punya `docker-compose.yml` untuk Postgres dan Adminer.

Langkah ringkas:

```bash
docker compose up -d postgres
```

Lalu jalankan app Node secara terpisah dengan PM2 atau `npm run start`.

## 5) Storage Upload

Jika tidak memakai Supabase:

- pastikan `public/uploads` bisa ditulis
- siapkan backup atau volume agar file upload tidak hilang saat redeploy

Jika memakai Supabase:

- buat bucket public `catalog-assets`
- isi env Supabase
- sinkronkan asset lama dengan:

```bash
npm run supabase:assets
```

## 6) Cek Pasca Deploy

Periksa:

- `GET /robots.txt`
- `GET /sitemap.xml`
- admin login
- CRUD produk
- upload gambar produk
- tampilan gambar di publik

## 7) Setup Laptop Baru

Script otomatis ada di `scripts/setup-new-machine.ps1`.

Contoh:

```bash
# Tanpa restore database
powershell -ExecutionPolicy Bypass -File scripts\setup-new-machine.ps1

# Restore database dari pgdata.tar.gz
powershell -ExecutionPolicy Bypass -File scripts\setup-new-machine.ps1 -RestoreDb
```

Catatan:

- taruh `pgdata.tar.gz` di root project sebelum pakai `-RestoreDb`
- jika ingin skip Docker, jalankan:

```bash
powershell -ExecutionPolicy Bypass -File scripts\setup-new-machine.ps1 -SkipDocker
```
