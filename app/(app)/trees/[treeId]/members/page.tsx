import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, SearchX, Users } from "lucide-react";
import { getFamilyData } from "@/lib/queries";
import { hasRole, requireTreePage } from "@/lib/permissions";
import { buildIndex, computeGenerations } from "@/lib/family";
import { yearOf } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/forms/field";
import { PersonChip } from "@/components/person/person-chip";

export const metadata = { title: "Anggota" };

type SP = { q?: string; gen?: string; from?: string; to?: string; place?: string; status?: string };

export default async function MembersPage({ params, searchParams }: { params: Promise<{ treeId: string }>; searchParams: Promise<SP> }) {
  const { treeId } = await params;
  const sp = await searchParams;
  const { role } = await requireTreePage(treeId);
  const t = await getTranslations();
  const data = await getFamilyData(treeId);
  const idx = buildIndex(data);
  const gens = computeGenerations(idx);
  const maxGen = Math.max(0, ...gens.values());
  const places = [...new Set(data.persons.map((p) => p.birthPlace).filter(Boolean) as string[])].sort();

  const q = sp.q?.trim().toLowerCase() ?? "";
  const gen = Number(sp.gen) || null;
  const from = Number(sp.from) || null;
  const to = Number(sp.to) || null;
  const filtered = data.persons
    .filter((p) => {
      if (q && !p.fullName.toLowerCase().includes(q) && !(p.nickname ?? "").toLowerCase().includes(q)) return false;
      if (gen && gens.get(p.id) !== gen) return false;
      const y = yearOf(p.birthDate);
      if (from && (!y || y < from)) return false;
      if (to && (!y || y > to)) return false;
      if (sp.place && p.birthPlace !== sp.place) return false;
      if (sp.status === "living" && p.isDeceased) return false;
      if (sp.status === "deceased" && !p.isDeceased) return false;
      return true;
    })
    .sort((a, b) => (gens.get(a.id)! - gens.get(b.id)!) || (a.birthDate ?? "9999").localeCompare(b.birthDate ?? "9999"));

  const hasFilter = !!(q || gen || from || to || sp.place || sp.status);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{t("members.title")}</h2>
        {hasRole(role, "EDITOR") && (
          <Button render={<Link href={`/trees/${treeId}/members/new`} />}>
            <Plus className="size-4" aria-hidden /> {t("person.add")}
          </Button>
        )}
      </div>

      <form role="search" className="mb-6 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="sr-only">{t("common.search")}</span>
          <Input name="q" defaultValue={sp.q} placeholder={t("members.searchPlaceholder")} type="search" />
        </label>
        <NativeSelect name="gen" defaultValue={sp.gen ?? ""} aria-label={t("members.filterGeneration")}>
          <option value="">{t("members.allGenerations")}</option>
          {Array.from({ length: maxGen }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {t("person.generation", { gen: i + 1 })}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="place" defaultValue={sp.place ?? ""} aria-label={t("members.place")}>
          <option value="">{t("members.place")}: {t("members.all")}</option>
          {places.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </NativeSelect>
        <div className="flex items-center gap-2">
          <Input name="from" defaultValue={sp.from} placeholder={t("members.birthFrom")} aria-label={t("members.birthFrom")} inputMode="numeric" />
          <span aria-hidden>–</span>
          <Input name="to" defaultValue={sp.to} placeholder={t("members.birthTo")} aria-label={t("members.birthTo")} inputMode="numeric" />
        </div>
        <NativeSelect name="status" defaultValue={sp.status ?? ""} aria-label={t("members.status")}>
          <option value="">{t("members.status")}: {t("members.all")}</option>
          <option value="living">{t("person.living")}</option>
          <option value="deceased">{t("person.deceased")}</option>
        </NativeSelect>
        <div className="flex gap-2 sm:col-span-2 sm:justify-end lg:col-span-1">
          {hasFilter && (
            <Button variant="ghost" render={<Link href={`/trees/${treeId}/members`} />}>
              {t("common.reset")}
            </Button>
          )}
          <Button type="submit">{t("common.search")}</Button>
        </div>
      </form>

      <p className="mb-3 text-muted-foreground" aria-live="polite">
        {t("members.count", { count: filtered.length })}
      </p>

      {data.persons.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-10 text-center">
          <Users className="mx-auto size-12 text-primary" aria-hidden />
          <p className="mt-3 text-lg font-semibold">{t("tree.empty")}</p>
          <p className="text-muted-foreground">{t("tree.emptyHint")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-10 text-center">
          <SearchX className="mx-auto size-12 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-lg">{t("members.empty")}</p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <PersonChip
                person={p}
                href={`/trees/${treeId}/members/${p.id}`}
                note={[t("person.generation", { gen: gens.get(p.id)! }), p.birthPlace].filter(Boolean).join(" · ")}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
