# 🌳 Silsilah Keluarga

Aplikasi web untuk mencatat, memvisualisasikan, dan membagikan silsilah keluarga lintas generasi.
Antarmuka berbahasa Indonesia, ramah untuk orang tua/lansia (font 18px, tombol besar, kontras baik), responsif, dan mendukung mode gelap.

## Fitur

| Area | Fitur |
|---|---|
| **Anggota** | Tambah, ubah, dan hapus anggota: nama, panggilan, jenis kelamin, tanggal lahir/wafat (boleh hanya tahun), tempat, pekerjaan, foto, biografi, kontak |
| **Relasi** | Orang tua–anak (kandung/angkat/tiri/asuh), pasangan (menikah/bercerai/berpisah/ditinggal wafat), banyak pasangan, pernikahan kedua. Saudara kandung dan seayah/seibu terdeteksi otomatis. Validasi mencegah siklus dan lebih dari 2 orang tua kandung |
| **Pohon interaktif** | React Flow + ELK: tampilan vertikal/horizontal, zoom, geser, minimap, panel detail, mode fokus (leluhur + keturunan), warna berdasarkan jenis kelamin dan status wafat, unduh PNG/PDF |
| **Profil** | Detail lengkap, relasi yang dikelompokkan per pasangan, timeline hidup otomatis + peristiwa tambahan |
| **Pencarian** | Nama/panggilan, filter generasi, rentang tahun lahir, tempat lahir, dan status |
| **Tambahan** | Kalender ulang tahun dan peringatan wafat, kalkulator hubungan (paman, sepupu, ipar, mertua, besan, …), statistik keluarga |
| **Data** | Ekspor JSON dan GEDCOM 5.5.1; impor GEDCOM atau CSV |
| **Kolaborasi** | Peran Admin, Editor, dan Penonton per pohon; tautan publik read-only yang bisa diaktifkan/nonaktifkan/diganti; opsi menyembunyikan data anggota yang masih hidup |

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 + shadcn/ui (Base UI) · Prisma 6 + SQLite · Auth.js (NextAuth v5, email + kata sandi) · Zod · React Flow + elkjs · next-intl · sharp · html-to-image + jsPDF

## Instalasi & menjalankan (lokal)

Prasyarat: **Node.js ≥ 20.14** (disarankan 20.19+ atau 22 LTS) dan npm.

```bash
npm install
```

```bash
cp .env.example .env
```

Isi `AUTH_SECRET` di `.env` dengan string acak, misalnya hasil dari perintah ini:

```bash
openssl rand -base64 32
```

Lalu buat database dan isi data contoh:

```bash
npx prisma migrate dev
```

```bash
npm run db:seed
```

Jalankan server:

```bash
npm run dev
```

Buka http://localhost:3000. Data contoh berisi **Keluarga Besar Wiryo Sudarmo** (5 generasi, 27 anggota, termasuk perceraian, pernikahan kedua, dan anak angkat).

| Akun demo (khusus lokal) | Kata sandi | Peran |
|---|---|---|
| admin@contoh.id | password123 | Admin |
| editor@contoh.id | password123 | Editor |
| viewer@contoh.id | password123 | Penonton |

Tautan publik contoh: http://localhost:3000/share/keluarga-wiryo-demo

### Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` / `npm start` | Build dan jalankan versi produksi |
| `npm test` | Unit test (kalkulator hubungan, generasi, GEDCOM, CSV, tanggal) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:seed` | Isi ulang data contoh (menghapus semua data!) |
| `npm run db:reset` | Reset database + migrasi + seed |
| `npm run db:pg:schema` | Perbarui `prisma/postgres/schema.prisma` dari skema SQLite |
| `npm run db:pg:migrate` | Buat migrasi PostgreSQL baru (butuh database Postgres pengembangan) |
| `npm run db:pg:seed` | Seed ke PostgreSQL (wajib `SEED_CONFIRM=ya`) |

## Struktur folder

```
app/
  (auth)/login, register        Halaman masuk & daftar
  (app)/trees/                  Daftar pohon (perlu login)
    [treeId]/                   Pohon interaktif
      members/                  Daftar + pencarian, new, [personId] (profil), [personId]/edit
      calendar, relationship, stats, data (impor/ekspor), settings (berbagi & akses)
  share/[slug]/                 Tampilan publik read-only
  api/                          auth, foto, ekspor JSON/GEDCOM, session-expired
components/  ui/ (shadcn), tree/, person/, forms/, settings/, layout/
lib/
  actions/                      Server actions (auth, tree, person, relation, data, locale)
  validations/                  Skema Zod
  family.ts                     Graf keluarga: saudara, leluhur, generasi, fokus, cek siklus
  kinship.ts                    Kalkulator hubungan (istilah Indonesia)
  tree-layout.ts                Data → node/edge React Flow + layout ELK
  gedcom.ts                     Ekspor/impor GEDCOM & CSV
  permissions.ts                Pengecekan peran di server
  storage.ts                    Validasi & penyimpanan foto (disk lokal / Vercel Blob)
scripts/postgres-schema.mjs     Menghasilkan skema PostgreSQL dari skema SQLite
i18n/, messages/                next-intl (id.json, en.json)
prisma/                         schema.prisma + migrations (SQLite), seed.ts
  postgres/                     schema.prisma (dihasilkan) + migrations (PostgreSQL)
tests/                          Unit test (node:test + tsx)
```

## Skema database

- `User` ←→ `FamilyTree` melalui `TreeAccess` (peran per pohon).
- `Person`: data anggota. Tanggal disimpan sebagai teks parsial `YYYY` / `YYYY-MM` / `YYYY-MM-DD`.
- `ParentChild`: relasi orang tua–anak per individu, dengan `type` BIOLOGICAL/ADOPTED/STEP/FOSTER. Anak angkat, anak tiri, dan orang tua tunggal tertangani tanpa kasus khusus.
- `Union`: pasangan dengan status dan tanggal. Satu orang bisa memiliki banyak Union.
- `LifeEvent`: peristiwa tambahan pada timeline.
- Saudara dan generasi **tidak disimpan**, melainkan dihitung dari graf.

Nilai "enum" disimpan sebagai `String` yang divalidasi Zod, agar skema sama untuk SQLite dan PostgreSQL.

## Keamanan

- Setiap server action dan route memeriksa peran di server (`assertTreeRole`), bukan hanya disembunyikan di UI. Middleware melindungi `/trees/*`.
- Semua input divalidasi dengan Zod. React meng-escape output secara default, dan tidak ada `dangerouslySetInnerHTML`.
- Foto: maksimal 2 MB, jenis dideteksi dari *magic bytes* (bukan ekstensi), lalu di-encode ulang ke WebP 600×600 dengan `sharp` (metadata EXIF/GPS dibuang). Nama file berupa UUID acak. Foto selalu disajikan lewat `/api/photos/…`, sehingga store Vercel Blob bisa dibuat Private.
- Kata sandi di-hash dengan bcrypt, dan redirect setelah login hanya ke path internal.
- Privasi tautan publik diterapkan di server: data anggota yang masih hidup tidak pernah dikirim ke browser. Halaman publik memakai `noindex`.
- Header keamanan dasar (`X-Frame-Options`, `nosniff`, `Referrer-Policy`) diatur di `next.config.ts`.

**Belum ada:** pembatasan percobaan login (rate limit), verifikasi email, dan reset kata sandi. Tambahkan sebelum dipakai publik secara luas.

## Menambah bahasa

1. Tambahkan kode bahasa ke `locales` di `i18n/config.ts`.
2. Salin `messages/id.json` menjadi `messages/<kode>.json` lalu terjemahkan nilainya.
3. Tambahkan label di `components/layout/locale-switcher.tsx`.

Bahasa dipilih lewat cookie, tanpa prefix URL. Catatan: label kalkulator hubungan dan pesan validasi Zod saat ini masih berbahasa Indonesia.

## Deploy ke Vercel

Proyek ini sudah siap untuk Vercel **tanpa mengubah kode**. Lokal tetap memakai SQLite + disk; di Vercel otomatis memakai PostgreSQL + Vercel Blob.

| | Lokal (`npm run dev`) | Vercel |
|---|---|---|
| Database | SQLite, `prisma/schema.prisma` | PostgreSQL, `prisma/postgres/schema.prisma` (dihasilkan otomatis) |
| Migrasi | `prisma/migrations/` | `prisma/postgres/migrations/` (dijalankan otomatis saat build) |
| Foto | `storage/uploads/` | Vercel Blob (aktif bila `BLOB_READ_WRITE_TOKEN` ada) |

### Langkah

1. **Push ke GitHub.**
2. Di vercel.com pilih **Add New → Project**, lalu impor repositori. Next.js terdeteksi otomatis. Vercel memakai script `vercel-build`, jadi *Build Command* tidak perlu diubah.
3. **Database:** di tab **Storage → Create Database → Neon (Postgres)**, hubungkan ke proyek. `DATABASE_URL` dan `DATABASE_URL_UNPOOLED` terisi otomatis.
   Jika memakai Postgres lain, isi kedua variabel itu sendiri. Bila tidak ada pooler, isi keduanya dengan URL yang sama.
4. **Foto:** di tab **Storage → Create → Blob**, pilih akses **Private**, lalu hubungkan ke proyek. Vercel otomatis mengisi `BLOB_STORE_ID` (atau `BLOB_READ_WRITE_TOKEN` pada store lama); keduanya dikenali.
   Jika store dibuat **Public**, tambahkan variabel `BLOB_ACCESS=public`.
5. **Environment variables** (Settings → Environment Variables):

   | Nama | Nilai |
   |---|---|
   | `AUTH_SECRET` | string acak baru, misalnya dari `openssl rand -base64 32` |
   | `AUTH_TRUST_HOST` | `true` |

6. Klik **Deploy**. Saat build, `vercel-build` memeriksa skema Postgres sinkron, menjalankan `prisma generate`, menjalankan `prisma migrate deploy` (membuat tabel), lalu `next build`.
7. Buka situs dan **daftar akun sendiri** lewat halaman Daftar. Akun pertama yang membuat pohon otomatis menjadi Admin pohon itu.

**(Opsional) Data contoh di produksi.** Seed menghapus semua data, sehingga di PostgreSQL wajib dikonfirmasi:

```bash
DATABASE_URL="<url neon>" SEED_CONFIRM=ya npm run db:pg:seed
```

Akun demo (`password123`) sebaiknya **tidak** dipakai di produksi.

### Bila skema database diubah

1. Ubah model di `prisma/schema.prisma`.
2. Jalankan migrasi lokal dengan `npm run db:migrate`.
3. Buat migrasi PostgreSQL dengan `npm run db:pg:migrate`. Perintah ini perlu `DATABASE_URL` dan `DATABASE_URL_UNPOOLED` yang mengarah ke database Postgres **pengembangan**, misalnya branch Neon, bukan produksi.
4. Commit kedua folder migrasi. Build Vercel akan gagal dengan pesan yang jelas bila `prisma/postgres/schema.prisma` lupa diperbarui.

### Batasan Vercel

- Ukuran request maksimal 4,5 MB. Foto (maks. 2 MB) aman, tetapi berkas impor GEDCOM/CSV di atas ~4 MB perlu dipecah.
- Fungsi serverless dibatasi waktu eksekusi. Impor ribuan anggota sekaligus bisa melewati batas paket gratis.

**Alternatif tanpa Vercel:** jalankan di VPS atau Docker dengan volume persisten untuk `prisma/dev.db` dan `storage/uploads`, lalu `npm run build && npm start`.

## Format impor CSV

```csv
id,fullName,nickname,gender,birthDate,birthPlace,deathDate,deathPlace,occupation,fatherId,motherId,spouseId
1,Budi Santoso,Pak Budi,L,1950-08-17,Yogyakarta,2010-01-02,Yogyakarta,Guru,,,2
2,Siti Aminah,,P,1955,Solo,,,,,,1
3,Andi Santoso,,L,1980-05-05,Jakarta,,,Dokter,1,2,
```

Hanya `fullName` yang wajib diisi. Pemisah `,` atau `;` dikenali otomatis. Baris yang tidak valid dilewati dan jumlahnya dilaporkan.
