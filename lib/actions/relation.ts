"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertTreeRole, PermissionError } from "@/lib/permissions";
import { linkParent, linkSpouse, RelationError } from "@/lib/relations";
import { addRelationSchema, updateParentLinkSchema, updateUnionSchema } from "@/lib/validations/relation";
import { zodFieldErrors } from "@/lib/utils-form";
import type { ActionResult } from "@/types";

function fail(e: unknown): ActionResult<never> {
  if (e instanceof PermissionError || e instanceof RelationError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: "Terjadi kesalahan. Silakan coba lagi." };
}

const touch = (treeId: string) => revalidatePath(`/trees/${treeId}`, "layout");

export async function addRelationAction(treeId: string, input: unknown): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "EDITOR");
    const parsed = addRelationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Periksa kembali isian.", fieldErrors: zodFieldErrors(parsed.error) };
    const d = parsed.data;
    if (d.kind === "parent") await linkParent(treeId, d.relatedId, d.personId, d.parentType);
    else if (d.kind === "child") {
      await linkParent(treeId, d.personId, d.relatedId, d.parentType);
      if (d.otherParentId && d.otherParentId !== d.personId) {
        try {
          await linkParent(treeId, d.otherParentId, d.relatedId, d.parentType);
        } catch (e) {
          // relasi dengan orang tua lainnya mungkin sudah ada — itu bukan kesalahan
          if (!(e instanceof RelationError && e.message.includes("sudah ada"))) throw e;
        }
      }
    }
    else await linkSpouse(treeId, d.personId, d.relatedId, d.unionStatus, d.marriageDate);
    touch(treeId);
    return { ok: true, message: "Relasi berhasil ditambahkan." };
  } catch (e) {
    return fail(e);
  }
}

export async function removeParentLinkAction(treeId: string, linkId: string): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "EDITOR");
    const link = await prisma.parentChild.findFirst({ where: { id: linkId, child: { treeId } } });
    if (!link) return { ok: false, error: "Relasi tidak ditemukan." };
    await prisma.parentChild.delete({ where: { id: linkId } });
    touch(treeId);
    return { ok: true, message: "Relasi dihapus." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateParentLinkAction(treeId: string, input: unknown): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "EDITOR");
    const d = updateParentLinkSchema.parse(input);
    const link = await prisma.parentChild.findFirst({ where: { id: d.linkId, child: { treeId } } });
    if (!link) return { ok: false, error: "Relasi tidak ditemukan." };
    if (d.type === "BIOLOGICAL" && link.type !== "BIOLOGICAL") {
      const bio = await prisma.parentChild.count({ where: { childId: link.childId, type: "BIOLOGICAL" } });
      if (bio >= 2) return { ok: false, error: "Anak ini sudah memiliki 2 orang tua kandung." };
    }
    await prisma.parentChild.update({ where: { id: d.linkId }, data: { type: d.type } });
    touch(treeId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateUnionAction(treeId: string, input: unknown): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "EDITOR");
    const parsed = updateUnionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Periksa kembali isian.", fieldErrors: zodFieldErrors(parsed.error) };
    const { unionId, ...data } = parsed.data;
    const u = await prisma.union.findFirst({ where: { id: unionId, treeId } });
    if (!u) return { ok: false, error: "Data pernikahan tidak ditemukan." };
    await prisma.union.update({ where: { id: unionId }, data });
    touch(treeId);
    return { ok: true, message: "Data pernikahan disimpan." };
  } catch (e) {
    return fail(e);
  }
}

export async function removeUnionAction(treeId: string, unionId: string): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "EDITOR");
    const u = await prisma.union.findFirst({ where: { id: unionId, treeId } });
    if (!u) return { ok: false, error: "Data pernikahan tidak ditemukan." };
    await prisma.union.delete({ where: { id: unionId } });
    touch(treeId);
    return { ok: true, message: "Relasi pasangan dihapus." };
  } catch (e) {
    return fail(e);
  }
}
