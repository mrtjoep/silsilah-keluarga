"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, CalendarHeart, Database, GitFork, Link2, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function TreeNav({ treeId, isAdmin, canEdit }: { treeId: string; isAdmin: boolean; canEdit: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const base = `/trees/${treeId}`;
  const items = [
    { href: base, label: t("tree"), icon: GitFork, exact: true },
    { href: `${base}/members`, label: t("members"), icon: Users },
    { href: `${base}/calendar`, label: t("calendar"), icon: CalendarHeart },
    { href: `${base}/relationship`, label: t("relationship"), icon: Link2 },
    { href: `${base}/stats`, label: t("stats"), icon: BarChart3 },
    ...(canEdit ? [{ href: `${base}/data`, label: t("data"), icon: Database }] : []),
    ...(isAdmin ? [{ href: `${base}/settings`, label: t("settings"), icon: Settings }] : []),
  ];
  return (
    <nav aria-label="Navigasi pohon" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                )}
              >
                <it.icon className="size-4" aria-hidden />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
