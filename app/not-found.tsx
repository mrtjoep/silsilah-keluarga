import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TreeDeciduous } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <TreeDeciduous className="size-16 text-primary" aria-hidden />
      <h1 className="text-3xl font-bold">{t("notFound")}</h1>
      <p className="max-w-md text-lg text-muted-foreground">{t("notFoundDesc")}</p>
      <Button size="lg" render={<Link href="/" />}>
        {t("goHome")}
      </Button>
    </main>
  );
}
