import { getTranslations } from "next-intl/server";
import { getFamilyData } from "@/lib/queries";
import { requireTreePage } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { RelationshipCalculator } from "@/components/relationship-calculator";

export const metadata = { title: "Kalkulator Hubungan" };

export default async function RelationshipPage({
  params,
  searchParams,
}: {
  params: Promise<{ treeId: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { treeId } = await params;
  const sp = await searchParams;
  await requireTreePage(treeId);
  const t = await getTranslations("relationship");
  const data = await getFamilyData(treeId);
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">{t("desc")}</p>
      </div>
      <Card>
        <CardContent>
          <RelationshipCalculator data={data} initialA={sp.a} initialB={sp.b} />
        </CardContent>
      </Card>
    </main>
  );
}
