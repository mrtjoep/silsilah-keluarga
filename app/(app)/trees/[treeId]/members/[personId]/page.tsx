import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Briefcase, Cake, Flower2, GitFork, Heart, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { getFamilyData } from "@/lib/queries";
import { hasRole, requireTreePage } from "@/lib/permissions";
import { buildIndex, childIds, computeGenerations, siblingsOf, sortByBirth } from "@/lib/family";
import { ageBetween, formatDate, yearOf } from "@/lib/dates";
import { buildTimeline } from "@/lib/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonAvatar } from "@/components/person/person-avatar";
import { PersonChip } from "@/components/person/person-chip";
import { AddRelationDialog } from "@/components/person/add-relation-dialog";
import { DeletePersonButton, ParentLinkControls, UnionControls } from "@/components/person/relation-controls";
import { DeleteEventButton, LifeEventForm } from "@/components/person/life-event-form";
import { FlashToast } from "@/components/flash-toast";
import type { Gender } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const p = await prisma.person.findUnique({ where: { id: personId }, select: { fullName: true } });
  return { title: p?.fullName ?? "Profil" };
}

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ treeId: string; personId: string }>;
  searchParams: Promise<{ created?: string; updated?: string; warn?: string }>;
}) {
  const { treeId, personId } = await params;
  const sp = await searchParams;
  const { role } = await requireTreePage(treeId);
  const canEdit = hasRole(role, "EDITOR");
  const t = await getTranslations();

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId },
    include: { events: { orderBy: { date: "asc" } } },
  });
  if (!person) notFound();

  const data = await getFamilyData(treeId);
  const idx = buildIndex(data);
  const gen = computeGenerations(idx).get(personId);
  const parentLinks = idx.parents.get(personId) ?? [];
  const unions = idx.unions.get(personId) ?? [];
  const sibs = siblingsOf(idx, personId);
  const myChildren = sortByBirth(idx, childIds(idx, personId));
  const timeline = buildTimeline(idx, personId, person.events);
  const age = person.isDeceased ? ageBetween(person.birthDate, person.deathDate) : ageBetween(person.birthDate);
  const base = `/trees/${treeId}`;
  const href = (id: string) => `${base}/members/${id}`;
  const candidates = data.persons.map((p) => ({ id: p.id, name: p.fullName, year: String(yearOf(p.birthDate) ?? "") }));

  // Kelompokkan anak per pasangan agar pernikahan kedua terlihat jelas
  const childrenByUnion = new Map<string, string[]>();
  const assigned = new Set<string>();
  for (const u of unions) {
    const other = u.partner1Id === personId ? u.partner2Id : u.partner1Id;
    const kids = myChildren.filter((c) => (idx.parents.get(c) ?? []).some((l) => l.parentId === other));
    kids.forEach((k) => assigned.add(k));
    childrenByUnion.set(u.id, kids);
  }
  const otherChildren = myChildren.filter((c) => !assigned.has(c));
  const childNote = (c: string) => {
    const type = (idx.parents.get(c) ?? []).find((l) => l.parentId === personId)?.type;
    return type && type !== "BIOLOGICAL" ? t(`parentType.${type}`) : undefined;
  };
  const childLinkId = (c: string) => (idx.parents.get(c) ?? []).find((l) => l.parentId === personId)!;

  const SectionEmpty = () => <p className="text-muted-foreground">{t("person.noRelations")}</p>;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <FlashToast
        success={sp.created ? t("person.created") : sp.updated ? t("person.updated") : undefined}
        warning={sp.warn}
      />

      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <PersonAvatar
            name={person.fullName}
            photoPath={person.photoPath}
            gender={person.gender as Gender}
            isDeceased={person.isDeceased}
            className="size-28 self-center text-3xl sm:self-auto"
          />
          <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
            <h2 className="text-3xl font-bold text-balance">
              {person.fullName} {person.isDeceased && <span className="text-muted-foreground">†</span>}
            </h2>
            {person.nickname && <p className="text-lg text-muted-foreground">“{person.nickname}”</p>}
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="secondary">{t(`gender.${person.gender as Gender}`)}</Badge>
              <Badge variant={person.isDeceased ? "outline" : "default"}>
                {person.isDeceased ? t("person.deceased") : t("person.living")}
              </Badge>
              {age !== null && (
                <Badge variant="outline">{person.isDeceased ? t("person.ageAtDeath", { age }) : t("person.age", { age })}</Badge>
              )}
              {gen && <Badge variant="outline">{t("person.generation", { gen })}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:flex-col">
            <Button variant="outline" render={<Link href={`${base}?focus=${personId}`} />}>
              <GitFork className="size-4" aria-hidden /> {t("person.focus")}
            </Button>
            {canEdit && (
              <>
                <Button render={<Link href={`${href(personId)}/edit`} />}>
                  <Pencil className="size-4" aria-hidden /> {t("common.edit")}
                </Button>
                <DeletePersonButton treeId={treeId} personId={personId} name={person.fullName} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Informasi</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <InfoRow icon={Cake} label={t("person.born")}>
                  {[formatDate(person.birthDate), person.birthPlace].filter(Boolean).join(", ") || "—"}
                </InfoRow>
                {person.isDeceased && (
                  <InfoRow icon={Flower2} label={t("person.died")}>
                    {[formatDate(person.deathDate), person.deathPlace].filter(Boolean).join(", ") || "—"}
                  </InfoRow>
                )}
                {person.occupation && (
                  <InfoRow icon={Briefcase} label={t("person.occupation")}>
                    {person.occupation}
                  </InfoRow>
                )}
                {person.phone && (
                  <InfoRow icon={Phone} label={t("person.phone")}>
                    <a className="text-primary underline" href={`tel:${person.phone}`}>
                      {person.phone}
                    </a>
                  </InfoRow>
                )}
                {person.email && (
                  <InfoRow icon={Mail} label={t("person.email")}>
                    <a className="break-all text-primary underline" href={`mailto:${person.email}`}>
                      {person.email}
                    </a>
                  </InfoRow>
                )}
              </dl>
              {person.bio && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="mb-2 font-semibold">{t("person.bio")}</h3>
                  <p className="leading-relaxed whitespace-pre-line">{person.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t("person.timeline")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="relative space-y-5 border-l-2 border-primary/30 pl-6">
                {timeline.map((it, i) => (
                  <li key={i} className="relative">
                    <span
                      className={`absolute top-1.5 -left-[1.95rem] size-3.5 rounded-full border-2 border-background ${
                        it.kind === "death" ? "bg-muted-foreground" : it.kind === "event" ? "bg-chart-2" : "bg-primary"
                      }`}
                      aria-hidden
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">{formatDate(it.date) || "Tanggal tidak diketahui"}</p>
                        <p className="font-medium">{it.title}</p>
                        {it.description && <p className="text-muted-foreground">{it.description}</p>}
                      </div>
                      {canEdit && it.eventId && <DeleteEventButton treeId={treeId} eventId={it.eventId} title={it.title} />}
                    </div>
                  </li>
                ))}
              </ol>
              {canEdit && <LifeEventForm treeId={treeId} personId={personId} />}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">Keluarga</CardTitle>
            {canEdit && <AddRelationDialog treeId={treeId} personId={personId} personName={person.fullName} candidates={candidates} />}
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h3 className="mb-2 text-lg font-semibold">{t("person.parents")}</h3>
              {parentLinks.length === 0 ? (
                <SectionEmpty />
              ) : (
                <div className="space-y-2">
                  {parentLinks.map((l) => {
                    const p = idx.byId.get(l.parentId)!;
                    return (
                      <PersonChip key={l.id} person={p} href={href(p.id)} note={l.type !== "BIOLOGICAL" ? t(`parentType.${l.type}`) : undefined}>
                        {canEdit && <ParentLinkControls treeId={treeId} linkId={l.id} type={l.type} label={`${p.fullName} → ${person.fullName}`} />}
                      </PersonChip>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-lg font-semibold">{t("person.spouses")}</h3>
              {unions.length === 0 ? (
                <SectionEmpty />
              ) : (
                <div className="space-y-4">
                  {unions.map((u, i) => {
                    const other = idx.byId.get(u.partner1Id === personId ? u.partner2Id : u.partner1Id)!;
                    const kids = childrenByUnion.get(u.id) ?? [];
                    const note = [
                      unions.length > 1 ? `Pasangan ke-${i + 1}` : null,
                      t(`unionStatus.${u.status}`),
                      u.marriageDate ? `nikah ${formatDate(u.marriageDate)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div key={u.id} className="space-y-2">
                        <PersonChip person={other} href={href(other.id)} note={note}>
                          <Heart className={`size-4 ${u.status === "MARRIED" ? "fill-primary text-primary" : "text-muted-foreground"}`} aria-hidden />
                          {canEdit && <UnionControls treeId={treeId} union={u} label={`${person.fullName} & ${other.fullName}`} />}
                        </PersonChip>
                        {kids.length > 0 && (
                          <div className="ml-6 space-y-2 border-l-2 pl-4">
                            <p className="text-sm font-semibold text-muted-foreground">
                              {t("person.children")} ({kids.length})
                            </p>
                            {kids.map((c) => (
                              <PersonChip key={c} person={idx.byId.get(c)!} href={href(c)} note={childNote(c)}>
                                {canEdit && (
                                  <ParentLinkControls
                                    treeId={treeId}
                                    linkId={childLinkId(c).id}
                                    type={childLinkId(c).type}
                                    label={`${person.fullName} → ${idx.byId.get(c)!.fullName}`}
                                  />
                                )}
                              </PersonChip>
                            ))}
                          </div>
                        )}
                        {canEdit && (
                          <Button
                            variant="link"
                            size="sm"
                            className="ml-6"
                            render={<Link href={`${base}/members/new?relKind=child&relTo=${personId}&with=${other.id}`} />}
                          >
                            + {t("relation.createNewChild")}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {(otherChildren.length > 0 || unions.length === 0) && (
              <section>
                <h3 className="mb-2 text-lg font-semibold">
                  {t("person.children")} {unions.length > 0 && <span className="text-sm font-normal text-muted-foreground">(tanpa pasangan tercatat)</span>}
                </h3>
                {otherChildren.length === 0 ? (
                  <SectionEmpty />
                ) : (
                  <div className="space-y-2">
                    {otherChildren.map((c) => (
                      <PersonChip key={c} person={idx.byId.get(c)!} href={href(c)} note={childNote(c)}>
                        {canEdit && (
                          <ParentLinkControls
                            treeId={treeId}
                            linkId={childLinkId(c).id}
                            type={childLinkId(c).type}
                            label={`${person.fullName} → ${idx.byId.get(c)!.fullName}`}
                          />
                        )}
                      </PersonChip>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-lg font-semibold">
                {t("person.siblings")} <span className="text-sm font-normal text-muted-foreground">(terdeteksi otomatis)</span>
              </h3>
              {sibs.full.length === 0 ? (
                <SectionEmpty />
              ) : (
                <div className="space-y-2">
                  {sibs.full.map((s) => (
                    <PersonChip key={s} person={idx.byId.get(s)!} href={href(s)} />
                  ))}
                </div>
              )}
            </section>
            {sibs.half.length > 0 && (
              <section>
                <h3 className="mb-2 text-lg font-semibold">{t("person.halfSiblings")}</h3>
                <div className="space-y-2">
                  {sibs.half.map((s) => (
                    <PersonChip key={s} person={idx.byId.get(s)!} href={href(s)} />
                  ))}
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="font-medium">{children}</dd>
      </div>
    </div>
  );
}
