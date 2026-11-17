import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, computeGenerations, siblingsOf, wouldCreateCycle, focusSubset } from "@/lib/family";
import { relationship } from "@/lib/kinship";
import { family } from "./fixture";

const idx = buildIndex(family);
const rel = (a: string, b: string) => relationship(idx, a, b).label;

test("hubungan darah", () => {
  assert.equal(rel("ayah", "aku"), "ayah");
  assert.equal(rel("kakek", "aku"), "kakek");
  assert.equal(rel("aku", "kakek"), "cucu");
  assert.equal(rel("anak", "aku"), "anak laki-laki");
  assert.equal(rel("paman", "aku"), "paman");
  assert.equal(rel("tante", "aku"), "bibi");
  assert.equal(rel("aku", "paman"), "keponakan");
  assert.equal(rel("sepupu", "aku"), "sepupu");
  assert.equal(rel("adik", "aku"), "adik kandung perempuan");
  assert.equal(rel("aku", "adik"), "kakak kandung laki-laki");
  assert.equal(rel("adikTiri", "aku"), "adik laki-laki seayah");
  assert.equal(rel("anakAngkat", "aku"), "anak angkat perempuan");
});

test("hubungan pernikahan", () => {
  assert.equal(rel("istri", "aku"), "istri");
  assert.equal(rel("ibu", "ayah"), "mantan istri");
  assert.equal(rel("mertua", "aku"), "ayah mertua");
  assert.equal(rel("aku", "mertua"), "menantu");
  assert.equal(rel("ibuTiri", "aku"), "ibu tiri");
  assert.equal(rel("adik", "istri"), "ipar");
  assert.equal(rel("mertua", "ayah"), "besan");
});

test("saudara otomatis", () => {
  const s = siblingsOf(idx, "aku");
  assert.deepEqual(s.full, ["adik"]);
  assert.deepEqual(s.half, ["adikTiri"]);
});

test("generasi: pasangan sejajar, anak +1", () => {
  const g = computeGenerations(idx);
  assert.equal(g.get("kakek"), 1);
  assert.equal(g.get("aku"), 3);
  assert.equal(g.get("istri"), 3);
  assert.equal(g.get("mertua"), 2);
  assert.equal(g.get("anak"), 4);
});

test("cegah siklus", () => {
  assert.equal(wouldCreateCycle(idx, "anak", "kakek"), true);
  assert.equal(wouldCreateCycle(idx, "aku", "aku"), true);
  assert.equal(wouldCreateCycle(idx, "mertua", "sepupu"), false);
});

test("mode fokus hanya leluhur + keturunan + pasangan", () => {
  const sub = focusSubset(family, "aku");
  const ids = new Set(sub.persons.map((p) => p.id));
  for (const id of ["kakek", "nenek", "ayah", "ibu", "aku", "anak", "istri", "anakAngkat"]) assert.ok(ids.has(id), id);
  for (const id of ["paman", "sepupu", "adik"]) assert.ok(!ids.has(id), id);
});
