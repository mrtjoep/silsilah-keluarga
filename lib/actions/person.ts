"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertTreeRole, PermissionError } from "@/lib/permissions";
import { lifeEventSchema, personSchema } from "@/lib/validations/person";
import { formToObject, zodFieldErrors } from "@/lib/utils-form";
import { deletePhoto, savePhoto, UploadError } from "@/lib/storage";
import { linkParent, linkSpouse, RelationError } from "@/lib/relations";
import { PARENT_TYPES, type ActionResult, type ParentType } from "@/types";

function fail(e: unknown): Extract<ActionResult, { ok: false }> {
  if (e instanceof PermissionError || e instanceof RelationError) return { ok: false, error: e.message };
  if (e instanceof UploadError) return { ok: false, error: e.message, fieldErrors: { photo: [e.message] } };
  console.error(e);
  return { ok: false, error: "Terjadi kesalahan. Silakan coba lagi." };
}

async function assertPersonInTree(treeId: string, personId: string) {
  const p = await prisma.person.findFirst({ where: { id: personId, treeId } });
  if (!p) throw new PermissionError("Anggota tidak ditemukan.");
  return p;
}

function getPhoto(fd: FormData): File | null {
  const f = fd.get("photo");
  return f instanceof File && f.size > 0 ? f : null;
}

export async function createPersonAction(treeId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let newId: string;
  try {
    await assertTreeRole(treeId, "EDITOR");
    const parsed = personSchema.safeParse(formToObject(fd));
    if (!parsed.success)
      return { ok: false, error: "Periksa kembali isian yang ditandai.", fieldErrors: zodFieldErrors(parsed.error), values: formToObject(fd) };

    // relasi opsional saat menambah dari profil orang lain
    const relKind = String(fd.get("relKind") ?? "");
    const relTo = String(fd.get("relTo") ?? "");
    const otherParent = String(fd.get("otherParent") ?? "");
    const ptRaw = String(fd.get("parentType") ?? "BIOLOGICAL");
    const parentType: ParentType = (PARENT_TYPES as readonly string[]).includes(ptRaw) ? (ptRaw as ParentType) : "BIOLOGICAL";
    if (relTo) await assertPersonInTree(treeId, relTo);
    if (otherParent) await assertPersonInTree(treeId, otherParent);

    const photo = getPhoto(fd);
    const photoPath = photo ? await savePhoto(photo) : null;
    const person = await prisma.person.create({ data: { ...parsed.data, treeId, photoPath } });
    newId = person.id;

    try {
      if (relTo && relKind === "child") {
        await linkParent(treeId, relTo, person.id, parentType);
        if (otherParent && otherParent !== relTo) await linkParent(treeId, otherParent, person.id, parentType);
      } else if (relTo && relKind === "parent") {
        await linkParent(treeId, person.id, relTo, parentType);
      } else if (relTo && relKind === "spouse") {
        await linkSpouse(treeId, relTo, person.id);
      }
    } catch (e) {
      // anggota tetap tersimpan; beri tahu bahwa relasi gagal
      if (e instanceof RelationError) {
        revalidatePath(`/trees/${treeId}`, "layout");
        redirect(`/trees/${treeId}/members/${person.id}?warn=${encodeURIComponent(e.message)}`);
      }
      throw e;
    }
    await prisma.familyTree.update({ where: { id: treeId }, data: { updatedAt: new Date() } });
  } catch (e) {
    if (isRedirect(e)) throw e;
    return { ...fail(e), values: formToObject(fd) };
  }
  revalidatePath(`/trees/${treeId}`, "layout");
  redirect(`/trees/${treeId}/members/${newId}?created=1`);
}

export async function updatePersonAction(
  treeId: string,
  personId: string,
  _: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "EDITOR");
    const existing = await assertPersonInTree(treeId, personId);
    const parsed = personSchema.safeParse(formToObject(fd));
    if (!parsed.success)
      return { ok: false, error: "Periksa kembali isian yang ditandai.", fieldErrors: zodFieldErrors(parsed.error), values: formToObject(fd) };

    let photoPath = existing.photoPath;
    const photo = getPhoto(fd);
    if (photo) {
      photoPath = await savePhoto(photo);
      await deletePhoto(existing.photoPath);
    } else if (fd.get("removePhoto") === "on") {
      await deletePhoto(existing.photoPath);
      photoPath = null;
    }
    await prisma.person.update({ where: { id: personId }, data: { ...parsed.data, photoPath } });
  } catch (e) {
    return { ...fail(e), values: formToObject(fd) };
  }
  revalidatePath(`/trees/${treeId}`, "layout");
  redirect(`/trees/${treeId}/members/${personId}?updated=1`);
}

export async function deletePersonAction(treeId: string, personId: string): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "EDITOR");
    const p = await assertPersonInTree(treeId, personId);
    // Union tidak ikut terhapus otomatis lewat cascade dua arah di SQLite → hapus eksplisit
    await prisma.$transaction([
      prisma.union.deleteMany({ where: { OR: [{ partner1Id: personId }, { partner2Id: personId }] } }),
      prisma.person.delete({ where: { id: personId } }),
    ]);
    await deletePhoto(p.photoPath);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/trees/${treeId}`, "layout");
  redirect(`/trees/${treeId}/members`);
}

export async function addLifeEventAction(
  treeId: string,
  personId: string,
  _: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "EDITOR");
    await assertPersonInTree(treeId, personId);
    const parsed = lifeEventSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { ok: false, error: "Periksa kembali isian.", fieldErrors: zodFieldErrors(parsed.error) };
    await prisma.lifeEvent.create({ data: { ...parsed.data, personId } });
    revalidatePath(`/trees/${treeId}/members/${personId}`);
    return { ok: true, message: "Peristiwa ditambahkan." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLifeEventAction(treeId: string, eventId: string): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "EDITOR");
    const ev = await prisma.lifeEvent.findFirst({ where: { id: eventId, person: { treeId } } });
    if (!ev) return { ok: false, error: "Peristiwa tidak ditemukan." };
    await prisma.lifeEvent.delete({ where: { id: eventId } });
    revalidatePath(`/trees/${treeId}/members/${ev.personId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

function isRedirect(e: unknown) {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
