"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/forms/field";
import { PersonAvatar } from "@/components/person/person-avatar";
import { buildIndex } from "@/lib/family";
import { relationship } from "@/lib/kinship";
import { yearOf } from "@/lib/dates";
import type { FamilyData } from "@/types";

export function RelationshipCalculator({ data, initialA, initialB }: { data: FamilyData; initialA?: string; initialB?: string }) {
  const t = useTranslations("relationship");
  const idx = useMemo(() => buildIndex(data), [data]);
  const sorted = useMemo(() => [...data.persons].sort((a, b) => a.fullName.localeCompare(b.fullName)), [data]);
  const [a, setA] = useState(initialA ?? "");
  const [b, setB] = useState(initialB ?? "");

  const result = a && b ? relationship(idx, a, b) : null;
  const reverse = a && b ? relationship(idx, b, a) : null;
  const pa = idx.byId.get(a);
  const pb = idx.byId.get(b);

  const options = sorted.map((p) => (
    <option key={p.id} value={p.id}>
      {p.fullName}
      {yearOf(p.birthDate) ? ` (${yearOf(p.birthDate)})` : ""}
    </option>
  ));

  return (
    <div className="space-y-6">
      <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <Field label={t("personA")} htmlFor="rel-a">
          <NativeSelect id="rel-a" value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">—</option>
            {options}
          </NativeSelect>
        </Field>
        <Button
          variant="outline"
          size="icon"
          className="mx-auto"
          onClick={() => {
            setA(b);
            setB(a);
          }}
          aria-label={t("swap")}
          title={t("swap")}
        >
          <ArrowLeftRight className="size-5" />
        </Button>
        <Field label={t("personB")} htmlFor="rel-b">
          <NativeSelect id="rel-b" value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">—</option>
            {options}
          </NativeSelect>
        </Field>
      </div>

      {result && pa && pb && (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 text-center" aria-live="polite">
          <div className="mb-4 flex items-center justify-center gap-3">
            <PersonAvatar name={pa.fullName} photoPath={pa.photoPath} gender={pa.gender} isDeceased={pa.isDeceased} className="size-16 text-lg" />
            <Link2 className="size-6 text-primary" aria-hidden />
            <PersonAvatar name={pb.fullName} photoPath={pb.photoPath} gender={pb.gender} isDeceased={pb.isDeceased} className="size-16 text-lg" />
          </div>
          <p className="text-xl text-balance sm:text-2xl">
            <strong>{pa.fullName}</strong> adalah{" "}
            <strong className="text-primary">{result.label}</strong> dari <strong>{pb.fullName}</strong>
          </p>
          {result.detail && <p className="mt-2 text-muted-foreground">{result.detail}</p>}
          {reverse && result.kind !== "same" && result.kind !== "none" && (
            <p className="mt-4 border-t pt-4 text-lg text-muted-foreground">
              {t("reverse", { a: pa.fullName, b: pb.fullName, label: reverse.label })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
