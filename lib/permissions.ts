import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/types";

const RANK: Record<Role, number> = { VIEWER: 1, EDITOR: 2, ADMIN: 3 };

export function hasRole(role: string | null | undefined, min: Role) {
  return !!role && (RANK[role as Role] ?? 0) >= RANK[min];
}

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // sesi bisa merujuk ke akun yang sudah dihapus (mis. setelah reset database)
  const exists = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!exists) redirect("/api/session-expired");
  return session.user;
});

export async function getTreeRole(userId: string, treeId: string): Promise<Role | null> {
  const access = await prisma.treeAccess.findUnique({ where: { userId_treeId: { userId, treeId } } });
  return (access?.role as Role) ?? null;
}

/** Untuk halaman: redirect/404 jika tidak berhak. */
export async function requireTreePage(treeId: string, min: Role = "VIEWER") {
  const user = await requireUser();
  const role = await getTreeRole(user.id, treeId);
  if (!role) notFound();
  if (!hasRole(role, min)) redirect(`/trees/${treeId}`);
  return { user, role };
}

export class PermissionError extends Error {}

/** Untuk server action / route handler: lempar error jika tidak berhak. */
export async function assertTreeRole(treeId: string, min: Role) {
  const session = await auth();
  if (!session?.user?.id) throw new PermissionError("Silakan masuk terlebih dahulu.");
  const role = await getTreeRole(session.user.id, treeId);
  if (!hasRole(role, min)) throw new PermissionError("Anda tidak memiliki izin untuk tindakan ini.");
  return { user: session.user, role: role! };
}
