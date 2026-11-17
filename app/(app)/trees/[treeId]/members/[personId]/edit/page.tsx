import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireTreePage } from "@/lib/permissions";
import { updatePersonAction } from "@/lib/actions/person";
import { PersonForm } from "@/components/forms/person-form";
import type { Gender } from "@/types";

export const metadata = { title: "Ubah anggota" };

export default async function EditMemberPage({ params }: { params: Promise<{ treeId: string; personId: string }> }) {
  const { treeId, personId } = await params;
  await requireTreePage(treeId, "EDITOR");
  const person = await prisma.person.findFirst({ where: { id: personId, treeId } });
  if (!person) notFound();
  const t = await getTranslations("person");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h2 className="mb-6 text-2xl font-bold">
        {t("edit")}: {person.fullName}
      </h2>
      <PersonForm
        action={updatePersonAction.bind(null, treeId, personId)}
        defaults={{ ...person, gender: person.gender as Gender }}
        cancelHref={`/trees/${treeId}/members/${personId}`}
      />
    </main>
  );
}
