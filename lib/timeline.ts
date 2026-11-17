import type { FamilyIndex } from "@/lib/family";
import { childIds } from "@/lib/family";
import { compareDates } from "@/lib/dates";

export interface TimelineItem {
  date: string | null;
  title: string;
  description?: string | null;
  kind: "birth" | "death" | "marriage" | "divorce" | "child" | "event";
  eventId?: string;
}

export function buildTimeline(
  idx: FamilyIndex,
  personId: string,
  events: { id: string; date: string | null; title: string; description: string | null }[],
): TimelineItem[] {
  const p = idx.byId.get(personId);
  if (!p) return [];
  const items: TimelineItem[] = [];
  items.push({ date: p.birthDate, title: "Lahir", description: p.birthPlace ? `di ${p.birthPlace}` : null, kind: "birth" });
  for (const u of idx.unions.get(personId) ?? []) {
    const other = idx.byId.get(u.partner1Id === personId ? u.partner2Id : u.partner1Id);
    if (!other) continue;
    items.push({ date: u.marriageDate, title: `Menikah dengan ${other.fullName}`, kind: "marriage" });
    if (u.status === "DIVORCED" || u.status === "SEPARATED")
      items.push({ date: u.endDate, title: `${u.status === "DIVORCED" ? "Bercerai" : "Berpisah"} dengan ${other.fullName}`, kind: "divorce" });
  }
  for (const c of childIds(idx, personId)) {
    const child = idx.byId.get(c);
    if (child) items.push({ date: child.birthDate, title: `Kelahiran anak: ${child.fullName}`, kind: "child" });
  }
  for (const e of events) items.push({ date: e.date, title: e.title, description: e.description, kind: "event", eventId: e.id });
  if (p.isDeceased) items.push({ date: p.deathDate, title: "Wafat", description: p.deathPlace ? `di ${p.deathPlace}` : null, kind: "death" });

  // urutkan berdasar tanggal; lahir selalu pertama, wafat selalu terakhir
  return items.sort((a, b) => {
    if (a.kind === "birth") return -1;
    if (b.kind === "birth") return 1;
    if (a.kind === "death") return 1;
    if (b.kind === "death") return -1;
    return compareDates(a.date, b.date);
  });
}
