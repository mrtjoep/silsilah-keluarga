import { parsePartial } from "@/lib/dates";
import type { PersonLite } from "@/types";

export interface Anniversary {
  person: PersonLite;
  kind: "birthday" | "memorial";
  month: number;
  day: number;
  /** usia / tahun peringatan pada kejadian berikutnya */
  years: number | null;
  /** hari menuju kejadian berikutnya (0 = hari ini) */
  daysUntil: number;
  nextDate: Date;
}

/** Ulang tahun (anggota hidup) & peringatan wafat; hanya untuk tanggal lengkap. */
export function anniversaries(persons: PersonLite[], today = new Date()): Anniversary[] {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const out: Anniversary[] = [];
  const add = (person: PersonLite, kind: Anniversary["kind"], date: string | null) => {
    const p = parsePartial(date);
    if (!p?.month || !p.day) return;
    let next = new Date(base.getFullYear(), p.month - 1, p.day);
    if (next < base) next = new Date(base.getFullYear() + 1, p.month - 1, p.day);
    const daysUntil = Math.round((next.getTime() - base.getTime()) / 86_400_000);
    out.push({ person, kind, month: p.month, day: p.day, years: next.getFullYear() - p.year, daysUntil, nextDate: next });
  };
  for (const p of persons) {
    if (p.isPrivate) continue;
    if (!p.isDeceased) add(p, "birthday", p.birthDate);
    else add(p, "memorial", p.deathDate);
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}
