import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Eye } from "lucide-react";
import { prisma } from "@/lib/db";
import { getFamilyData } from "@/lib/queries";
import { FamilyTreeView } from "@/components/tree/family-tree-view";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

async function getPublicTree(slug: string) {
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(slug)) return null;
  return prisma.familyTree.findFirst({ where: { publicSlug: slug, isPublic: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tree = await getPublicTree(slug);
  // tautan publik tidak untuk diindeks mesin pencari
  return { title: tree?.name ?? "Tidak ditemukan", robots: { index: false, follow: false } };
}

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tree = await getPublicTree(slug);
  if (!tree) notFound();
  const t = await getTranslations();
  // Penyaringan privasi dilakukan di server: data asli anggota hidup tidak pernah dikirim ke browser
  const data = await getFamilyData(tree.id, { redact: tree.hideLivingInPublic });
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <Logo label={t("app.name")} />
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
        <h1 className="text-2xl font-bold">{tree.name}</h1>
        {tree.description && <p className="text-muted-foreground">{tree.description}</p>}
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Eye className="size-4" aria-hidden /> {t("share.readOnly")}
        </p>
      </div>
      <Suspense>
        <FamilyTreeView data={data} title={tree.name} />
      </Suspense>
    </div>
  );
}
