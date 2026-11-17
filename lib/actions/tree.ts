"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertTreeRole, PermissionError, requireUser } from "@/lib/permissions";
import { accessSchema, shareSettingsSchema, treeSchema } from "@/lib/validations/tree";
import { formToObject, zodFieldErrors } from "@/lib/utils-form";
import { deletePhoto } from "@/lib/storage";
import type { ActionResult } from "@/types";

function fail(e: unknown): ActionResult<never> {
  if (e instanceof PermissionError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: "Terjadi kesalahan. Silakan coba lagi." };
}

const newSlug = () => randomBytes(9).toString("base64url");

export async function createTreeAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = treeSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, error: "Periksa kembali isian Anda.", fieldErrors: zodFieldErrors(parsed.error) };
  const tree = await prisma.familyTree.create({
    data: { ...parsed.data, accesses: { create: { userId: user.id, role: "ADMIN" } } },
  });
  redirect(`/trees/${tree.id}`);
}

export async function updateTreeAction(treeId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "ADMIN");
    const parsed = treeSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { ok: false, error: "Periksa kembali isian Anda.", fieldErrors: zodFieldErrors(parsed.error) };
    await prisma.familyTree.update({ where: { id: treeId }, data: parsed.data });
    revalidatePath(`/trees/${treeId}`, "layout");
    return { ok: true, message: "Pengaturan disimpan." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTreeAction(treeId: string): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "ADMIN");
    const photos = await prisma.person.findMany({ where: { treeId, photoPath: { not: null } }, select: { photoPath: true } });
    await prisma.familyTree.delete({ where: { id: treeId } });
    await Promise.all(photos.map((p) => deletePhoto(p.photoPath)));
  } catch (e) {
    return fail(e);
  }
  redirect("/trees");
}

export async function updateShareAction(treeId: string, input: { isPublic: boolean; hideLivingInPublic: boolean }): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "ADMIN");
    const data = shareSettingsSchema.parse(input);
    const tree = await prisma.familyTree.findUniqueOrThrow({ where: { id: treeId } });
    await prisma.familyTree.update({
      where: { id: treeId },
      data: { ...data, publicSlug: data.isPublic && !tree.publicSlug ? newSlug() : tree.publicSlug },
    });
    revalidatePath(`/trees/${treeId}/settings`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function regenerateSlugAction(treeId: string): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "ADMIN");
    await prisma.familyTree.update({ where: { id: treeId }, data: { publicSlug: newSlug() } });
    revalidatePath(`/trees/${treeId}/settings`);
    return { ok: true, message: "Tautan baru dibuat. Tautan lama tidak berlaku lagi." };
  } catch (e) {
    return fail(e);
  }
}

export async function addAccessAction(treeId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "ADMIN");
    const parsed = accessSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { ok: false, error: "Periksa kembali isian Anda.", fieldErrors: zodFieldErrors(parsed.error) };
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user)
      return { ok: false, error: "Pengguna belum terdaftar.", fieldErrors: { email: ["Belum ada akun dengan email ini. Minta ia mendaftar terlebih dahulu."] } };
    await prisma.treeAccess.upsert({
      where: { userId_treeId: { userId: user.id, treeId } },
      create: { userId: user.id, treeId, role: parsed.data.role },
      update: { role: parsed.data.role },
    });
    revalidatePath(`/trees/${treeId}/settings`);
    return { ok: true, message: `${user.name} ditambahkan.` };
  } catch (e) {
    return fail(e);
  }
}

async function ensureAnotherAdmin(treeId: string, userId: string) {
  const admins = await prisma.treeAccess.count({ where: { treeId, role: "ADMIN", NOT: { userId } } });
  if (admins === 0) throw new PermissionError("Pohon harus memiliki setidaknya satu Admin.");
}

export async function updateAccessAction(treeId: string, userId: string, role: string): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "ADMIN");
    const { role: r } = accessSchema.pick({ role: true }).parse({ role });
    if (r !== "ADMIN") await ensureAnotherAdmin(treeId, userId);
    await prisma.treeAccess.update({ where: { userId_treeId: { userId, treeId } }, data: { role: r } });
    revalidatePath(`/trees/${treeId}/settings`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeAccessAction(treeId: string, userId: string): Promise<ActionResult> {
  try {
    await assertTreeRole(treeId, "ADMIN");
    await ensureAnotherAdmin(treeId, userId);
    await prisma.treeAccess.delete({ where: { userId_treeId: { userId, treeId } } });
    revalidatePath(`/trees/${treeId}/settings`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
