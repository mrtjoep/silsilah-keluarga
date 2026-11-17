"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { registerAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export function RegisterForm() {
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
  // input terkontrol agar isian tidak hilang ketika React mereset form setelah action
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, action] = useActionState(registerAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 font-medium text-destructive">
          {state.error}
        </p>
      )}
      <Field label={t("name")} htmlFor="name" error={fe?.name} required>
        <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required aria-invalid={!!fe?.name} />
      </Field>
      <Field label={t("email")} htmlFor="email" error={fe?.email} required>
        <Input id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required aria-invalid={!!fe?.email} />
      </Field>
      <Field label={t("password")} htmlFor="password" error={fe?.password} hint={t("passwordHint")} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!fe?.password} />
      </Field>
      <Field label={t("confirmPassword")} htmlFor="confirmPassword" error={fe?.confirmPassword} required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required aria-invalid={!!fe?.confirmPassword} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="...">
        {tn("register")}
      </SubmitButton>
      <p className="text-center text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          {tn("login")}
        </Link>
      </p>
    </form>
  );
}
