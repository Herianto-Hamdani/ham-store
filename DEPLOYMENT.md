# Deployment Checklist

Dokumen ini merangkum langkah deploy ke server dengan dua opsi: non‑Docker (PM2 + Nginx) atau Docker (Postgres terpisah).

## 1) Konfigurasi Environment (Wajib)

Buat file env di server (misalnya `.env.production`) dengan nilai produksi.

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/web_katalog?schema=public"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/web_katalog?schema=public"
APP_URL="https://domain-anda.com"
APP_URL_SECRET="ganti_dengan_secret_panjang"

NEXT_PUBLIC_SUPABASE_URL=""
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_STORAGE_BUCKET="catalog-assets"
```

Catatan:
- `APP_URL` wajib https saat produksi.
- `APP_URL_SECRET` harus random panjang (min 32+ karakter).
- Kalau memakai Supabase Storage, isi `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
- Jika tidak pakai Supabase, upload akan tersimpan di `public/uploads`, pastikan folder ini bisa ditulis oleh proses Node.

## 2) Setup Database (PostgreSQL)

Pastikan Postgres tersedia dan buat database `web_katalog`.

Contoh:
```
CREATE DATABASE web_katalog;
CREATE USER web_katalog_user WITH PASSWORD 'password_kuat';
GRANT ALL PRIVILEGES ON DATABASE web_katalog TO web_katalog_user;
```

Lalu jalankan:
```
npx prisma generate
npx prisma db push
```

## 3) Deploy Tanpa Docker (PM2 + Nginx)

1. Install Node.js (disarankan 20 LTS atau 22 LTS).
2. Install dependency:
   ```
   npm ci
   ```
3. Build:
   ```
   npm run build
   ```
4. Jalankan dengan PM2:
   ```
   npx pm2 start npm --name web-katalog -- run start
   npx pm2 save
   ```
5. Nginx reverse proxy ke `http://127.0.0.1:3000`.

## 4) Deploy Dengan Docker (Postgres Terpisah)

Repo ini sudah punya `docker-compose.yml` untuk Postgres dan Adminer.
Langkah ringkas:
1. Jalankan Postgres:
   ```
   docker compose up -d postgres
   ```
2. Jalankan app Node secara terpisah (PM2 atau `npm run start`).

Jika ingin app juga di‑dockerize, saya bisa siapkan Dockerfile + docker-compose produksi.

## 5) Storage Upload

Jika tidak memakai Supabase, pastikan:
- `public/uploads` bisa ditulis.
- Volume/backup disiapkan agar file upload tidak hilang saat deploy ulang.

## 6) Cek Pasca Deploy

- `GET /robots.txt`
- `GET /sitemap.xml`
- Admin login dan CRUD produk
- Upload gambar produk (thumb & master)

## 7) Setup Laptop Baru (Script)

Script otomatis ada di `scripts/setup-new-machine.ps1`.

Contoh penggunaan:

```
# Tanpa restore database
powershell -ExecutionPolicy Bypass -File scripts\setup-new-machine.ps1

# Restore database dari pgdata.tar.gz (wajib Docker)
powershell -ExecutionPolicy Bypass -File scripts\setup-new-machine.ps1 -RestoreDb
```

Catatan:
- Taruh `pgdata.tar.gz` di root project sebelum pakai `-RestoreDb`.
- Jika ingin skip Docker (hanya install dependency), jalankan:
  ```
  powershell -ExecutionPolicy Bypass -File scripts\setup-new-machine.ps1 -SkipDocker
  ```
