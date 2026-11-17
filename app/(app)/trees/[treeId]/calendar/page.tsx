import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Cake, CalendarX, Flower2 } from "lucide-react";
import { getFamilyData } from "@/lib/queries";
import { requireTreePage } from "@/lib/permissions";
import { anniversaries, type Anniversary } from "@/lib/calendar";
import { monthName } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonAvatar } from "@/components/person/person-avatar";

export const metadata = { title: "Kalender" };

export default async function CalendarPage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  await requireTreePage(treeId);
  const t = await getTranslations("calendar");
  const data = await getFamilyData(treeId);
  const all = anniversaries(data.persons);
  const upcoming = all.filter((a) => a.daysUntil <= 30);
  const byMonth = Array.from({ length: 12 }, (_, i) =>
    all.filter((a) => a.month === i + 1).sort((a, b) => a.day - b.day),
  );
  const currentMonth = new Date().getMonth();

  const Item = ({ a, showCountdown }: { a: Anniversary; showCountdown?: boolean }) => (
    <li>
      <Link
        href={`/trees/${treeId}/members/${a.person.id}`}
        className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="grid w-14 shrink-0 place-items-center rounded-lg bg-primary/10 py-1 text-primary">
          <span className="text-xl leading-none font-bold">{a.day}</span>
          <span className="text-xs font-semibold uppercase">{monthName(a.month).slice(0, 3)}</span>
        </span>
        <PersonAvatar name={a.person.fullName} photoPath={a.person.photoPath} gender={a.person.gender} isDeceased={a.person.isDeceased} className="size-11" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{a.person.fullName}</span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {a.kind === "birthday" ? <Cake className="size-4 text-primary" aria-hidden /> : <Flower2 className="size-4" aria-hidden />}
            {a.kind === "birthday"
              ? a.years
                ? t("birthday", { age: a.years })
                : t("birthdayNoAge")
              : t("memorial", { years: a.years ?? 0 })}
          </span>
        </span>
        {showCountdown && (
          <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${a.daysUntil === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {a.daysUntil === 0 ? t("today") : t("inDays", { days: a.daysUntil })}
          </span>
        )}
      </Link>
    </li>
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">{t("note")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("upcoming")}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <CalendarX className="size-5" aria-hidden /> {t("nothingUpcoming")}
            </p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {upcoming.map((a) => (
                <Item key={`${a.kind}-${a.person.id}`} a={a} showCountdown />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-4 text-xl font-bold">{t("byMonth")}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {byMonth.map((_, i) => {
            const m = (currentMonth + i) % 12; // mulai dari bulan ini
            const items = byMonth[m];
            return (
              <Card key={m} className={items.length === 0 ? "opacity-70" : undefined}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {monthName(m + 1)} <span className="font-normal text-muted-foreground">({items.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-muted-foreground">—</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((a) => (
                        <Item key={`${a.kind}-${a.person.id}`} a={a} />
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
