"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { loginAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
  // input terkontrol agar isian tidak hilang ketika React mereset form setelah action
  const [email, setEmail] = useState("");
  const [state, action] = useActionState(loginAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/trees"} />
      {state && !state.ok && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 font-medium text-destructive">
          {state.error}
        </p>
      )}
      <Field label={t("email")} htmlFor="email" error={fe?.email} required>
        <Input id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required aria-invalid={!!fe?.email} />
      </Field>
      <Field label={t("password")} htmlFor="password" error={fe?.password} required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="...">
        {tn("login")}
      </SubmitButton>
      <p className="text-center text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
          {tn("register")}
        </Link>
      </p>
    </form>
  );
}
