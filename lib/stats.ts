import { buildIndex, computeGenerations } from "@/lib/family";
import { ageBetween } from "@/lib/dates";
import type { FamilyData } from "@/types";

export function familyStats(data: FamilyData) {
  const idx = buildIndex(data);
  const gens = computeGenerations(idx);
  const persons = data.persons;
  const living = persons.filter((p) => !p.isDeceased);
  const deceased = persons.filter((p) => p.isDeceased);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const lifespans = deceased.map((p) => ageBetween(p.birthDate, p.deathDate)).filter((x): x is number => x !== null);
  const livingAges = living.map((p) => ageBetween(p.birthDate)).filter((x): x is number => x !== null);
  const genCount = new Map<number, number>();
  for (const g of gens.values()) genCount.set(g, (genCount.get(g) ?? 0) + 1);
  const placeCount = new Map<string, number>();
  for (const p of persons) if (p.birthPlace) placeCount.set(p.birthPlace, (placeCount.get(p.birthPlace) ?? 0) + 1);
  const parentsWithKids = new Set(data.parentLinks.map((l) => l.parentId));
  const oldestLiving = living
    .filter((p) => p.birthDate)
    .sort((a, b) => (a.birthDate ?? "").localeCompare(b.birthDate ?? ""))[0];

  return {
    total: persons.length,
    living: living.length,
    deceased: deceased.length,
    male: persons.filter((p) => p.gender === "MALE").length,
    female: persons.filter((p) => p.gender === "FEMALE").length,
    unknownGender: persons.filter((p) => p.gender === "UNKNOWN").length,
    generations: genCount.size ? Math.max(...genCount.keys()) : 0,
    avgLifespan: avg(lifespans),
    avgAgeLiving: avg(livingAges),
    marriages: data.unions.length,
    avgChildren: parentsWithKids.size ? Math.round((data.parentLinks.length / parentsWithKids.size) * 10) / 10 : null,
    byGeneration: [...genCount.entries()].sort((a, b) => a[0] - b[0]),
    topPlaces: [...placeCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    oldestLiving: oldestLiving ? { person: oldestLiving, age: ageBetween(oldestLiving.birthDate) } : null,
  };
}
