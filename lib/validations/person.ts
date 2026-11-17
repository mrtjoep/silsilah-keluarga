import { z } from "zod";
import { GENDERS } from "@/types";
import { isValidPartialDate } from "@/lib/dates";

/** Ubah string kosong menjadi undefined lalu trim. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .optional()
    .transform((v) => (v ? v : null));

const partialDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isValidPartialDate(v), {
    message: "Format tanggal: TTTT, TTTT-BB, atau TTTT-BB-HH (contoh 1965-08-17)",
  });

export const personSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nama lengkap minimal 2 karakter").max(120, "Maksimal 120 karakter"),
    nickname: optionalText(60),
    gender: z.enum(GENDERS, { errorMap: () => ({ message: "Pilih jenis kelamin" }) }),
    birthDate: partialDate,
    birthPlace: optionalText(120),
    isDeceased: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
      .optional()
      .transform((v) => v === true || v === "on" || v === "true"),
    deathDate: partialDate,
    deathPlace: optionalText(120),
    occupation: optionalText(120),
    bio: optionalText(5000),
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^[+0-9 ()-]{6,20}$/.test(v), { message: "Nomor telepon tidak valid" }),
    email: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.toLowerCase() : null))
      .refine((v) => v === null || z.string().email().safeParse(v).success, { message: "Email tidak valid" }),
  })
  .transform((d) => ({ ...d, isDeceased: d.isDeceased || !!d.deathDate }))
  .superRefine((d, ctx) => {
    if (d.birthDate && d.deathDate && d.deathDate < d.birthDate) {
      ctx.addIssue({ code: "custom", path: ["deathDate"], message: "Tanggal wafat tidak boleh sebelum tanggal lahir" });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (d.birthDate && d.birthDate > today) {
      ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Tanggal lahir tidak boleh di masa depan" });
    }
  });

export type PersonInput = z.infer<typeof personSchema>;

export const lifeEventSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(120),
  date: partialDate,
  description: optionalText(1000),
});
