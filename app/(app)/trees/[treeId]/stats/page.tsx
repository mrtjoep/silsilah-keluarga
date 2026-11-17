import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getFamilyData } from "@/lib/queries";
import { requireTreePage } from "@/lib/permissions";
import { familyStats } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonAvatar } from "@/components/person/person-avatar";

export const metadata = { title: "Statistik" };

export default async function StatsPage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  await requireTreePage(treeId);
  const t = await getTranslations();
  const s = familyStats(await getFamilyData(treeId));
  const yrs = (n: number | null) => (n === null ? "—" : t("stats.years", { n }));

  const tiles: [string, string | number][] = [
    [t("stats.total"), s.total],
    [t("stats.living"), s.living],
    [t("stats.deceased"), s.deceased],
    [t("stats.generations"), s.generations],
    [t("stats.avgLifespan"), yrs(s.avgLifespan)],
    [t("stats.avgAgeLiving"), yrs(s.avgAgeLiving)],
    [t("stats.marriages"), s.marriages],
    [t("stats.avgChildren"), s.avgChildren ?? "—"],
  ];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <h2 className="text-2xl font-bold">{t("stats.title")}</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("stats.byGeneration")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList rows={s.byGeneration.map(([g, n]) => [t("person.generation", { gen: g }), n])} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("stats.topPlaces")}</CardTitle>
          </CardHeader>
          <CardContent>
            {s.topPlaces.length ? <BarList rows={s.topPlaces} /> : <p className="text-muted-foreground">—</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("stats.byGender")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-3 text-center">
              {[
                [t("gender.MALE"), s.male],
                [t("gender.FEMALE"), s.female],
                [t("gender.UNKNOWN"), s.unknownGender],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-muted p-3">
                  <dt className="text-sm text-muted-foreground">{l}</dt>
                  <dd className="text-2xl font-bold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("stats.oldestLiving")}</CardTitle>
          </CardHeader>
          <CardContent>
            {s.oldestLiving ? (
              <Link href={`/trees/${treeId}/members/${s.oldestLiving.person.id}`} className="flex items-center gap-4 hover:text-primary">
                <PersonAvatar
                  name={s.oldestLiving.person.fullName}
                  photoPath={s.oldestLiving.person.photoPath}
                  gender={s.oldestLiving.person.gender}
                  className="size-16 text-lg"
                />
                <span>
                  <span className="block text-xl font-semibold">{s.oldestLiving.person.fullName}</span>
                  <span className="text-muted-foreground">{s.oldestLiving.age !== null && t("person.age", { age: s.oldestLiving.age })}</span>
                </span>
              </Link>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

/** Bar horizontal satu seri: label & nilai memakai warna teks, batang memakai warna utama. */
function BarList({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <ul className="space-y-3">
      {rows.map(([label, n]) => (
        <li key={label} title={`${label}: ${n}`} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3">
          <span className="truncate">{label}</span>
          <span className="h-3 rounded-r bg-muted" aria-hidden>
            <span className="block h-full rounded-r bg-primary" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="text-right font-semibold tabular-nums">{n}</span>
        </li>
      ))}
    </ul>
  );
}
