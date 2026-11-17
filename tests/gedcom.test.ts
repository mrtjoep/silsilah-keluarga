import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGedcom, fromGedcomDate, parseCsv, parseGedcom, toGedcomDate } from "@/lib/gedcom";
import { formatDate, isValidPartialDate, ageBetween } from "@/lib/dates";

test("konversi tanggal GEDCOM", () => {
  assert.equal(toGedcomDate("1950-08-17"), "17 AUG 1950");
  assert.equal(toGedcomDate("1950-08"), "AUG 1950");
  assert.equal(fromGedcomDate("17 AUG 1950"), "1950-08-17");
  assert.equal(fromGedcomDate("ABT 1930"), "1930");
  assert.equal(fromGedcomDate("BET 1900 AND 1910"), "1900");
});

test("tanggal parsial", () => {
  assert.ok(isValidPartialDate("1950"));
  assert.ok(!isValidPartialDate("1950-02-30"));
  assert.equal(formatDate("1945-08-17"), "17 Agustus 1945");
  assert.equal(ageBetween("1950-08-17", "2000-08-16"), 49);
});

test("GEDCOM ekspor -> impor bolak-balik", () => {
  const persons = [
    { id: "a", fullName: "Budi", nickname: "Pak Budi", gender: "MALE", birthDate: "1950-01-02", birthPlace: "Solo", isDeceased: true, deathDate: "2000", deathPlace: null, occupation: "Guru", bio: "Baris 1\nBaris 2" },
    { id: "b", fullName: "Siti", nickname: null, gender: "FEMALE", birthDate: null, birthPlace: null, isDeceased: false, deathDate: null, deathPlace: null, occupation: null, bio: null },
    { id: "c", fullName: "Andi", nickname: null, gender: "MALE", birthDate: "1980", birthPlace: null, isDeceased: false, deathDate: null, deathPlace: null, occupation: null, bio: null },
  ];
  const ged = buildGedcom({
    treeName: "Uji",
    persons,
    parentLinks: [
      { parentId: "a", childId: "c", type: "BIOLOGICAL" },
      { parentId: "b", childId: "c", type: "ADOPTED" },
    ],
    unions: [{ id: "u", partner1Id: "a", partner2Id: "b", status: "DIVORCED", marriageDate: "1975", endDate: "1990" }],
  });
  const back = parseGedcom(ged);
  assert.equal(back.persons.length, 3);
  const budi = back.persons.find((p) => p.fullName === "Budi")!;
  assert.equal(budi.nickname, "Pak Budi");
  assert.equal(budi.birthDate, "1950-01-02");
  assert.equal(budi.isDeceased, true);
  assert.equal(budi.bio, "Baris 1\nBaris 2");
  assert.equal(back.unions[0].status, "DIVORCED");
  assert.equal(back.parentLinks.length, 2);
});

test("impor CSV dengan kutip & titik koma", () => {
  const csv = 'id;fullName;gender;birthDate;fatherId;spouseId\n1;"Budi, S.Pd";L;1950;;2\n2;Siti;P;1955;;1\n3;Andi;L;1980;1;';
  const d = parseCsv(csv);
  assert.equal(d.persons[0].fullName, "Budi, S.Pd");
  assert.equal(d.persons[1].gender, "FEMALE");
  assert.equal(d.parentLinks.length, 1);
  assert.equal(d.unions.length, 1);
});
