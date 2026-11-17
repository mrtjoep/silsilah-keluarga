import { z } from "zod";
import { PARENT_TYPES, UNION_STATUSES } from "@/types";
import { isValidPartialDate } from "@/lib/dates";

const partialDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isValidPartialDate(v), { message: "Format tanggal tidak valid" });

export const addRelationSchema = z.object({
  personId: z.string().min(1),
  relatedId: z.string().min(1, "Pilih anggota keluarga"),
  /** saat menambah anak: pasangan yang menjadi orang tua lainnya (opsional) */
  otherParentId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  kind: z.enum(["parent", "child", "spouse"]),
  parentType: z.enum(PARENT_TYPES).default("BIOLOGICAL"),
  unionStatus: z.enum(UNION_STATUSES).default("MARRIED"),
  marriageDate: partialDate,
});

export const updateUnionSchema = z
  .object({
    unionId: z.string().min(1),
    status: z.enum(UNION_STATUSES),
    marriageDate: partialDate,
    endDate: partialDate,
  })
  .refine((d) => !(d.marriageDate && d.endDate && d.endDate < d.marriageDate), {
    path: ["endDate"],
    message: "Tanggal berakhir tidak boleh sebelum tanggal menikah",
  });

export const updateParentLinkSchema = z.object({
  linkId: z.string().min(1),
  type: z.enum(PARENT_TYPES),
});
