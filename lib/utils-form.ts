import type { ZodError } from "zod";

/** Ubah FormData menjadi objek biasa (nilai string pertama per kunci). */
export function formToObject(fd: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !(k in obj)) obj[k] = v;
  }
  return obj;
}

export function zodFieldErrors(err: ZodError) {
  return err.flatten().fieldErrors as Record<string, string[] | undefined>;
}
