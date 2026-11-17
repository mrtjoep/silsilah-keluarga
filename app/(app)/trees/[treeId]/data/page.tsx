import { getTranslations } from "next-intl/server";
import { FileJson, FileText, Info } from "lucide-react";
import { requireTreePage } from "@/lib/permissions";
import { CSV_HEADERS } from "@/lib/gedcom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportForm } from "@/components/forms/import-form";

export const metadata = { title: "Impor & Ekspor" };

export default async function DataPage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  await requireTreePage(treeId, "EDITOR");
  const t = await getTranslations("data");
  const base = `/api/trees/${treeId}/export`;
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <h2 className="text-2xl font-bold">{t("title")}</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("export")}</CardTitle>
          <CardDescription className="text-base">{t("exportDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button render={<a href={`${base}/json`} download />}>
              <FileJson className="size-4" aria-hidden /> {t("json")}
            </Button>
            <Button variant="outline" render={<a href={`${base}/gedcom`} download />}>
              <FileText className="size-4" aria-hidden /> {t("gedcom")}
            </Button>
          </div>
          <p className="flex items-start gap-2 text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {t("pngPdfHint")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("import")}</CardTitle>
          <CardDescription className="text-base">{t("importDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImportForm treeId={treeId} />
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-semibold">{t("csvFormat")}</summary>
            <p className="mt-3 text-muted-foreground">
              Baris pertama berisi judul kolom. Hanya <code>fullName</code> yang wajib. Gender: L/P atau M/F. Tanggal: TTTT, TTTT-BB, atau TTTT-BB-HH.
              <code> fatherId</code>, <code>motherId</code>, dan <code>spouseId</code> merujuk ke kolom <code>id</code> baris lain.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-sm">
{CSV_HEADERS.join(",")}
{"\n"}1,Budi Santoso,Pak Budi,L,1950-08-17,Yogyakarta,2010-01-02,Yogyakarta,Guru,,,2
{"\n"}2,Siti Aminah,,P,1955,Solo,,,,,,1
{"\n"}3,Andi Santoso,,L,1980-05-05,Jakarta,,,Dokter,1,2,
            </pre>
          </details>
        </CardContent>
      </Card>
    </main>
  );
}
