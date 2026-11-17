"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/lib/actions/locale";

const LABELS: Record<string, string> = { id: "ID", en: "EN" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-1 rounded-lg px-1 text-sm text-muted-foreground" title={t("language")}>
      <Languages className="size-4" aria-hidden />
      <span className="sr-only">{t("language")}</span>
      <select
        className="h-9 cursor-pointer rounded-md bg-transparent font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={locale}
        disabled={pending}
        onChange={(e) => start(async () => {
          await setLocaleAction(e.target.value);
          router.refresh();
        })}
      >
        {Object.entries(LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}
