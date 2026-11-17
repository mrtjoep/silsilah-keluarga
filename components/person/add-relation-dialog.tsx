"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Plus, UserPlus } from "lucide-react";
import { addRelationAction } from "@/lib/actions/relation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, NativeSelect } from "@/components/forms/field";
import { PARENT_TYPES, UNION_STATUSES } from "@/types";

type Kind = "parent" | "child" | "spouse";

export function AddRelationDialog({
  treeId,
  personId,
  personName,
  candidates,
  defaultKind = "child",
}: {
  treeId: string;
  personId: string;
  personName: string;
  candidates: { id: string; name: string; year: string }[];
  defaultKind?: Kind;
}) {
  const t = useTranslations("relation");
  const tc = useTranslations("common");
  const tp = useTranslations("parentType");
  const tu = useTranslations("unionStatus");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [query, setQuery] = useState("");
  const [relatedId, setRelatedId] = useState("");
  const [parentType, setParentType] = useState("BIOLOGICAL");
  const [unionStatus, setUnionStatus] = useState("MARRIED");
  const [marriageDate, setMarriageDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => c.id !== personId && (!q || c.name.toLowerCase().includes(q))).slice(0, 100);
  }, [candidates, query, personId]);

  function submit() {
    setError(null);
    if (!relatedId) return setError("Pilih anggota keluarga terlebih dahulu.");
    start(async () => {
      const res = await addRelationAction(treeId, { personId, relatedId, kind, parentType, unionStatus, marriageDate });
      if (res.ok) {
        toast.success(res.message ?? t("added"));
        setOpen(false);
        setRelatedId("");
        setQuery("");
        router.refresh();
      } else setError(res.error);
    });
  }

  const kinds: { k: Kind; label: string }[] = [
    { k: "parent", label: t("addParent") },
    { k: "child", label: t("addChild") },
    { k: "spouse", label: t("addSpouse") },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden /> {t("add")}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t("add")} — {personName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div role="radiogroup" aria-label={t("kind")} className="grid grid-cols-3 gap-2">
            {kinds.map(({ k, label }) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-11 rounded-lg border-2 px-2 font-semibold transition-colors ${
                  kind === k ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Field label={t("choosePerson")} htmlFor="rel-search">
            {candidates.length > 6 && (
              <Input id="rel-search" placeholder="Ketik nama..." value={query} onChange={(e) => setQuery(e.target.value)} />
            )}
            {/* Daftar tombol (bukan <select>) agar pilihan selalu tercatat di semua browser/ponsel */}
            <div
              role="radiogroup"
              aria-label={t("choosePerson")}
              className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-lg border p-1.5"
            >
              {filtered.length === 0 ? (
                <p className="p-3 text-muted-foreground">
                  {candidates.length <= 1 ? "Belum ada anggota lain di pohon ini." : "Tidak ada nama yang cocok."}
                </p>
              ) : (
                filtered.map((c) => {
                  const active = relatedId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setRelatedId(c.id);
                        setError(null);
                      }}
                      className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md border-2 px-3 py-2 text-left transition-colors ${
                        active ? "border-primary bg-primary/10 font-semibold text-primary" : "border-transparent hover:bg-accent"
                      }`}
                    >
                      <span>
                        {c.name} {c.year && <span className="text-muted-foreground">({c.year})</span>}
                      </span>
                      {active && <Check className="size-5 shrink-0" aria-hidden />}
                    </button>
                  );
                })
              )}
            </div>
          </Field>

          {kind !== "spouse" ? (
            <Field label={t("parentType")} htmlFor="rel-ptype">
              <NativeSelect id="rel-ptype" value={parentType} onChange={(e) => setParentType(e.target.value)}>
                {PARENT_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {tp(p)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("unionStatus")} htmlFor="rel-ustatus">
                <NativeSelect id="rel-ustatus" value={unionStatus} onChange={(e) => setUnionStatus(e.target.value)}>
                  {UNION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {tu(s)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("marriageDate")} htmlFor="rel-mdate">
                <Input id="rel-mdate" placeholder="1980-05-17" value={marriageDate} onChange={(e) => setMarriageDate(e.target.value)} />
              </Field>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="link"
              className="px-0"
              render={<Link href={`/trees/${treeId}/members/new?relKind=${kind}&relTo=${personId}`} />}
            >
              <UserPlus className="size-4" aria-hidden /> {t("orCreate")}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? tc("saving") : tc("save")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
