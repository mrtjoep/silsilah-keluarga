import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireTreePage } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareSettings } from "@/components/settings/share-settings";
import { AccessManager } from "@/components/settings/access-manager";
import { DeleteTreeButton, TreeGeneralForm } from "@/components/settings/tree-general-form";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  const { user } = await requireTreePage(treeId, "ADMIN");
  const t = await getTranslations("settings");
  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    include: { accesses: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!tree) notFound();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <h2 className="text-2xl font-bold">{t("title")}</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("general")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TreeGeneralForm treeId={treeId} name={tree.name} description={tree.description} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("share")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ShareSettings treeId={treeId} isPublic={tree.isPublic} hideLivingInPublic={tree.hideLivingInPublic} slug={tree.publicSlug} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("access")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AccessManager
            treeId={treeId}
            currentUserId={user.id}
            members={tree.accesses.map((a) => ({ userId: a.userId, name: a.user.name, email: a.user.email, role: a.role }))}
          />
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-xl text-destructive">{t("danger")}</CardTitle>
          <CardDescription className="text-base">{t("deleteTreeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteTreeButton treeId={treeId} name={tree.name} />
        </CardContent>
      </Card>
    </main>
  );
}
