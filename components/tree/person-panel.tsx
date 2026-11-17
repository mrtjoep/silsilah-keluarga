"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Cake, Flower2, Briefcase, GitFork, Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PersonAvatar } from "@/components/person/person-avatar";
import { ageBetween, formatDate } from "@/lib/dates";
import { buildIndex, childIds, parentIds, siblingsOf, sortByBirth, type FamilyIndex } from "@/lib/family";
import type { FamilyData } from "@/types";

export function PersonPanel({
  data,
  personId,
  onSelect,
  onFocus,
  profileHref,
  editHref,
}: {
  data: FamilyData;
  personId: string;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  profileHref?: string;
  editHref?: string;
}) {
  const t = useTranslations();
  const idx = useMemo(() => buildIndex(data), [data]);
  const p = idx.byId.get(personId);
  if (!p) return null;
  const age = p.isPrivate ? null : p.isDeceased ? ageBetween(p.birthDate, p.deathDate) : ageBetween(p.birthDate);
  const unions = idx.unions.get(personId) ?? [];
  const sib = siblingsOf(idx, personId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <PersonAvatar name={p.fullName} photoPath={p.photoPath} gender={p.gender} isDeceased={p.isDeceased} className="size-24 text-2xl" />
        <div>
          <h2 className="text-2xl font-bold text-balance">{p.fullName}</h2>
          {p.nickname && <p className="text-muted-foreground">“{p.nickname}”</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary">{t(`gender.${p.gender}`)}</Badge>
          <Badge variant={p.isDeceased ? "outline" : "default"}>{p.isDeceased ? t("person.deceased") : t("person.living")}</Badge>
          {age !== null && <Badge variant="outline">{p.isDeceased ? t("person.ageAtDeath", { age }) : t("person.age", { age })}</Badge>}
        </div>
      </div>

      {p.isPrivate ? (
        <p className="rounded-lg bg-muted p-3 text-center text-muted-foreground">{t("person.private")}</p>
      ) : (
        <dl className="space-y-3 text-base">
          {(p.birthDate || p.birthPlace) && (
            <Row icon={<Cake className="size-5 text-primary" />} label={t("person.born")}>
              {[formatDate(p.birthDate), p.birthPlace].filter(Boolean).join(", ")}
            </Row>
          )}
          {p.isDeceased && (p.deathDate || p.deathPlace) && (
            <Row icon={<Flower2 className="size-5 text-primary" />} label={t("person.died")}>
              {[formatDate(p.deathDate), p.deathPlace].filter(Boolean).join(", ")}
            </Row>
          )}
          {p.occupation && (
            <Row icon={<Briefcase className="size-5 text-primary" />} label={t("person.occupation")}>
              {p.occupation}
            </Row>
          )}
        </dl>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onFocus(personId)}>
          <GitFork className="size-4" aria-hidden /> {t("person.focus")}
        </Button>
        {profileHref && (
          <Button className="flex-1" render={<Link href={profileHref} />}>
            <User className="size-4" aria-hidden /> {t("common.viewProfile")}
          </Button>
        )}
        {editHref && (
          <Button variant="secondary" className="flex-1" render={<Link href={editHref} />}>
            <Pencil className="size-4" aria-hidden /> {t("common.edit")}
          </Button>
        )}
      </div>

      <RelGroup title={t("person.parents")} ids={parentIds(idx, personId)} idx={idx} onSelect={onSelect} />
      <RelGroup
        title={t("person.spouses")}
        ids={unions.map((u) => (u.partner1Id === personId ? u.partner2Id : u.partner1Id))}
        notes={unions.map((u) => t(`unionStatus.${u.status}`))}
        idx={idx}
        onSelect={onSelect}
      />
      <RelGroup title={t("person.children")} ids={sortByBirth(idx, childIds(idx, personId))} idx={idx} onSelect={onSelect} />
      <RelGroup title={t("person.siblings")} ids={sib.full} idx={idx} onSelect={onSelect} />
      {sib.half.length > 0 && <RelGroup title={t("person.halfSiblings")} ids={sib.half} idx={idx} onSelect={onSelect} />}
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="mt-0.5">{icon}</span>
      <div>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="font-medium">{children}</dd>
      </div>
    </div>
  );
}

function RelGroup({
  title,
  ids,
  notes,
  idx,
  onSelect,
}: {
  title: string;
  ids: string[];
  notes?: string[];
  idx: FamilyIndex;
  onSelect: (id: string) => void;
}) {
  if (ids.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 font-semibold text-muted-foreground">{title}</h3>
      <ul className="space-y-1.5">
        {ids.map((id, i) => {
          const r = idx.byId.get(id)!;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-2 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
              >
                <PersonAvatar name={r.fullName} photoPath={r.photoPath} gender={r.gender} isDeceased={r.isDeceased} className="size-10 text-sm" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.fullName}</span>
                  {notes?.[i] && <span className="block text-sm text-muted-foreground">{notes[i]}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
