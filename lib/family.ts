/**
 * Utilitas graf keluarga (murni, tanpa akses database) — dipakai di server & klien.
 */
import type { FamilyData, ParentLinkLite, PersonLite, UnionLite } from "@/types";
import { compareDates } from "@/lib/dates";

export interface FamilyIndex {
  byId: Map<string, PersonLite>;
  parents: Map<string, ParentLinkLite[]>; // childId -> links
  children: Map<string, ParentLinkLite[]>; // parentId -> links
  unions: Map<string, UnionLite[]>; // personId -> unions
  data: FamilyData;
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
}

export function buildIndex(data: FamilyData): FamilyIndex {
  const byId = new Map(data.persons.map((p) => [p.id, p]));
  const parents = new Map<string, ParentLinkLite[]>();
  const children = new Map<string, ParentLinkLite[]>();
  const unions = new Map<string, UnionLite[]>();
  for (const l of data.parentLinks) {
    if (!byId.has(l.parentId) || !byId.has(l.childId)) continue;
    push(parents, l.childId, l);
    push(children, l.parentId, l);
  }
  for (const u of data.unions) {
    if (!byId.has(u.partner1Id) || !byId.has(u.partner2Id)) continue;
    push(unions, u.partner1Id, u);
    push(unions, u.partner2Id, u);
  }
  return { byId, parents, children, unions, data };
}

export const parentIds = (idx: FamilyIndex, id: string) => (idx.parents.get(id) ?? []).map((l) => l.parentId);
export const childIds = (idx: FamilyIndex, id: string) => (idx.children.get(id) ?? []).map((l) => l.childId);
export const spouseIds = (idx: FamilyIndex, id: string) =>
  (idx.unions.get(id) ?? []).map((u) => (u.partner1Id === id ? u.partner2Id : u.partner1Id));

export function sortByBirth(idx: FamilyIndex, ids: string[]) {
  return [...ids].sort((a, b) => compareDates(idx.byId.get(a)?.birthDate, idx.byId.get(b)?.birthDate));
}

/** Saudara terdeteksi otomatis dari kesamaan orang tua. */
export function siblingsOf(idx: FamilyIndex, id: string) {
  const myParents = new Set(parentIds(idx, id));
  const full: string[] = [];
  const half: string[] = [];
  if (myParents.size === 0) return { full, half };
  const candidates = new Set<string>();
  for (const p of myParents) for (const c of childIds(idx, p)) if (c !== id) candidates.add(c);
  for (const c of candidates) {
    const theirs = new Set(parentIds(idx, c));
    const shared = [...myParents].filter((p) => theirs.has(p)).length;
    const isFull = shared >= 2 || (shared === myParents.size && shared === theirs.size);
    (isFull ? full : half).push(c);
  }
  return { full: sortByBirth(idx, full), half: sortByBirth(idx, half) };
}

/** Semua leluhur beserta jarak generasi (orang itu sendiri = 0). */
export function ancestorDepths(idx: FamilyIndex, id: string) {
  const depth = new Map<string, number>([[id, 0]]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const p of parentIds(idx, cur)) {
      if (!depth.has(p)) {
        depth.set(p, depth.get(cur)! + 1);
        queue.push(p);
      }
    }
  }
  return depth;
}

export function descendantDepths(idx: FamilyIndex, id: string) {
  const depth = new Map<string, number>([[id, 0]]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const c of childIds(idx, cur)) {
      if (!depth.has(c)) {
        depth.set(c, depth.get(cur)! + 1);
        queue.push(c);
      }
    }
  }
  return depth;
}

/** true jika menjadikan parentId orang tua dari childId akan membentuk siklus. */
export function wouldCreateCycle(idx: FamilyIndex, parentId: string, childId: string) {
  if (parentId === childId) return true;
  return descendantDepths(idx, childId).has(parentId);
}

/**
 * Hitung nomor generasi (1 = paling tua) untuk setiap anggota.
 * Aturan: anak = orang tua + 1, pasangan = generasi yang sama.
 * Diproses per komponen terhubung, lalu dinormalisasi agar minimum = 1.
 */
export function computeGenerations(idx: FamilyIndex): Map<string, number> {
  const gen = new Map<string, number>();
  const ids = sortByBirth(idx, [...idx.byId.keys()]);
  for (const start of ids) {
    if (gen.has(start)) continue;
    const comp = new Map<string, number>([[start, 0]]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      const g = comp.get(cur)!;
      const neighbors: [string, number][] = [
        ...parentIds(idx, cur).map((p) => [p, g - 1] as [string, number]),
        ...childIds(idx, cur).map((c) => [c, g + 1] as [string, number]),
        ...spouseIds(idx, cur).map((s) => [s, g] as [string, number]),
      ];
      for (const [n, ng] of neighbors) {
        if (!comp.has(n)) {
          comp.set(n, ng);
          queue.push(n);
        }
      }
    }
    const min = Math.min(...comp.values());
    for (const [k, v] of comp) gen.set(k, v - min + 1);
  }
  return gen;
}

/** Subset data untuk mode fokus: leluhur + keturunan + pasangan mereka. */
export function focusSubset(data: FamilyData, focusId: string): FamilyData {
  const idx = buildIndex(data);
  if (!idx.byId.has(focusId)) return data;
  const keep = new Set<string>([...ancestorDepths(idx, focusId).keys(), ...descendantDepths(idx, focusId).keys()]);
  // tambahkan pasangan dari fokus & keturunan (agar orang tua lain dari anak terlihat)
  for (const id of descendantDepths(idx, focusId).keys()) for (const s of spouseIds(idx, id)) keep.add(s);
  return {
    persons: data.persons.filter((p) => keep.has(p.id)),
    parentLinks: data.parentLinks.filter((l) => keep.has(l.parentId) && keep.has(l.childId)),
    unions: data.unions.filter((u) => keep.has(u.partner1Id) && keep.has(u.partner2Id)),
  };
}
