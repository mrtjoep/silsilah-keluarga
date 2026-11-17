import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ancestorDepths, buildIndex, descendantDepths, wouldCreateCycle } from "@/lib/family";
import type { ParentType, UnionStatus } from "@/types";

export class RelationError extends Error {}

type Tx = Prisma.TransactionClient;

async function loadIndex(treeId: string) {
  // tanpa cache React: data harus segar saat validasi
  const [persons, parentLinks, unions] = await Promise.all([
    prisma.person.findMany({ where: { treeId } }),
    prisma.parentChild.findMany({ where: { child: { treeId } } }),
    prisma.union.findMany({ where: { treeId } }),
  ]);
  return buildIndex({
    persons: persons.map((p) => ({ ...p, gender: p.gender as never })),
    parentLinks: parentLinks.map((l) => ({ ...l, type: l.type as ParentType })),
    unions: unions.map((u) => ({ ...u, status: u.status as UnionStatus })),
  });
}

export async function linkParent(
  treeId: string,
  parentId: string,
  childId: string,
  type: ParentType = "BIOLOGICAL",
  tx: Tx = prisma,
) {
  const idx = await loadIndex(treeId);
  const parent = idx.byId.get(parentId);
  const child = idx.byId.get(childId);
  if (!parent || !child) throw new RelationError("Anggota tidak ditemukan di pohon ini.");
  if (parentId === childId) throw new RelationError("Seseorang tidak bisa menjadi orang tua dirinya sendiri.");
  if ((idx.parents.get(childId) ?? []).some((l) => l.parentId === parentId))
    throw new RelationError("Relasi orang tua-anak ini sudah ada.");
  if (wouldCreateCycle(idx, parentId, childId))
    throw new RelationError(`${parent.fullName} adalah keturunan ${child.fullName}, sehingga tidak bisa menjadi orang tuanya.`);
  if (type === "BIOLOGICAL") {
    const bio = (idx.parents.get(childId) ?? []).filter((l) => l.type === "BIOLOGICAL");
    if (bio.length >= 2) throw new RelationError(`${child.fullName} sudah memiliki 2 orang tua kandung. Gunakan jenis "Angkat", "Tiri", atau "Asuh".`);
  }
  return tx.parentChild.create({ data: { parentId, childId, type } });
}

export async function linkSpouse(
  treeId: string,
  aId: string,
  bId: string,
  status: UnionStatus = "MARRIED",
  marriageDate: string | null = null,
  tx: Tx = prisma,
) {
  const idx = await loadIndex(treeId);
  const a = idx.byId.get(aId);
  const b = idx.byId.get(bId);
  if (!a || !b) throw new RelationError("Anggota tidak ditemukan di pohon ini.");
  if (aId === bId) throw new RelationError("Seseorang tidak bisa menjadi pasangan dirinya sendiri.");
  const existing = (idx.unions.get(aId) ?? []).filter((u) => u.partner1Id === bId || u.partner2Id === bId);
  if (existing.some((u) => u.status === "MARRIED"))
    throw new RelationError("Keduanya sudah tercatat sebagai pasangan yang menikah.");
  if (ancestorDepths(idx, aId).has(bId) || descendantDepths(idx, aId).has(bId))
    throw new RelationError("Pasangan tidak boleh leluhur atau keturunan langsung.");
  // urutkan agar laki-laki menjadi partner1 (konsisten untuk GEDCOM HUSB/WIFE)
  const [p1, p2] = b.gender === "MALE" && a.gender !== "MALE" ? [bId, aId] : [aId, bId];
  return tx.union.create({ data: { treeId, partner1Id: p1, partner2Id: p2, status, marriageDate } });
}
