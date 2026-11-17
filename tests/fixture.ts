import type { FamilyData, Gender, ParentType } from "@/types";

/** Keluarga kecil untuk pengujian */
const P = (id: string, gender: Gender, birthDate: string | null = null) => ({
  id, fullName: id, nickname: null, gender, birthDate, birthPlace: null, isDeceased: false, deathDate: null, occupation: null, photoPath: null,
});

export const family: FamilyData = {
  persons: [
    P("kakek", "MALE", "1920"), P("nenek", "FEMALE", "1925"),
    P("ayah", "MALE", "1950"), P("ibu", "FEMALE", "1952"),
    P("paman", "MALE", "1955"), P("tante", "FEMALE", "1957"),
    P("aku", "MALE", "1980"), P("adik", "FEMALE", "1985"),
    P("sepupu", "FEMALE", "1982"), P("istri", "FEMALE", "1982"),
    P("anak", "MALE", "2010"), P("mertua", "MALE", "1950"),
    P("ibuTiri", "FEMALE", "1960"), P("adikTiri", "MALE", "1990"), P("anakAngkat", "FEMALE", "2015"),
  ],
  parentLinks: [
    ["kakek", "ayah"], ["nenek", "ayah"], ["kakek", "paman"], ["nenek", "paman"],
    ["ayah", "aku"], ["ibu", "aku"], ["ayah", "adik"], ["ibu", "adik"],
    ["paman", "sepupu"], ["tante", "sepupu"], ["aku", "anak"], ["istri", "anak"],
    ["mertua", "istri"], ["ayah", "adikTiri"], ["ibuTiri", "adikTiri"],
  ].map(([p, c], i) => ({ id: `l${i}`, parentId: p, childId: c, type: "BIOLOGICAL" as ParentType }))
    .concat([{ id: "lx", parentId: "aku", childId: "anakAngkat", type: "ADOPTED" as ParentType }]),
  unions: [
    ["kakek", "nenek", "MARRIED"], ["ayah", "ibu", "DIVORCED"], ["ayah", "ibuTiri", "MARRIED"],
    ["paman", "tante", "MARRIED"], ["aku", "istri", "MARRIED"],
  ].map(([a, b, s], i) => ({ id: `u${i}`, partner1Id: a, partner2Id: b, status: s as "MARRIED", marriageDate: null, endDate: null })),
};
