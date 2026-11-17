import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutFamily } from "@/lib/tree-layout";
import type { FamilyData, Gender } from "@/types";

const P = (id: string, gender: Gender, birthDate: string) => ({
  id, fullName: id, nickname: null, gender, birthDate, birthPlace: null, isDeceased: false, deathDate: null, occupation: null, photoPath: null,
});

// Ayah menikah dua kali; anak dari kedua istri lahir berselang-seling
const twoMarriages: FamilyData = {
  persons: [
    P("ayah", "MALE", "1950"), P("istri1", "FEMALE", "1952"), P("istri2", "FEMALE", "1955"),
    P("a1", "MALE", "1975"), P("b1", "FEMALE", "1976"), P("a2", "MALE", "1977"), P("b2", "FEMALE", "1978"),
  ],
  parentLinks: [
    ["ayah", "a1"], ["istri1", "a1"], ["ayah", "a2"], ["istri1", "a2"],
    ["ayah", "b1"], ["istri2", "b1"], ["ayah", "b2"], ["istri2", "b2"],
  ].map(([p, c], i) => ({ id: `l${i}`, parentId: p, childId: c, type: "BIOLOGICAL" as const })),
  unions: [
    { id: "u1", partner1Id: "ayah", partner2Id: "istri1", status: "DIVORCED" as const, marriageDate: "1974", endDate: null },
    { id: "u2", partner1Id: "ayah", partner2Id: "istri2", status: "MARRIED" as const, marriageDate: "1976", endDate: null },
  ],
};

for (const direction of ["DOWN", "RIGHT"] as const) {
  test(`garis anak dari dua pernikahan tidak menyatu (${direction})`, async () => {
    const { edges, nodes } = await layoutFamily(twoMarriages, direction);
    const key = direction === "DOWN" ? "centerY" : "centerX";
    const center = (unionId: string) => {
      const vals = edges
        .filter((e) => e.source === `u-${unionId}`)
        .map((e) => (e.data as Record<string, number>)[key]);
      assert.ok(vals.length === 2, `2 anak untuk ${unionId}`);
      assert.equal(new Set(vals).size, 1, "anak satu pasangan berbagi satu jalur");
      return vals[0];
    };
    const c1 = center("u1");
    const c2 = center("u2");
    // Jika rentang mendatar kedua kelompok bertumpuk, jalurnya wajib berbeda
    const span = (unionId: string) => {
      const ids = edges.filter((e) => e.source === `u-${unionId}`).map((e) => e.target).concat(`u-${unionId}`);
      const xs = nodes
        .filter((n) => ids.includes(n.id))
        .map((n) => (direction === "DOWN" ? n.position.x + (n.width ?? 0) / 2 : n.position.y + (n.height ?? 0) / 2));
      return [Math.min(...xs), Math.max(...xs)] as const;
    };
    const [l1, h1] = span("u1");
    const [l2, h2] = span("u2");
    const overlap = l1 <= h2 && l2 <= h1;
    if (overlap) assert.notEqual(c1, c2, "jalur belok harus berbeda saat bertumpuk");
    // Semua anak tetap terhubung ke pasangan yang benar
    for (const [u, kids] of [["u1", ["a1", "a2"]], ["u2", ["b1", "b2"]]] as const) {
      const targets = edges.filter((e) => e.source === `u-${u}`).map((e) => e.target).sort();
      assert.deepEqual(targets, [...kids].sort());
    }
  });
}
