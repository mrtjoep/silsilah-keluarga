/**
 * Utilitas tanggal parsial: "YYYY", "YYYY-MM", "YYYY-MM-DD".
 */
export const PARTIAL_DATE_REGEX = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function monthName(m: number) {
  return MONTHS_ID[m - 1] ?? "";
}

export function parsePartial(d: string | null | undefined) {
  if (!d || !PARTIAL_DATE_REGEX.test(d)) return null;
  const [y, m, day] = d.split("-").map(Number);
  return { year: y, month: m as number | undefined, day: day as number | undefined };
}

export function isValidPartialDate(d: string) {
  const p = parsePartial(d);
  if (!p) return false;
  if (p.month && p.day) {
    const dt = new Date(Date.UTC(p.year, p.month - 1, p.day));
    return dt.getUTCMonth() === p.month - 1;
  }
  return true;
}

export function formatDate(d: string | null | undefined): string {
  const p = parsePartial(d);
  if (!p) return "";
  if (p.day && p.month) return `${p.day} ${monthName(p.month)} ${p.year}`;
  if (p.month) return `${monthName(p.month)} ${p.year}`;
  return String(p.year);
}

export function yearOf(d: string | null | undefined): number | null {
  return parsePartial(d)?.year ?? null;
}

/** Usia dalam tahun (perkiraan bila tanggal tidak lengkap). */
export function ageBetween(from: string | null | undefined, to?: string | null): number | null {
  const a = parsePartial(from);
  if (!a) return null;
  let b = parsePartial(to);
  if (!b) {
    if (to) return null;
    const now = new Date();
    b = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
  let age = b.year - a.year;
  if (a.month && b.month) {
    if (b.month < a.month || (b.month === a.month && a.day && b.day && b.day < a.day)) age--;
  }
  return age >= 0 ? age : null;
}

export function lifeSpan(p: { birthDate: string | null; deathDate: string | null; isDeceased: boolean }) {
  const b = yearOf(p.birthDate);
  const d = yearOf(p.deathDate);
  if (!b && !d) return p.isDeceased ? "†" : "";
  if (p.isDeceased) return `${b ?? "?"} – ${d ?? "?"}`;
  return `${b}`;
}

/** Bandingkan tanggal parsial untuk pengurutan (null di akhir). */
export function compareDates(a: string | null | undefined, b: string | null | undefined) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}
