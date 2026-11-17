/**
 * Konversi GEDCOM 5.5.1 <-> struktur internal. Murni (tanpa I/O).
 */
import type { Gender, ParentType, UnionStatus } from "@/types";
import { parsePartial } from "@/lib/dates";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function toGedcomDate(d: string | null | undefined) {
  const p = parsePartial(d);
  if (!p) return null;
  if (p.month && p.day) return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
  if (p.month) return `${MONTHS[p.month - 1]} ${p.year}`;
  return String(p.year);
}

export function fromGedcomDate(s: string | undefined): string | null {
  if (!s) return null;
  const clean = s.toUpperCase().replace(/^(ABT|ABOUT|EST|CAL|BEF|AFT|FROM|TO|BET|INT)\.?\s+/, "").split(/\s+(AND|TO)\s+/)[0].trim();
  const m3 = clean.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (m3) {
    const mi = MONTHS.indexOf(m3[2]);
    if (mi >= 0) return `${m3[3]}-${pad(mi + 1)}-${pad(Number(m3[1]))}`;
  }
  const m2 = clean.match(/^([A-Z]{3})\s+(\d{4})$/);
  if (m2) {
    const mi = MONTHS.indexOf(m2[1]);
    if (mi >= 0) return `${m2[2]}-${pad(mi + 1)}`;
  }
  const y = clean.match(/(\d{4})/);
  return y ? y[1] : null;
}

export interface ExportPerson {
  id: string;
  fullName: string;
  nickname: string | null;
  gender: string;
  birthDate: string | null;
  birthPlace: string | null;
  isDeceased: boolean;
  deathDate: string | null;
  deathPlace: string | null;
  occupation: string | null;
  bio: string | null;
}

/** Baris teks panjang dipecah dengan CONT (baris baru) & CONC (sambungan) */
function textLines(level: number, tag: string, text: string): string[] {
  const out: string[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const chunks = line.match(/.{1,200}/g) ?? [""];
    chunks.forEach((c, j) => {
      if (i === 0 && j === 0) out.push(`${level} ${tag} ${c}`);
      else out.push(`${level + 1} ${j === 0 ? "CONT" : "CONC"} ${c}`);
    });
  });
  return out;
}

export function buildGedcom(input: {
  treeName: string;
  persons: ExportPerson[];
  parentLinks: { parentId: string; childId: string; type: string }[];
  unions: { id: string; partner1Id: string; partner2Id: string; status: string; marriageDate: string | null; endDate: string | null }[];
}): string {
  const iref = new Map(input.persons.map((p, i) => [p.id, `@I${i + 1}@`]));
  const byId = new Map(input.persons.map((p) => [p.id, p]));
  type Fam = { ref: string; partners: string[]; children: { id: string; type: string }[]; union?: (typeof input.unions)[number] };
  const fams: Fam[] = [];
  const famByKey = new Map<string, Fam>();
  const keyOf = (ids: string[]) => [...ids].sort().join("|");
  for (const u of input.unions) {
    const f: Fam = { ref: `@F${fams.length + 1}@`, partners: [u.partner1Id, u.partner2Id], children: [], union: u };
    fams.push(f);
    if (!famByKey.has(keyOf(f.partners))) famByKey.set(keyOf(f.partners), f);
  }
  const parentsOf = new Map<string, { parentId: string; type: string }[]>();
  for (const l of input.parentLinks) parentsOf.set(l.childId, [...(parentsOf.get(l.childId) ?? []), l]);
  for (const [childId, ps] of parentsOf) {
    const key = keyOf(ps.map((p) => p.parentId).slice(0, 2));
    let f = famByKey.get(key);
    if (!f) {
      f = { ref: `@F${fams.length + 1}@`, partners: ps.map((p) => p.parentId).slice(0, 2), children: [] };
      fams.push(f);
      famByKey.set(key, f);
    }
    f.children.push({ id: childId, type: ps[0].type });
  }

  const L: string[] = [
    "0 HEAD",
    "1 SOUR SILSILAH_KELUARGA",
    "2 NAME Silsilah Keluarga",
    "1 GEDC",
    "2 VERS 5.5.1",
    "2 FORM LINEAGE-LINKED",
    "1 CHAR UTF-8",
    "1 LANG Indonesian",
    ...textLines(1, "NOTE", input.treeName),
  ];
  for (const p of input.persons) {
    L.push(`0 ${iref.get(p.id)} INDI`, `1 NAME ${p.fullName.replace(/\//g, "")}`);
    if (p.nickname) L.push(`2 NICK ${p.nickname}`);
    L.push(`1 SEX ${p.gender === "MALE" ? "M" : p.gender === "FEMALE" ? "F" : "U"}`);
    if (p.birthDate || p.birthPlace) {
      L.push("1 BIRT");
      if (p.birthDate) L.push(`2 DATE ${toGedcomDate(p.birthDate)}`);
      if (p.birthPlace) L.push(`2 PLAC ${p.birthPlace}`);
    }
    if (p.isDeceased) {
      if (p.deathDate || p.deathPlace) {
        L.push("1 DEAT");
        if (p.deathDate) L.push(`2 DATE ${toGedcomDate(p.deathDate)}`);
        if (p.deathPlace) L.push(`2 PLAC ${p.deathPlace}`);
      } else L.push("1 DEAT Y");
    }
    if (p.occupation) L.push(`1 OCCU ${p.occupation}`);
    if (p.bio) L.push(...textLines(1, "NOTE", p.bio));
    for (const f of fams) {
      if (f.partners.includes(p.id)) L.push(`1 FAMS ${f.ref}`);
      const c = f.children.find((x) => x.id === p.id);
      if (c) {
        L.push(`1 FAMC ${f.ref}`);
        const pedi = c.type === "ADOPTED" ? "adopted" : c.type === "FOSTER" ? "foster" : c.type === "STEP" ? "step" : null;
        if (pedi) L.push(`2 PEDI ${pedi}`);
      }
    }
  }
  for (const f of fams) {
    L.push(`0 ${f.ref} FAM`);
    const [a, b] = f.partners;
    const pa = byId.get(a);
    const pb = b ? byId.get(b) : undefined;
    const husb = pa?.gender === "FEMALE" ? pb : pa;
    const wife = pa?.gender === "FEMALE" ? pa : pb;
    if (husb) L.push(`1 HUSB ${iref.get(husb.id)}`);
    if (wife) L.push(`1 WIFE ${iref.get(wife.id)}`);
    for (const c of f.children) L.push(`1 CHIL ${iref.get(c.id)}`);
    if (f.union) {
      L.push("1 MARR");
      if (f.union.marriageDate) L.push(`2 DATE ${toGedcomDate(f.union.marriageDate)}`);
      if (f.union.status === "DIVORCED") {
        L.push("1 DIV");
        if (f.union.endDate) L.push(`2 DATE ${toGedcomDate(f.union.endDate)}`);
      }
    }
  }
  L.push("0 TRLR");
  return L.join("\r\n") + "\r\n";
}

// ---------------- Import ----------------

export interface ImportedData {
  persons: {
    key: string;
    fullName: string;
    nickname?: string;
    gender: Gender;
    birthDate?: string | null;
    birthPlace?: string;
    isDeceased: boolean;
    deathDate?: string | null;
    deathPlace?: string;
    occupation?: string;
    bio?: string;
  }[];
  parentLinks: { parentKey: string; childKey: string; type: ParentType }[];
  unions: { aKey: string; bKey: string; status: UnionStatus; marriageDate?: string | null; endDate?: string | null }[];
}

interface GNode {
  level: number;
  xref?: string;
  tag: string;
  value: string;
  children: GNode[];
}

function parseTree(text: string): GNode[] {
  const roots: GNode[] = [];
  const stack: GNode[] = [];
  for (const raw of text.replace(/^﻿/, "").split(/\r?\n|\r/)) {
    const m = raw.trim().match(/^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/);
    if (!m) continue;
    const node: GNode = { level: Number(m[1]), xref: m[2], tag: m[3].toUpperCase(), value: m[4] ?? "", children: [] };
    while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}

const child = (n: GNode | undefined, tag: string) => n?.children.find((c) => c.tag === tag);
const fullText = (n: GNode | undefined) => {
  if (!n) return undefined;
  let s = n.value;
  for (const c of n.children) {
    if (c.tag === "CONT") s += "\n" + c.value;
    else if (c.tag === "CONC") s += c.value;
  }
  return s.trim() || undefined;
};

export function parseGedcom(text: string): ImportedData {
  const roots = parseTree(text);
  const out: ImportedData = { persons: [], parentLinks: [], unions: [] };
  const pediOf = new Map<string, ParentType>(); // `${famRef}|${indiRef}`
  for (const r of roots.filter((n) => n.tag === "INDI" && n.xref)) {
    const nameNode = child(r, "NAME");
    const name = (nameNode?.value ?? "").replace(/\//g, " ").replace(/\s+/g, " ").trim();
    const sex = child(r, "SEX")?.value.trim().toUpperCase();
    const birt = child(r, "BIRT");
    const deat = child(r, "DEAT");
    out.persons.push({
      key: r.xref!,
      fullName: name || "Tanpa nama",
      nickname: child(nameNode, "NICK")?.value || undefined,
      gender: sex === "M" ? "MALE" : sex === "F" ? "FEMALE" : "UNKNOWN",
      birthDate: fromGedcomDate(child(birt, "DATE")?.value),
      birthPlace: child(birt, "PLAC")?.value || undefined,
      isDeceased: !!deat,
      deathDate: fromGedcomDate(child(deat, "DATE")?.value),
      deathPlace: child(deat, "PLAC")?.value || undefined,
      occupation: child(r, "OCCU")?.value || undefined,
      bio: fullText(child(r, "NOTE")),
    });
    for (const famc of r.children.filter((c) => c.tag === "FAMC")) {
      const pedi = child(famc, "PEDI")?.value.toLowerCase();
      const type: ParentType = pedi === "adopted" ? "ADOPTED" : pedi === "foster" ? "FOSTER" : pedi === "step" ? "STEP" : "BIOLOGICAL";
      pediOf.set(`${famc.value.trim()}|${r.xref}`, type);
    }
  }
  const known = new Set(out.persons.map((p) => p.key));
  for (const f of roots.filter((n) => n.tag === "FAM" && n.xref)) {
    const partners = ["HUSB", "WIFE"].map((t) => child(f, t)?.value.trim()).filter((x): x is string => !!x && known.has(x));
    const kids = f.children.filter((c) => c.tag === "CHIL").map((c) => c.value.trim()).filter((k) => known.has(k));
    if (partners.length === 2) {
      const div = child(f, "DIV");
      out.unions.push({
        aKey: partners[0],
        bKey: partners[1],
        status: div ? "DIVORCED" : "MARRIED",
        marriageDate: fromGedcomDate(child(child(f, "MARR"), "DATE")?.value),
        endDate: fromGedcomDate(child(div, "DATE")?.value),
      });
    }
    for (const k of kids)
      for (const p of partners) out.parentLinks.push({ parentKey: p, childKey: k, type: pediOf.get(`${f.xref}|${k}`) ?? "BIOLOGICAL" });
  }
  return out;
}

// ---------------- CSV ----------------

export const CSV_HEADERS = [
  "id", "fullName", "nickname", "gender", "birthDate", "birthPlace",
  "deathDate", "deathPlace", "occupation", "fatherId", "motherId", "spouseId",
] as const;

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  const src = text.replace(/^﻿/, "");
  const delim = (src.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) > (src.split(/\r?\n/)[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

export function parseCsv(text: string): ImportedData {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("Berkas CSV kosong.");
  const header = rows[0].map((h) => h.trim());
  if (!header.includes("fullName")) throw new Error('Kolom "fullName" wajib ada di baris judul.');
  const get = (r: string[], k: string) => r[header.indexOf(k)]?.trim() ?? "";
  const out: ImportedData = { persons: [], parentLinks: [], unions: [] };
  const unionKeys = new Set<string>();
  rows.slice(1).forEach((r, i) => {
    const key = get(r, "id") || `row${i + 2}`;
    const g = get(r, "gender").toUpperCase();
    const deathDate = get(r, "deathDate") || null;
    out.persons.push({
      key,
      fullName: get(r, "fullName"),
      nickname: get(r, "nickname") || undefined,
      gender: ["M", "L", "MALE", "LAKI-LAKI"].includes(g) ? "MALE" : ["F", "P", "FEMALE", "PEREMPUAN"].includes(g) ? "FEMALE" : "UNKNOWN",
      birthDate: get(r, "birthDate") || null,
      birthPlace: get(r, "birthPlace") || undefined,
      isDeceased: !!deathDate,
      deathDate,
      deathPlace: get(r, "deathPlace") || undefined,
      occupation: get(r, "occupation") || undefined,
    });
    for (const pk of [get(r, "fatherId"), get(r, "motherId")]) if (pk) out.parentLinks.push({ parentKey: pk, childKey: key, type: "BIOLOGICAL" });
    const sp = get(r, "spouseId");
    if (sp) {
      const uk = [key, sp].sort().join("|");
      if (!unionKeys.has(uk)) {
        unionKeys.add(uk);
        out.unions.push({ aKey: key, bKey: sp, status: "MARRIED" });
      }
    }
  });
  return out;
}
