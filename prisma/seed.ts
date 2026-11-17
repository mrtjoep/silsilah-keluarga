/**
 * Seed data contoh: Keluarga Besar Wiryo Sudarmo (5 generasi, 27 anggota)
 * Mencakup: pernikahan kedua setelah pasangan wafat, perceraian + menikah lagi,
 * anak angkat, dan orang tua tunggal.
 *
 * Akun contoh (KHUSUS UNTUK PENGEMBANGAN LOKAL):
 *   admin@contoh.id  / password123  (Admin)
 *   editor@contoh.id / password123  (Editor)
 *   viewer@contoh.id / password123  (Viewer)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type P = {
  key: string;
  fullName: string;
  nickname?: string;
  gender: "MALE" | "FEMALE";
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  occupation?: string;
  bio?: string;
  phone?: string;
};

const people: P[] = [
  // Generasi 1
  { key: "wiryo", fullName: "Raden Wiryo Sudarmo", nickname: "Mbah Wiryo", gender: "MALE", birthDate: "1900-03-12", birthPlace: "Yogyakarta", deathDate: "1975-09-02", deathPlace: "Yogyakarta", occupation: "Petani & Lurah Desa", bio: "Lurah Desa Sidomulyo selama 20 tahun. Dikenal tegas namun penyayang, beliau membangun rumah joglo keluarga yang kini menjadi tempat berkumpul setiap Lebaran." },
  { key: "aminah", fullName: "Siti Aminah", nickname: "Mbah Putri", gender: "FEMALE", birthDate: "1905-07-21", birthPlace: "Klaten", deathDate: "1980-01-15", deathPlace: "Yogyakarta", occupation: "Pedagang batik", bio: "Membuka usaha batik tulis kecil yang menghidupi keluarga di masa sulit." },
  // Generasi 2
  { key: "bambang", fullName: "Bambang Wiryo Atmojo", nickname: "Pakde Bambang", gender: "MALE", birthDate: "1925-05-10", birthPlace: "Yogyakarta", deathDate: "1995-11-20", deathPlace: "Semarang", occupation: "Guru SMA" },
  { key: "sri", fullName: "Sri Rahayu", gender: "FEMALE", birthDate: "1930-02-14", birthPlace: "Solo", deathDate: "2010-06-30", deathPlace: "Semarang", occupation: "Bidan" },
  { key: "kartini", fullName: "Kartini Wiryo", nickname: "Bude Tini", gender: "FEMALE", birthDate: "1928-04-21", birthPlace: "Yogyakarta", deathDate: "2005-08-17", deathPlace: "Bandung", occupation: "Penjahit" },
  { key: "ahmad", fullName: "Ahmad Hidayat", gender: "MALE", birthDate: "1925", birthPlace: "Bandung", deathDate: "1990", deathPlace: "Bandung", occupation: "Pegawai kereta api" },
  { key: "joko", fullName: "Joko Wiryo Santoso", nickname: "Pakde Joko", gender: "MALE", birthDate: "1932-12-01", birthPlace: "Yogyakarta", deathDate: "2000-03-03", deathPlace: "Surabaya", occupation: "Tentara", bio: "Menikah dua kali. Istri pertamanya, Lestari, wafat muda; beliau kemudian menikah dengan Wulan." },
  { key: "lestari", fullName: "Lestari Ningsih", gender: "FEMALE", birthDate: "1935-06-06", birthPlace: "Magelang", deathDate: "1960-10-10", deathPlace: "Surabaya" },
  { key: "wulan", fullName: "Wulan Sari Dewi", gender: "FEMALE", birthDate: "1938-09-09", birthPlace: "Malang", deathDate: "2015-04-04", deathPlace: "Surabaya", occupation: "Pemilik warung makan" },
  // Generasi 3
  { key: "agus", fullName: "Agus Setiawan", gender: "MALE", birthDate: "1952-08-17", birthPlace: "Semarang", deathDate: "2020-12-12", deathPlace: "Jakarta", occupation: "Insinyur sipil" },
  { key: "dewi", fullName: "Dewi Lestari", nickname: "Bu Dewi", gender: "FEMALE", birthDate: "1955-01-25", birthPlace: "Jakarta", occupation: "Pensiunan guru", phone: "0812-0000-0001" },
  { key: "rina", fullName: "Rina Wulandari", nickname: "Tante Rina", gender: "FEMALE", birthDate: "1958-11-30", birthPlace: "Semarang", occupation: "Dokter gigi" },
  { key: "hendra", fullName: "Hendra Gunawan", gender: "MALE", birthDate: "1956-03-03", birthPlace: "Medan", occupation: "Pengusaha" },
  { key: "yusuf", fullName: "Yusuf Hakim", gender: "MALE", birthDate: "1960-07-07", birthPlace: "Makassar", occupation: "Dosen" },
  { key: "budi", fullName: "Budi Hidayat", gender: "MALE", birthDate: "1950-10-05", birthPlace: "Bandung", occupation: "Wiraswasta" },
  { key: "ratna", fullName: "Ratna Sari", gender: "FEMALE", birthDate: "1953-12-24", birthPlace: "Bogor" },
  { key: "sari", fullName: "Sari Wiryo Santoso", gender: "FEMALE", birthDate: "1958-02-02", birthPlace: "Surabaya", occupation: "Perawat" },
  { key: "teguh", fullName: "Teguh Wiryo Santoso", gender: "MALE", birthDate: "1965-06-15", birthPlace: "Surabaya", occupation: "Nelayan & pengusaha ikan" },
  // Generasi 4
  { key: "andi", fullName: "Andi Setiawan", gender: "MALE", birthDate: "1980-04-10", birthPlace: "Jakarta", occupation: "Programmer" },
  { key: "maya", fullName: "Maya Putri", gender: "FEMALE", birthDate: "1983-09-19", birthPlace: "Bandung", occupation: "Desainer" },
  { key: "nadia", fullName: "Nadia Setiawan", gender: "FEMALE", birthDate: "1985-12-05", birthPlace: "Jakarta", occupation: "Akuntan" },
  { key: "fajar", fullName: "Fajar Gunawan", gender: "MALE", birthDate: "1984-01-01", birthPlace: "Semarang", occupation: "Fotografer" },
  { key: "lala", fullName: "Lala Hakim", gender: "FEMALE", birthDate: "1998-05-20", birthPlace: "Makassar", occupation: "Mahasiswa", bio: "Diangkat sebagai anak oleh Rina dan Yusuf sejak bayi." },
  { key: "rizky", fullName: "Rizky Hidayat", gender: "MALE", birthDate: "1978-08-08", birthPlace: "Bandung", occupation: "Pilot" },
  // Generasi 5
  { key: "kenzo", fullName: "Kenzo Setiawan", gender: "MALE", birthDate: "2010-11-11", birthPlace: "Jakarta" },
  { key: "aisyah", fullName: "Aisyah Setiawan", gender: "FEMALE", birthDate: "2014-03-27", birthPlace: "Jakarta" },
  { key: "arka", fullName: "Arka Hidayat", gender: "MALE", birthDate: "2008-07-14", birthPlace: "Bandung" },
];

// [ayah/ibu, anak, tipe]
const parentLinks: [string, string, string?][] = [
  ["wiryo", "bambang"], ["aminah", "bambang"],
  ["wiryo", "kartini"], ["aminah", "kartini"],
  ["wiryo", "joko"], ["aminah", "joko"],
  ["bambang", "agus"], ["sri", "agus"],
  ["bambang", "rina"], ["sri", "rina"],
  ["kartini", "budi"], ["ahmad", "budi"],
  ["joko", "sari"], ["lestari", "sari"],
  ["joko", "teguh"], ["wulan", "teguh"],
  ["agus", "andi"], ["dewi", "andi"],
  ["agus", "nadia"], ["dewi", "nadia"],
  ["rina", "fajar"], ["hendra", "fajar"],
  ["rina", "lala", "ADOPTED"], ["yusuf", "lala", "ADOPTED"],
  ["budi", "rizky"], ["ratna", "rizky"],
  ["andi", "kenzo"], ["maya", "kenzo"],
  ["andi", "aisyah"], ["maya", "aisyah"],
  ["rizky", "arka"],
];

// [pasangan1, pasangan2, status, tanggal nikah, tanggal berakhir]
const unions: [string, string, string, string?, string?][] = [
  ["wiryo", "aminah", "WIDOWED", "1922-06-01", "1975-09-02"],
  ["bambang", "sri", "WIDOWED", "1950-02-20", "1995-11-20"],
  ["ahmad", "kartini", "WIDOWED", "1948", "1990"],
  ["joko", "lestari", "WIDOWED", "1956-05-05", "1960-10-10"],
  ["joko", "wulan", "MARRIED", "1963-08-08"],
  ["agus", "dewi", "WIDOWED", "1978-07-07", "2020-12-12"],
  ["hendra", "rina", "DIVORCED", "1982-03-14", "1990-09-01"],
  ["yusuf", "rina", "MARRIED", "1995-10-10"],
  ["budi", "ratna", "MARRIED", "1975"],
  ["andi", "maya", "MARRIED", "2008-12-20"],
];

async function main() {
  // Pengaman: seed MENGHAPUS SEMUA DATA. Di PostgreSQL (produksi) wajib konfirmasi eksplisit.
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres") && process.env.SEED_CONFIRM !== "ya") {
    console.error("Database PostgreSQL terdeteksi. Seed akan MENGHAPUS SEMUA DATA.");
    console.error('Jika yakin, jalankan ulang dengan SEED_CONFIRM=ya');
    process.exit(1);
  }
  console.log("Menghapus data lama...");
  await prisma.treeAccess.deleteMany();
  await prisma.familyTree.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const [admin, editor, viewer] = await Promise.all([
    prisma.user.create({ data: { name: "Admin Keluarga", email: "admin@contoh.id", passwordHash } }),
    prisma.user.create({ data: { name: "Editor Keluarga", email: "editor@contoh.id", passwordHash } }),
    prisma.user.create({ data: { name: "Tamu Keluarga", email: "viewer@contoh.id", passwordHash } }),
  ]);

  const tree = await prisma.familyTree.create({
    data: {
      name: "Keluarga Besar Wiryo Sudarmo",
      description: "Silsilah keturunan Raden Wiryo Sudarmo dan Siti Aminah dari Yogyakarta.",
      isPublic: true,
      publicSlug: "keluarga-wiryo-demo",
      hideLivingInPublic: true,
      accesses: {
        create: [
          { userId: admin.id, role: "ADMIN" },
          { userId: editor.id, role: "EDITOR" },
          { userId: viewer.id, role: "VIEWER" },
        ],
      },
    },
  });

  const ids: Record<string, string> = {};
  for (const p of people) {
    const { key, ...rest } = p;
    const created = await prisma.person.create({
      data: { ...rest, treeId: tree.id, isDeceased: !!p.deathDate },
    });
    ids[key] = created.id;
  }

  for (const [parent, child, type] of parentLinks) {
    await prisma.parentChild.create({ data: { parentId: ids[parent], childId: ids[child], type: type ?? "BIOLOGICAL" } });
  }
  for (const [a, b, status, marriageDate, endDate] of unions) {
    await prisma.union.create({
      data: { treeId: tree.id, partner1Id: ids[a], partner2Id: ids[b], status, marriageDate, endDate },
    });
  }

  await prisma.lifeEvent.createMany({
    data: [
      { personId: ids.wiryo, date: "1930", title: "Menjadi Lurah Desa Sidomulyo" },
      { personId: ids.wiryo, date: "1938", title: "Membangun rumah joglo keluarga" },
      { personId: ids.bambang, date: "1955", title: "Mulai mengajar di SMA Negeri 1 Semarang" },
      { personId: ids.agus, date: "1976", title: "Lulus Teknik Sipil UGM" },
      { personId: ids.andi, date: "2002", title: "Lulus Ilmu Komputer UI" },
      { personId: ids.rizky, date: "2001", title: "Menyelesaikan sekolah penerbang" },
    ],
  });

  console.log(`Selesai: ${people.length} anggota, ${parentLinks.length} relasi orang tua-anak, ${unions.length} pasangan.`);
  console.log("Login: admin@contoh.id / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
