import { prisma } from "@/lib/db";
import { assertTreeRole, PermissionError } from "@/lib/permissions";
import { buildGedcom } from "@/lib/gedcom";
import { slugify } from "@/lib/slug";

export async function GET(_req: Request, { params }: { params: Promise<{ treeId: string; format: string }> }) {
  const { treeId, format } = await params;
  try {
    await assertTreeRole(treeId, "VIEWER");
  } catch (e) {
    return new Response(e instanceof PermissionError ? e.message : "Error", { status: 403 });
  }
  const tree = await prisma.familyTree.findUnique({ where: { id: treeId } });
  if (!tree) return new Response("Not found", { status: 404 });
  const [persons, parentLinks, unions] = await Promise.all([
    prisma.person.findMany({ where: { treeId }, include: { events: true }, orderBy: { birthDate: "asc" } }),
    prisma.parentChild.findMany({ where: { child: { treeId } } }),
    prisma.union.findMany({ where: { treeId } }),
  ]);
  const base = `silsilah-${slugify(tree.name)}`;

  if (format === "json") {
    const body = {
      format: "silsilah-keluarga",
      version: 1,
      exportedAt: new Date().toISOString(),
      tree: { name: tree.name, description: tree.description },
      persons: persons.map((p) => ({
        id: p.id, fullName: p.fullName, nickname: p.nickname, gender: p.gender,
        birthDate: p.birthDate, birthPlace: p.birthPlace, isDeceased: p.isDeceased,
        deathDate: p.deathDate, deathPlace: p.deathPlace, occupation: p.occupation,
        bio: p.bio, phone: p.phone, email: p.email,
        events: p.events.map((e) => ({ date: e.date, title: e.title, description: e.description })),
      })),
      parentLinks: parentLinks.map(({ id, parentId, childId, type }) => ({ id, parentId, childId, type })),
      unions: unions.map(({ id, partner1Id, partner2Id, status, marriageDate, endDate, notes }) => ({
        id, partner1Id, partner2Id, status, marriageDate, endDate, notes,
      })),
    };
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.json"`,
      },
    });
  }
  if (format === "gedcom") {
    const ged = buildGedcom({ treeName: tree.name, persons, parentLinks, unions });
    return new Response(ged, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.ged"`,
      },
    });
  }
  return new Response("Format tidak didukung", { status: 400 });
}
