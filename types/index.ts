export const GENDERS = ["MALE", "FEMALE", "UNKNOWN"] as const;
export type Gender = (typeof GENDERS)[number];

export const ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const PARENT_TYPES = ["BIOLOGICAL", "ADOPTED", "STEP", "FOSTER"] as const;
export type ParentType = (typeof PARENT_TYPES)[number];

export const UNION_STATUSES = ["MARRIED", "DIVORCED", "SEPARATED", "WIDOWED"] as const;
export type UnionStatus = (typeof UNION_STATUSES)[number];

/** Data minimal seorang anggota yang dipakai di pohon, pencarian, dan kalkulasi. */
export interface PersonLite {
  id: string;
  fullName: string;
  nickname: string | null;
  gender: Gender;
  birthDate: string | null;
  birthPlace: string | null;
  isDeceased: boolean;
  deathDate: string | null;
  deathPlace?: string | null;
  occupation: string | null;
  photoPath: string | null;
  /** true jika data disembunyikan karena privasi (tampilan publik) */
  isPrivate?: boolean;
}

export interface ParentLinkLite {
  id: string;
  parentId: string;
  childId: string;
  type: ParentType;
}

export interface UnionLite {
  id: string;
  partner1Id: string;
  partner2Id: string;
  status: UnionStatus;
  marriageDate: string | null;
  endDate: string | null;
}

export interface FamilyData {
  persons: PersonLite[];
  parentLinks: ParentLinkLite[];
  unions: UnionLite[];
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined>; values?: Record<string, string> };
