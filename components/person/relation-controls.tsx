"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { removeParentLinkAction, removeUnionAction, updateParentLinkAction, updateUnionAction } from "@/lib/actions/relation";
import { deletePersonAction } from "@/lib/actions/person";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Field, NativeSelect } from "@/components/forms/field";
import { PARENT_TYPES, UNION_STATUSES, type ParentType, type UnionLite } from "@/types";

export function ParentLinkControls({ treeId, linkId, type, label }: { treeId: string; linkId: string; type: ParentType; label: string }) {
  const tp = useTranslations("parentType");
  const tr = useTranslations("relation");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <NativeSelect
        aria-label={tr("parentType")}
        className="h-9 w-auto px-2 text-sm"
        defaultValue={type}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const res = await updateParentLinkAction(treeId, { linkId, type: e.target.value });
            if (!res.ok) toast.error(res.error);
            router.refresh();
          })
        }
      >
        {PARENT_TYPES.map((p) => (
          <option key={p} value={p}>
            {tp(p)}
          </option>
        ))}
      </NativeSelect>
      <ConfirmButton
        title={`${tr("remove")}?`}
        description={label}
        onConfirm={() => removeParentLinkAction(treeId, linkId)}
        onDone={() => router.refresh()}
        trigger={
          <Button variant="ghost" size="icon" aria-label={tr("remove")}>
            <Trash2 className="size-4" />
          </Button>
        }
      />
    </div>
  );
}

export function UnionControls({ treeId, union, label }: { treeId: string; union: UnionLite; label: string }) {
  const tr = useTranslations("relation");
  const tu = useTranslations("unionStatus");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(union.status);
  const [marriageDate, setMarriageDate] = useState(union.marriageDate ?? "");
  const [endDate, setEndDate] = useState(union.endDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="ghost" size="icon" aria-label={tr("editUnion")} />}>
          <Pencil className="size-4" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">{tr("editUnion")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">{label}</p>
          <div className="space-y-4">
            <Field label={tr("unionStatus")} htmlFor={`us-${union.id}`}>
              <NativeSelect id={`us-${union.id}`} value={status} onChange={(e) => setStatus(e.target.value)}>
                {UNION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {tu(s)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr("marriageDate")} htmlFor={`md-${union.id}`}>
                <Input id={`md-${union.id}`} value={marriageDate} onChange={(e) => setMarriageDate(e.target.value)} placeholder="1980-05-17" />
              </Field>
              <Field label={tr("endDate")} htmlFor={`ed-${union.id}`}>
                <Input id={`ed-${union.id}`} value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="1990-01-01" />
              </Field>
            </div>
            {error && <p role="alert" className="font-medium text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await updateUnionAction(treeId, { unionId: union.id, status, marriageDate, endDate });
                    if (res.ok) {
                      toast.success(res.message);
                      setOpen(false);
                      router.refresh();
                    } else setError(Object.values(res.fieldErrors ?? {})[0]?.[0] ?? res.error);
                  })
                }
              >
                {pending ? tc("saving") : tc("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmButton
        title={`${tr("remove")}?`}
        description={label}
        onConfirm={() => removeUnionAction(treeId, union.id)}
        onDone={() => router.refresh()}
        trigger={
          <Button variant="ghost" size="icon" aria-label={tr("remove")}>
            <Trash2 className="size-4" />
          </Button>
        }
      />
    </div>
  );
}

export function DeletePersonButton({ treeId, personId, name }: { treeId: string; personId: string; name: string }) {
  const t = useTranslations("person");
  const tc = useTranslations("common");
  return (
    <ConfirmButton
      title={t("deleteTitle", { name })}
      description={t("deleteDesc")}
      onConfirm={() => deletePersonAction(treeId, personId)}
      trigger={
        <Button variant="destructive">
          <Trash2 className="size-4" aria-hidden /> {tc("delete")}
        </Button>
      }
    />
  );
}
