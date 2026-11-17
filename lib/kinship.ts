/**
 * Kalkulator hubungan kekerabatan dalam istilah Bahasa Indonesia.
 * relationship(idx, a, b) menjawab: "A adalah ___ dari B".
 */
import type { FamilyIndex } from "@/lib/family";
import { ancestorDepths, parentIds, siblingsOf, spouseIds } from "@/lib/family";
import type { Gender } from "@/types";

export interface KinshipResult {
  label: string;
  /** penjelasan jalur, mis. "melalui leluhur bersama: Wiryo" */
  detail?: string;
  commonAncestorId?: string;
  kind: "same" | "blood" | "spouse" | "inlaw" | "none";
}

const g = (gender: Gender | undefined, male: string, female: string, neutral: string) =>
  gender === "MALE" ? male : gender === "FEMALE" ? female : neutral;

function ancestorLabel(n: number, gender?: Gender) {
  switch (n) {
    case 1: return g(gender, "ayah", "ibu", "orang tua");
    case 2: return g(gender, "kakek", "nenek", "kakek/nenek");
    case 3: return g(gender, "kakek buyut", "nenek buyut", "buyut");
    case 4: return "canggah";
    case 5: return "wareng";
    default: return `leluhur generasi ke-${n}`;
  }
}

function descendantLabel(n: number) {
  switch (n) {
    case 1: return "anak";
    case 2: return "cucu";
    case 3: return "cicit";
    case 4: return "canggah (keturunan ke-4)";
    case 5: return "wareng (keturunan ke-5)";
    default: return `keturunan generasi ke-${n}`;
  }
}

function birthOrder(a?: string | null, b?: string | null): "older" | "younger" | null {
  if (!a || !b) return null;
  if (a < b) return "older";
  if (a > b) return "younger";
  return null;
}

/** Hubungan darah saja (tanpa pernikahan). */
function bloodRelation(idx: FamilyIndex, aId: string, bId: string): KinshipResult | null {
  const a = idx.byId.get(aId);
  const b = idx.byId.get(bId);
  if (!a || !b) return null;
  const da = ancestorDepths(idx, aId);
  const db = ancestorDepths(idx, bId);
  let best: { id: string; x: number; y: number } | null = null;
  for (const [id, x] of da) {
    const y = db.get(id);
    if (y === undefined) continue;
    if (!best || x + y < best.x + best.y) best = { id, x, y };
  }
  if (!best) return null;
  const { x, y, id: lca } = best; // x = jarak A ke leluhur bersama, y = jarak B
  const lcaName = idx.byId.get(lca)?.fullName;
  const detail = lcaName && x > 0 && y > 0 ? `Leluhur bersama terdekat: ${lcaName}` : undefined;

  const parentLink = (child: string, parent: string) =>
    (idx.parents.get(child) ?? []).find((l) => l.parentId === parent);

  if (x === 0) {
    let label = ancestorLabel(y, a.gender);
    if (y === 1) {
      const t = parentLink(bId, aId)?.type;
      if (t === "ADOPTED") label += " angkat";
      else if (t === "STEP") label += " tiri";
      else if (t === "FOSTER") label += " asuh";
    }
    return { label, kind: "blood", commonAncestorId: lca };
  }
  if (y === 0) {
    let label = descendantLabel(x);
    if (x === 1) {
      const t = parentLink(aId, bId)?.type;
      if (t === "ADOPTED") label += " angkat";
      else if (t === "STEP") label += " tiri";
      else if (t === "FOSTER") label += " asuh";
    }
    if (x === 1 && a.gender !== "UNKNOWN") label += a.gender === "MALE" ? " laki-laki" : " perempuan";
    return { label, kind: "blood", commonAncestorId: lca };
  }
  if (x === 1 && y === 1) {
    const sib = siblingsOf(idx, aId);
    const order = birthOrder(a.birthDate, b.birthDate);
    const base = order === "older" ? "kakak" : order === "younger" ? "adik" : "saudara";
    const genderSuffix = a.gender === "MALE" ? " laki-laki" : a.gender === "FEMALE" ? " perempuan" : "";
    if (sib.full.includes(bId)) return { label: `${base} kandung${genderSuffix}`, kind: "blood", commonAncestorId: lca };
    // saudara tiri sebapak/seibu
    const shared = parentIds(idx, aId).find((p) => parentIds(idx, bId).includes(p));
    const sharedGender = shared ? idx.byId.get(shared)?.gender : undefined;
    const via = sharedGender === "MALE" ? "seayah" : sharedGender === "FEMALE" ? "seibu" : "satu orang tua";
    return { label: `${base}${genderSuffix} ${via}`, kind: "blood", commonAncestorId: lca };
  }
  if (x === 1) {
    // A saudara dari leluhur B
    if (y === 2) return { label: g(a.gender, "paman", "bibi", "paman/bibi"), kind: "blood", detail, commonAncestorId: lca };
    return { label: `saudara dari ${ancestorLabel(y - 1)}`, detail, kind: "blood", commonAncestorId: lca };
  }
  if (y === 1) {
    if (x === 2) return { label: "keponakan", kind: "blood", detail, commonAncestorId: lca };
    if (x === 3) return { label: "cucu keponakan", kind: "blood", detail, commonAncestorId: lca };
    return { label: `keturunan generasi ke-${x - 1} dari saudara`, kind: "blood", detail, commonAncestorId: lca };
  }
  const degree = Math.min(x, y) - 1;
  const diff = Math.abs(x - y);
  const cousin = degree === 1 ? "sepupu" : `sepupu derajat ${degree}`;
  if (diff === 0) return { label: cousin, kind: "blood", detail, commonAncestorId: lca };
  if (x > y) {
    // A lebih muda generasinya: anak dari sepupu B, dst
    const prefix = diff === 1 ? "anak" : diff === 2 ? "cucu" : `keturunan ke-${diff}`;
    return { label: `${prefix} dari ${cousin}`, kind: "blood", detail, commonAncestorId: lca };
  }
  if (diff === 1)
    return {
      label: `${g(a.gender, "paman", "bibi", "paman/bibi")} sepupu (${cousin} dari orang tua)`,
      kind: "blood",
      detail,
      commonAncestorId: lca,
    };
  return { label: `${cousin} dari ${ancestorLabel(diff)}`, kind: "blood", detail, commonAncestorId: lca };
}

export function relationship(idx: FamilyIndex, aId: string, bId: string): KinshipResult {
  if (aId === bId) return { label: "orang yang sama", kind: "same" };
  const a = idx.byId.get(aId);
  const b = idx.byId.get(bId);
  if (!a || !b) return { label: "tidak ditemukan", kind: "none" };

  const blood = bloodRelation(idx, aId, bId);
  if (blood) return blood;

  // Pasangan langsung
  const directUnion = (idx.unions.get(aId) ?? []).find((u) => u.partner1Id === bId || u.partner2Id === bId);
  if (directUnion) {
    const base = g(a.gender, "suami", "istri", "pasangan");
    const ex = directUnion.status === "DIVORCED" || directUnion.status === "SEPARATED";
    return { label: ex ? `mantan ${base}` : base, kind: "spouse" };
  }

  const aSpouses = spouseIds(idx, aId);
  const bSpouses = spouseIds(idx, bId);

  // Mertua: A orang tua dari pasangan B
  for (const s of bSpouses) {
    if (parentIds(idx, s).includes(aId)) return { label: g(a.gender, "ayah mertua", "ibu mertua", "mertua"), kind: "inlaw" };
  }
  // Menantu: A pasangan dari anak B
  for (const s of aSpouses) {
    if (parentIds(idx, s).includes(bId)) return { label: "menantu", kind: "inlaw" };
  }
  // Orang tua tiri: A pasangan dari orang tua B
  for (const s of aSpouses) {
    if (parentIds(idx, bId).includes(s)) return { label: g(a.gender, "ayah tiri", "ibu tiri", "orang tua tiri"), kind: "inlaw" };
  }
  // Anak tiri: A anak dari pasangan B
  for (const s of bSpouses) {
    if (parentIds(idx, aId).includes(s)) return { label: "anak tiri", kind: "inlaw" };
  }
  // Ipar: A saudara dari pasangan B, atau pasangan dari saudara B
  for (const s of bSpouses) {
    const sib = siblingsOf(idx, s);
    if ([...sib.full, ...sib.half].includes(aId)) return { label: "ipar", detail: `Saudara dari pasangan`, kind: "inlaw" };
  }
  const bSibs = siblingsOf(idx, bId);
  for (const s of aSpouses) {
    if ([...bSibs.full, ...bSibs.half].includes(s)) return { label: "ipar", detail: "Pasangan dari saudara", kind: "inlaw" };
  }
  // Besan: orang tua dari pasangan anak
  const bChildren = (idx.children.get(bId) ?? []).map((l) => l.childId);
  for (const c of bChildren) {
    for (const cs of spouseIds(idx, c)) {
      if (parentIds(idx, cs).includes(aId)) return { label: "besan", kind: "inlaw" };
    }
  }
  // A adalah pasangan dari kerabat darah B
  for (const s of aSpouses) {
    const r = bloodRelation(idx, s, bId);
    if (!r) continue;
    const detail = `Melalui pernikahan dengan ${idx.byId.get(s)?.fullName}`;
    // istri paman = bibi, suami bibi = paman (sebutan sehari-hari)
    if (["paman", "bibi", "paman/bibi"].includes(r.label))
      return { label: g(a.gender, "paman", "bibi", "paman/bibi"), detail, kind: "inlaw" };
    return { label: `pasangan dari ${r.label}`, detail, kind: "inlaw" };
  }
  // A adalah kerabat darah dari pasangan B
  for (const s of bSpouses) {
    const r = bloodRelation(idx, aId, s);
    if (r) return { label: `${r.label} dari pasangan`, detail: `Melalui ${idx.byId.get(s)?.fullName}`, kind: "inlaw" };
  }
  return { label: "tidak memiliki hubungan yang tercatat", kind: "none" };
}
