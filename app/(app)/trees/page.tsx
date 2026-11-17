import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, TreeDeciduous, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateTreeForm } from "@/components/forms/create-tree-form";

export const metadata = { title: "Pohon Keluarga Saya" };

export default async function TreesPage() {
  const user = await requireUser();
  const t = await getTranslations();
  const accesses = await prisma.treeAccess.findMany({
    where: { userId: user.id },
    include: { tree: { include: { _count: { select: { persons: true } } } } },
    orderBy: { tree: { updatedAt: "desc" } },
  });

  const createDialog = (
    <Dialog>
      <DialogTrigger render={<Button size="lg" />}>
        <Plus className="size-5" aria-hidden /> {t("trees.create")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl">{t("trees.create")}</DialogTitle>
        </DialogHeader>
        <CreateTreeForm />
      </DialogContent>
    </Dialog>
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t("trees.title")}</h1>
        {accesses.length > 0 && createDialog}
      </div>
      {accesses.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-10 text-center">
          <TreeDeciduous className="mx-auto size-14 text-primary" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold">{t("trees.empty")}</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t("trees.emptyHint")}</p>
          <div className="mt-6">{createDialog}</div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accesses.map(({ tree, role }) => (
            <Link key={tree.id} href={`/trees/${tree.id}`} className="group rounded-xl focus-visible:outline-3 focus-visible:outline-ring">
              <Card className="h-full transition-colors group-hover:border-primary">
                <CardHeader>
                  <CardTitle className="text-xl">{tree.name}</CardTitle>
                  {tree.description && <CardDescription className="line-clamp-2 text-base">{tree.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" aria-hidden />
                    {t("trees.members", { count: tree._count.persons })}
                  </span>
                  <Badge variant="secondary">{t(`roles.${role as "ADMIN"}`)}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
