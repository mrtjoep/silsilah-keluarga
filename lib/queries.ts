import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { FamilyData, Gender, ParentType, PersonLite, UnionStatus } from "@/types";

const personSelect = {
  id: true,
  fullName: true,
  nickname: true,
  gender: true,
  birthDate: true,
  birthPlace: true,
  isDeceased: true,
  deathDate: true,
  deathPlace: true,
  occupation: true,
  photoPath: true,
} as const;

/** Sembunyikan data pribadi anggota yang masih hidup (untuk tampilan publik). */
export function redactLiving(p: PersonLite): PersonLite {
  if (p.isDeceased) return p;
  return {
    ...p,
    fullName: "Anggota keluarga (masih hidup)",
    nickname: null,
    birthDate: null,
    birthPlace: null,
    occupation: null,
    photoPath: null,
    isPrivate: true,
  };
}

export const getFamilyData = cache(async (treeId: string, opts?: { redact?: boolean }): Promise<FamilyData> => {
  const [persons, parentLinks, unions] = await Promise.all([
    prisma.person.findMany({ where: { treeId }, select: personSelect, orderBy: { birthDate: "asc" } }),
    prisma.parentChild.findMany({ where: { child: { treeId } }, select: { id: true, parentId: true, childId: true, type: true } }),
    prisma.union.findMany({
      where: { treeId },
      select: { id: true, partner1Id: true, partner2Id: true, status: true, marriageDate: true, endDate: true },
    }),
  ]);
  const lite: PersonLite[] = persons.map((p) => ({ ...p, gender: p.gender as Gender }));
  return {
    persons: opts?.redact ? lite.map(redactLiving) : lite,
    parentLinks: parentLinks.map((l) => ({ ...l, type: l.type as ParentType })),
    unions: unions.map((u) => ({ ...u, status: u.status as UnionStatus })),
  };
});

export const getTree = cache(async (treeId: string) => prisma.familyTree.findUnique({ where: { id: treeId } }));
