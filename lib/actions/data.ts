"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertTreeRole, PermissionError } from "@/lib/permissions";
import { parseCsv, parseGedcom, type ImportedData } from "@/lib/gedcom";
import { personSchema } from "@/lib/validations/person";
import { buildIndex, wouldCreateCycle } from "@/lib/family";
import type { ActionResult, ParentLinkLite, PersonLite } from "@/types";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PERSONS = 5000;

export async function importAction(
  treeId: string,
  _: ActionResult<{ persons: number; links: number; unions: number; skipped: number }> | null,
  fd: FormData,
): Promise<ActionResult<{ persons: number; links: number; unions: number; skipped: number }>> {
  try {
    await assertTreeRole(treeId, "EDITOR");
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih berkas terlebih dahulu." };
    if (file.size > MAX_BYTES) return { ok: false, error: "Ukuran berkas maksimal 5 MB." };
    const name = file.name.toLowerCase();
    const text = await file.text();
    let parsed: ImportedData;
    try {
      if (name.endsWith(".ged") || text.trimStart().startsWith("0 HEAD")) parsed = parseGedcom(text);
      else if (name.endsWith(".csv")) parsed = parseCsv(text);
      else return { ok: false, error: "Format berkas harus .ged (GEDCOM) atau .csv." };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Berkas tidak dapat dibaca." };
    }
    if (parsed.persons.length === 0) return { ok: false, error: "Tidak ada anggota yang ditemukan di berkas." };
    if (parsed.persons.length > MAX_PERSONS) return { ok: false, error: `Maksimal ${MAX_PERSONS} anggota per impor.` };

    // Validasi tiap anggota dengan skema yang sama seperti form
    let skipped = 0;
    const valid: { key: string; data: ReturnType<typeof personSchema.parse> }[] = [];
    for (const p of parsed.persons) {
      const r = personSchema.safeParse({
        ...p,
        birthDate: p.birthDate ?? "",
        deathDate: p.deathDate ?? "",
        isDeceased: p.isDeceased ? "true" : "false",
      });
      if (r.success) valid.push({ key: p.key, data: r.data });
      else {
        // coba lagi tanpa tanggal yang tidak valid
        const r2 = personSchema.safeParse({ ...p, birthDate: "", deathDate: "", isDeceased: p.isDeceased ? "true" : "false" });
        if (r2.success) valid.push({ key: p.key, data: r2.data });
        else skipped++;
      }
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const idMap = new Map<string, string>();
        for (const v of valid) {
          const created = await tx.person.create({ data: { ...v.data, treeId } });
          idMap.set(v.key, created.id);
        }
        // relasi orang tua-anak: lewati duplikat, siklus, & >2 orang tua kandung
        const links: ParentLinkLite[] = [];
        const seen = new Set<string>();
        const persons = [...idMap.values()].map((id) => ({ id }) as PersonLite);
        let linkCount = 0;
        for (const l of parsed.parentLinks) {
          const parentId = idMap.get(l.parentKey);
          const childId = idMap.get(l.childKey);
          if (!parentId || !childId || parentId === childId) continue;
          const k = `${parentId}|${childId}`;
          if (seen.has(k)) continue;
          const idx = buildIndex({ persons, parentLinks: links, unions: [] });
          if (wouldCreateCycle(idx, parentId, childId)) continue;
          if (l.type === "BIOLOGICAL" && links.filter((x) => x.childId === childId && x.type === "BIOLOGICAL").length >= 2) continue;
          seen.add(k);
          const created = await tx.parentChild.create({ data: { parentId, childId, type: l.type } });
          links.push({ id: created.id, parentId, childId, type: l.type });
          linkCount++;
        }
        let unionCount = 0;
        for (const u of parsed.unions) {
          const a = idMap.get(u.aKey);
          const b = idMap.get(u.bKey);
          if (!a || !b || a === b) continue;
          await tx.union.create({
            data: { treeId, partner1Id: a, partner2Id: b, status: u.status, marriageDate: u.marriageDate ?? null, endDate: u.endDate ?? null },
          });
          unionCount++;
        }
        return { persons: idMap.size, links: linkCount, unions: unionCount, skipped };
      },
      { timeout: 60_000 },
    );
    revalidatePath(`/trees/${treeId}`, "layout");
    return { ok: true, data: result };
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Impor gagal. Periksa format berkas Anda." };
  }
}
