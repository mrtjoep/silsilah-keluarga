import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export async function UserMenu({ name }: { name: string }) {
  const t = await getTranslations("nav");
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">{name}</span>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="sm" aria-label={t("logout")}>
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t("logout")}</span>
        </Button>
      </form>
    </div>
  );
}
