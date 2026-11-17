/**
 * Membuat prisma/postgres/schema.prisma dari prisma/schema.prisma (SQLite).
 * Model ditulis SATU kali di prisma/schema.prisma; skema PostgreSQL (untuk produksi/Vercel)
 * dihasilkan dari situ agar keduanya tidak pernah berbeda.
 *
 *   node scripts/postgres-schema.mjs           → tulis berkas
 *   node scripts/postgres-schema.mjs --check   → gagal bila berkas belum diperbarui
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

const SRC = "prisma/schema.prisma";
const OUT = "prisma/postgres/schema.prisma";

const src = readFileSync(SRC, "utf8");
const datasource = /datasource db \{[^}]*\}/m;
if (!datasource.test(src)) throw new Error(`Blok datasource tidak ditemukan di ${SRC}`);

const header = `// ⚠️ BERKAS INI DIHASILKAN OTOMATIS dari prisma/schema.prisma — jangan diedit langsung.
// Ubah prisma/schema.prisma lalu jalankan: npm run db:pg:schema
`;
const pg = `datasource db {
  provider  = "postgresql"
  // URL dengan connection pooling (dipakai aplikasi)
  url       = env("DATABASE_URL")
  // URL langsung tanpa pooler (dipakai migrasi). Isi sama dengan DATABASE_URL bila tidak memakai pooler.
  directUrl = env("DATABASE_URL_UNPOOLED")
}`;
const out = header + src.replace(datasource, pg);

if (process.argv.includes("--check")) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (cur !== out) {
    console.error(`${OUT} tidak sinkron. Jalankan: npm run db:pg:schema`);
    process.exit(1);
  }
  console.log(`${OUT} sinkron.`);
} else {
  mkdirSync("prisma/postgres", { recursive: true });
  writeFileSync(OUT, out);
  console.log(`Ditulis: ${OUT}`);
}
