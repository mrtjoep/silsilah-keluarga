"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createTreeAction } from "@/lib/actions/tree";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export function CreateTreeForm() {
  const t = useTranslations("trees");
  const tc = useTranslations("common");
  const [state, action] = useActionState(createTreeAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-4">
      <Field label={t("name")} htmlFor="name" error={fe?.name} required>
        <Input id="name" name="name" placeholder={t("namePlaceholder")} required aria-invalid={!!fe?.name} />
      </Field>
      <Field label={`${t("description")} (${tc("optional")})`} htmlFor="description" error={fe?.description}>
        <Textarea id="description" name="description" rows={3} />
      </Field>
      <SubmitButton pendingText={tc("saving")}>{t("create")}</SubmitButton>
    </form>
  );
}
