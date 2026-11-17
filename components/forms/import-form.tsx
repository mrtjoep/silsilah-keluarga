"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Upload } from "lucide-react";
import { importAction } from "@/lib/actions/data";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export function ImportForm({ treeId }: { treeId: string }) {
  const t = useTranslations("data");
  const [state, action] = useActionState(importAction.bind(null, treeId), null);
  return (
    <form action={action} className="space-y-4">
      <Field label={t("file")} htmlFor="import-file" hint=".ged / .csv — maks. 5 MB">
        <Input id="import-file" name="file" type="file" accept=".ged,.csv,text/csv" required className="h-auto py-2" />
      </Field>
      {state && !state.ok && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 font-medium text-destructive">
          {state.error}
        </p>
      )}
      {state?.ok && state.data && (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 font-medium">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <span>
            {t("imported", { persons: state.data.persons, links: state.data.links, unions: state.data.unions })}
            {state.data.skipped > 0 && ` (${state.data.skipped} baris dilewati karena tidak valid)`}
          </span>
        </p>
      )}
      <SubmitButton pendingText={t("importing")}>
        <Upload className="size-4" aria-hidden /> {t("importButton")}
      </SubmitButton>
    </form>
  );
}
