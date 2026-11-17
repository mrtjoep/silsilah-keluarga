"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteTreeAction, updateTreeAction } from "@/lib/actions/tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ConfirmButton } from "@/components/forms/confirm-button";

export function TreeGeneralForm({ treeId, name, description }: { treeId: string; name: string; description: string | null }) {
  const t = useTranslations();
  const [state, action] = useActionState(updateTreeAction.bind(null, treeId), null);
  const handled = useRef(state);
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state?.ok) toast.success(state.message);
    else if (state) toast.error(state.error);
  }, [state]);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-4">
      <Field label={t("trees.name")} htmlFor="tree-name" error={fe?.name} required>
        <Input id="tree-name" name="name" defaultValue={name} required />
      </Field>
      <Field label={t("trees.description")} htmlFor="tree-desc" error={fe?.description}>
        <Textarea id="tree-desc" name="description" defaultValue={description ?? ""} rows={3} className="text-base" />
      </Field>
      <SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>
    </form>
  );
}

export function DeleteTreeButton({ treeId, name }: { treeId: string; name: string }) {
  const t = useTranslations("settings");
  return (
    <ConfirmButton
      title={`${t("deleteTree")}: ${name}?`}
      description={t("deleteTreeDesc")}
      confirmLabel={t("deleteTree")}
      onConfirm={() => deleteTreeAction(treeId)}
      trigger={
        <Button variant="destructive">
          <Trash2 className="size-4" aria-hidden /> {t("deleteTree")}
        </Button>
      }
    />
  );
}
