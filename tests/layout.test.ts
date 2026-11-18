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

// Dua keluarga besan: anak keluarga A menikah dengan anak keluarga B (kasus garis bersilangan)
const twoFamilies: FamilyData = {
  persons: [
    P("kakekA", "MALE", "1941"), P("nenekA", "FEMALE", "1949"),
    P("kakekB", "MALE", "1952"), P("nenekB", "FEMALE", "1955"),
    P("anakA1", "MALE", "1971"), P("menantuLaki", "MALE", "1973"),
    P("menantuPerempuan", "FEMALE", "1977"), P("anakB2", "FEMALE", "1979"), P("anakB3", "MALE", "1989"),
    P("cucu1", "FEMALE", "1999"), P("cucu2", "FEMALE", "2001"),
  ],
  parentLinks: [
    ["kakekA", "anakA1"], ["nenekA", "anakA1"], ["kakekA", "menantuLaki"], ["nenekA", "menantuLaki"],
    ["kakekB", "menantuPerempuan"], ["nenekB", "menantuPerempuan"], ["kakekB", "anakB2"], ["nenekB", "anakB2"],
    ["kakekB", "anakB3"], ["nenekB", "anakB3"],
    ["menantuLaki", "cucu1"], ["menantuPerempuan", "cucu1"], ["menantuLaki", "cucu2"], ["menantuPerempuan", "cucu2"],
  ].map(([p, c], i) => ({ id: `m${i}`, parentId: p, childId: c, type: "BIOLOGICAL" as const })),
  unions: [
    { id: "ua", partner1Id: "kakekA", partner2Id: "nenekA", status: "MARRIED" as const, marriageDate: null, endDate: null },
    { id: "ub", partner1Id: "kakekB", partner2Id: "nenekB", status: "MARRIED" as const, marriageDate: null, endDate: null },
    { id: "uc", partner1Id: "menantuLaki", partner2Id: "menantuPerempuan", status: "MARRIED" as const, marriageDate: null, endDate: null },
  ],
};

for (const direction of ["DOWN", "RIGHT"] as const) {
  test(`pasangan dari dua keluarga diletakkan di sisi keluarganya (${direction})`, async () => {
    const { nodes } = await layoutFamily(twoFamilies, direction);
    const at = (id: string) => {
      const n = nodes.find((x) => x.id === id)!;
      return direction === "DOWN" ? n.position.x : n.position.y;
    };
    // anak keluarga A seluruhnya di satu sisi, anak keluarga B di sisi lain → garisnya tidak bersilangan
    const famA = ["anakA1", "menantuLaki"].map(at);
    const famB = ["menantuPerempuan", "anakB2", "anakB3"].map(at);
    assert.ok(Math.max(...famA) < Math.min(...famB), `keluarga A (${famA}) harus seluruhnya sebelum keluarga B (${famB})`);
    assert.ok(at("menantuLaki") < at("menantuPerempuan"), "suami (keluarga A) di sisi keluarga A");
  });
}

// Kasus: adik kandung suami (anakA3) diletakkan ELK di antara suami & istri dari keluarga lain.
const siblingBetween: FamilyData = {
  persons: [
    P("kakekA", "MALE", "1941"), P("nenekA", "FEMALE", "1949"),
    P("kakekB", "MALE", "1952"), P("nenekB", "FEMALE", "1955"),
    P("anakA1", "MALE", "1970"), P("anakA2", "MALE", "1971"), P("suami", "MALE", "1973"), P("anakA3", "FEMALE", "1975"),
    P("istri", "FEMALE", "1977"), P("anakB2", "FEMALE", "1979"), P("anakB3", "MALE", "1989"),
    P("c1", "FEMALE", "1999"), P("c2", "FEMALE", "2001"), P("c3", "FEMALE", "2003"), P("c4", "MALE", "2007"),
  ],
  parentLinks: [
    ...["anakA1", "anakA2", "suami", "anakA3"].flatMap((c) => [["kakekA", c], ["nenekA", c]]),
    ...["istri", "anakB2", "anakB3"].flatMap((c) => [["kakekB", c], ["nenekB", c]]),
    ...["c1", "c2", "c3", "c4"].flatMap((c) => [["suami", c], ["istri", c]]),
  ].map(([p, c], i) => ({ id: `s${i}`, parentId: p, childId: c, type: "BIOLOGICAL" as const })),
  unions: [
    { id: "ua", partner1Id: "kakekA", partner2Id: "nenekA", status: "MARRIED" as const, marriageDate: null, endDate: null },
    { id: "ub", partner1Id: "kakekB", partner2Id: "nenekB", status: "MARRIED" as const, marriageDate: null, endDate: null },
    { id: "uc", partner1Id: "suami", partner2Id: "istri", status: "MARRIED" as const, marriageDate: null, endDate: null },
  ],
};

for (const [name, fixture] of [
  ["dua pernikahan", twoMarriages],
  ["dua keluarga besan", twoFamilies],
  ["adik di antara pasangan", siblingBetween],
] as const) {
  for (const direction of ["DOWN", "RIGHT"] as const) {
    test(`titik pasangan tidak menumpuk kartu anggota — ${name} (${direction})`, async () => {
      const { nodes } = await layoutFamily(fixture, direction);
      const people = nodes.filter((n) => n.type === "person");
      for (const u of nodes.filter((n) => n.type === "union")) {
        const ux = u.position.x, uy = u.position.y, uw = u.width ?? 0, uh = u.height ?? 0;
        for (const p of people) {
          const px = p.position.x, py = p.position.y, pw = p.width ?? 0, ph = p.height ?? 0;
          const overlap = ux < px + pw && ux + uw > px && uy < py + ph && uy + uh > py;
          assert.ok(!overlap, `titik ${u.id} menumpuk kartu ${p.id}`);
        }
      }
    });
  }
}

// Bentuk pohon besar dari laporan pengguna (nama generik): 3 keluarga di generasi atas,
// anak yang menikah dengan keluarga lain, dan seorang anak yang menikah dua kali.
const bigFamily: FamilyData = (() => {
  const persons = [
    P("ka", "MALE", "1921"), P("na", "FEMALE", "1929"), // keluarga A
    P("kb", "MALE", "9999"), P("nb", "FEMALE", "9999"), // keluarga B (tanpa tahun)
    P("kc", "MALE", "1952"), P("nc", "FEMALE", "1955"), // keluarga C
    P("ibu", "FEMALE", "1949"), P("pamanA", "MALE", "1951"), P("ayah", "MALE", "1941"),
    P("c1", "MALE", "1970"), P("c1w", "FEMALE", "1970"), P("c2", "MALE", "1971"), P("c2w", "FEMALE", "1973"),
    P("c3", "MALE", "1973"), P("c4", "FEMALE", "1975"), P("c4h1", "MALE", "9999"), P("c4h2", "MALE", "9999"),
    P("c5", "FEMALE", "1977"), P("c5h1", "MALE", "9999"), P("c5h2", "MALE", "9999"),
    P("menantuC", "FEMALE", "1977"), P("adikC1", "FEMALE", "1979"), P("adikC2", "MALE", "1989"),
    ...["g1", "g2", "g3"].map((g, i) => P(g, "MALE", `199${i}`)),
    ...["g4", "g5"].map((g, i) => P(g, "FEMALE", `200${i}`)),
    ...["g6", "g7", "g8", "g9"].map((g, i) => P(g, "FEMALE", `199${i + 6}`)),
    P("g10", "MALE", "2000"), P("g11", "FEMALE", "2002"), P("g12", "MALE", "2004"),
    P("g13", "FEMALE", "2001"), P("g14", "MALE", "2003"), P("g15", "FEMALE", "2005"), P("g16", "MALE", "9999"),
  ];
  const kids = (a: string, b: string, cs: string[]) => cs.flatMap((c) => [[a, c], [b, c]]);
  const links = [
    ...kids("ka", "na", ["ibu", "pamanA"]),
    ...kids("kb", "nb", ["ayah"]),
    ...kids("kc", "nc", ["menantuC", "adikC1", "adikC2"]),
    ...kids("ayah", "ibu", ["c1", "c2", "c3", "c4", "c5"]),
    ...kids("c1", "c1w", ["g1", "g2", "g3"]),
    ...kids("c2", "c2w", ["g4", "g5"]),
    ...kids("c3", "menantuC", ["g6", "g7", "g8", "g9"]),
    ...kids("c4", "c4h1", ["g10", "g11"]),
    ...kids("c4", "c4h2", ["g12"]),
    ...kids("c5", "c5h1", ["g13", "g14", "g15"]),
    ...kids("c5", "c5h2", ["g16"]),
  ];
  const U = (id: string, a: string, b: string, status: "MARRIED" | "DIVORCED" = "MARRIED", marriageDate: string | null = null) =>
    ({ id, partner1Id: a, partner2Id: b, status, marriageDate, endDate: null });
  return {
    persons,
    parentLinks: links.map(([p, c], i) => ({ id: `b${i}`, parentId: p, childId: c, type: "BIOLOGICAL" as const })),
    unions: [
      U("ua", "ka", "na"), U("ub", "kb", "nb"), U("uc", "kc", "nc"), U("up", "ayah", "ibu"),
      U("u1", "c1", "c1w"), U("u2", "c2", "c2w"), U("u3", "c3", "menantuC"),
      U("u4a", "c4h1", "c4", "MARRIED", "1995"), U("u4b", "c4", "c4h2", "DIVORCED", "2003"),
      U("u5a", "c5h1", "c5", "MARRIED", "1998"), U("u5b", "c5", "c5h2", "MARRIED", "2008"),
    ],
  };
})();

/** Hitung perpotongan antar garis orang tua → anak (tampilan vertikal). */
function countCrossings(nodes: { id: string; position: { x: number; y: number }; width?: number; height?: number }[], edges: import("@xyflow/react").Edge[]) {
  const box = new Map(nodes.map((n) => [n.id, n]));
  type Seg = { src: string; x1: number; y1: number; x2: number; y2: number };
  const segs: Seg[] = [];
  for (const e of edges) {
    const cy = (e.data as { centerY?: number } | undefined)?.centerY;
    if (cy === undefined) continue;
    const s = box.get(e.source)!, t = box.get(e.target)!;
    const sx = s.position.x + (s.width ?? 0) / 2, sy = s.position.y + (s.height ?? 0);
    const tx = t.position.x + (t.width ?? 0) / 2, ty = t.position.y;
    segs.push({ src: e.source, x1: sx, y1: sy, x2: sx, y2: cy });
    segs.push({ src: e.source, x1: Math.min(sx, tx), y1: cy, x2: Math.max(sx, tx), y2: cy });
    segs.push({ src: e.source, x1: tx, y1: cy, x2: tx, y2: ty });
  }
  let n = 0;
  const found: string[] = [];
  for (const v of segs) {
    if (v.x1 !== v.x2) continue;
    for (const h of segs) {
      if (h.y1 !== h.y2 || h.src === v.src) continue;
      const [ylo, yhi] = [Math.min(v.y1, v.y2), Math.max(v.y1, v.y2)];
      if (v.x1 > h.x1 + 1 && v.x1 < h.x2 - 1 && h.y1 > ylo + 1 && h.y1 < yhi - 1) {
        n++;
        found.push(`${v.src}@${Math.round(v.x1)} × ${h.src}`);
      }
    }
  }
  return { n, found };
}

test("pohon besar: garis orang tua → anak tidak saling memotong", async () => {
  const { nodes, edges } = await layoutFamily(bigFamily, "DOWN");
  const { n, found } = countCrossings(nodes, edges);
  assert.equal(n, 0, `perpotongan: ${found.join(", ")}`);
  const x = (id: string) => nodes.find((p) => p.id === id)!.position.x;
  // anak yang menikah dengan keluarga C berada paling kanan di antara saudaranya
  for (const s of ["c1", "c2", "c4", "c5"]) assert.ok(x(s) < x("c3"), `${s} sebelum c3`);
  // paman (saudara ibu) di kiri ibu, karena keluarga ayah ada di kanan
  assert.ok(x("pamanA") < x("ibu"));
});
