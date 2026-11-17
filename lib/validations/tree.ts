import { z } from "zod";
import { ROLES } from "@/types";

export const treeSchema = z.object({
  name: z.string().trim().min(2, "Nama pohon minimal 2 karakter").max(100),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
});

export const shareSettingsSchema = z.object({
  isPublic: z.boolean(),
  hideLivingInPublic: z.boolean(),
});

export const accessSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  role: z.enum(ROLES),
});
