"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { addLifeEventAction, deleteLifeEventAction } from "@/lib/actions/person";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ConfirmButton } from "@/components/forms/confirm-button";

export function LifeEventForm({ treeId, personId }: { treeId: string; personId: string }) {
  const t = useTranslations("person");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(addLifeEventAction.bind(null, treeId, personId), null);
  const handled = useRef(state);
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state?.ok) {
      toast.success(state.message);
      setOpen(false);
    }
  }, [state]);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> {t("addEvent")}
      </Button>
    );
  return (
    <form action={action} className="space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label={t("eventTitle")} htmlFor="ev-title" error={fe?.title} required>
          <Input id="ev-title" name="title" required />
        </Field>
        <Field label={t("eventDate")} htmlFor="ev-date" error={fe?.date}>
          <Input id="ev-date" name="date" placeholder="1990-06-01" />
        </Field>
      </div>
      <Field label={t("eventDesc")} htmlFor="ev-desc" error={fe?.description}>
        <Input id="ev-desc" name="description" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          {tc("cancel")}
        </Button>
        <SubmitButton pendingText={tc("saving")}>{tc("save")}</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteEventButton({ treeId, eventId, title }: { treeId: string; eventId: string; title: string }) {
  return (
    <ConfirmButton
      title={`Hapus "${title}"?`}
      onConfirm={() => deleteLifeEventAction(treeId, eventId)}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label="Hapus peristiwa">
          <Trash2 className="size-4" />
        </Button>
      }
    />
  );
}
