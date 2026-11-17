import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireTreePage } from "@/lib/permissions";
import { createPersonAction } from "@/lib/actions/person";
import { PersonForm, type RelationContext } from "@/components/forms/person-form";
import type { Gender } from "@/types";

export const metadata = { title: "Tambah anggota" };

export default async function NewMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ treeId: string }>;
  searchParams: Promise<{ relKind?: string; relTo?: string; gender?: string; with?: string }>;
}) {
  const { treeId } = await params;
  const sp = await searchParams;
  await requireTreePage(treeId, "EDITOR");
  const t = await getTranslations("person");

  let relation: RelationContext | undefined;
  if (sp.relTo && (sp.relKind === "child" || sp.relKind === "parent" || sp.relKind === "spouse")) {
    const to = await prisma.person.findFirst({
      where: { id: sp.relTo, treeId },
      include: {
        unionsAsP1: { include: { partner2: true } },
        unionsAsP2: { include: { partner1: true } },
      },
    });
    if (!to) notFound();
    const spouses = [...to.unionsAsP1.map((u) => u.partner2), ...to.unionsAsP2.map((u) => u.partner1)];
    // pasangan yang dipilih (?with=) diletakkan pertama agar menjadi pilihan default
    spouses.sort((a, b) => (a.id === sp.with ? -1 : b.id === sp.with ? 1 : 0));
    relation = {
      kind: sp.relKind,
      toId: to.id,
      toName: to.fullName,
      otherParentOptions: sp.relKind === "child" ? spouses.map((s) => ({ id: s.id, name: s.fullName })) : undefined,
    };
  }

  const gender = (["MALE", "FEMALE"].includes(sp.gender ?? "") ? sp.gender : undefined) as Gender | undefined;
  const cancelHref = relation ? `/trees/${treeId}/members/${relation.toId}` : `/trees/${treeId}/members`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h2 className="mb-6 text-2xl font-bold">{t("add")}</h2>
      <PersonForm action={createPersonAction.bind(null, treeId)} relation={relation} defaults={{ gender }} cancelHref={cancelHref} />
    </main>
  );
}
