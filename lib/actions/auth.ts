"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { formToObject, zodFieldErrors } from "@/lib/utils-form";
import type { ActionResult } from "@/types";

export async function loginAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, error: "Periksa kembali isian Anda.", fieldErrors: zodFieldErrors(parsed.error) };
  const callbackUrl = String(fd.get("callbackUrl") || "/trees");
  const safeRedirect = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/trees";
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeRedirect });
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "Email atau kata sandi salah." };
    throw e; // redirect NEXT_REDIRECT harus diteruskan
  }
  return { ok: true };
}

export async function registerAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, error: "Periksa kembali isian Anda.", fieldErrors: zodFieldErrors(parsed.error) };
  const { name, email, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "Email sudah terdaftar.", fieldErrors: { email: ["Email sudah terdaftar."] } };
  await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  await signIn("credentials", { email, password, redirectTo: "/trees" });
  return { ok: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
