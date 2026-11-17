"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/person/person-avatar";
import { GENDERS, PARENT_TYPES, type ActionResult, type Gender } from "@/types";

export interface PersonFormValues {
  fullName?: string;
  nickname?: string | null;
  gender?: Gender;
  birthDate?: string | null;
  birthPlace?: string | null;
  isDeceased?: boolean;
  deathDate?: string | null;
  deathPlace?: string | null;
  occupation?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  photoPath?: string | null;
}

export interface RelationContext {
  kind: "parent" | "child" | "spouse";
  toId: string;
  toName: string;
  otherParentOptions?: { id: string; name: string }[];
}

export function PersonForm({
  action,
  defaults = {},
  relation,
  cancelHref,
}: {
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  defaults?: PersonFormValues;
  relation?: RelationContext;
  cancelHref: string;
}) {
  const tc = useTranslations("common");
  const [state, formAction] = useActionState(action, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  // React 19 mereset form setelah action; isian dikembalikan dari server agar tidak hilang saat ada error
  const submitted = state && !state.ok ? state.values : undefined;
  const vals: PersonFormValues = submitted
    ? { ...defaults, ...submitted, gender: submitted.gender as Gender, isDeceased: submitted.isDeceased === "on" }
    : defaults;
  const formKey = useRef(0);
  const lastState = useRef(state);
  if (lastState.current !== state) {
    lastState.current = state;
    formKey.current++;
  }

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {state && !state.ok && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-4 font-medium text-destructive">
          {state.error}
        </p>
      )}
      <PersonFields key={formKey.current} defaults={vals} fe={fe} relation={relation} />
      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <Button variant="outline" size="lg" render={<a href={cancelHref} />}>
          {tc("cancel")}
        </Button>
        <SubmitButton size="lg" pendingText={tc("saving")}>
          {tc("save")}
        </SubmitButton>
      </div>
    </form>
  );
}

function PersonFields({
  defaults,
  fe,
  relation,
}: {
  defaults: PersonFormValues;
  fe?: Record<string, string[] | undefined>;
  relation?: RelationContext;
}) {
  const t = useTranslations("person");
  const tc = useTranslations("common");
  const tg = useTranslations("gender");
  const tr = useTranslations("relation");
  const tp = useTranslations("parentType");
  const [deceased, setDeceased] = useState(!!defaults.isDeceased);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const v = (k: keyof PersonFormValues) => (defaults[k] as string | null | undefined) ?? "";

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPhotoError(null);
    if (!f) return setPreview(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setPhotoError("Format foto harus JPG, PNG, atau WebP.");
      e.target.value = "";
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setPhotoError("Ukuran foto maksimal 2 MB.");
      e.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(f));
  }

  const relLabel =
    relation?.kind === "child" ? tr("createNewChild") : relation?.kind === "parent" ? tr("createNewParent") : tr("createNewSpouse");

  return (
    <div className="space-y-8">
      {relation && (
        <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="font-semibold">
            {relLabel}: <span className="text-primary">{relation.toName}</span>
          </p>
          <input type="hidden" name="relKind" value={relation.kind} />
          <input type="hidden" name="relTo" value={relation.toId} />
          {relation.kind !== "spouse" && (
            <Field label={tr("parentType")} htmlFor="parentType">
              <NativeSelect id="parentType" name="parentType" defaultValue="BIOLOGICAL">
                {PARENT_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {tp(p)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          {relation.kind === "child" && relation.otherParentOptions && relation.otherParentOptions.length > 0 && (
            <Field label={tr("otherParent")} htmlFor="otherParent">
              <NativeSelect id="otherParent" name="otherParent" defaultValue={relation.otherParentOptions[0].id}>
                {relation.otherParentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
                <option value="">{tr("none")}</option>
              </NativeSelect>
            </Field>
          )}
        </div>
      )}

      <section className="grid gap-5 sm:grid-cols-2">
        <Field label={t("fullName")} htmlFor="fullName" error={fe?.fullName} required className="sm:col-span-2">
          <Input id="fullName" name="fullName" defaultValue={v("fullName")} required aria-invalid={!!fe?.fullName} />
        </Field>
        <Field label={t("nickname")} htmlFor="nickname" error={fe?.nickname}>
          <Input id="nickname" name="nickname" defaultValue={v("nickname")} />
        </Field>
        <Field label={t("gender")} htmlFor="gender" error={fe?.gender} required>
          <NativeSelect id="gender" name="gender" defaultValue={defaults.gender ?? "UNKNOWN"}>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {tg(g)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("birthDate")} htmlFor="birthDate" error={fe?.birthDate} hint={t("dateHint")}>
          <Input id="birthDate" name="birthDate" defaultValue={v("birthDate")} placeholder="1950-08-17" inputMode="numeric" aria-invalid={!!fe?.birthDate} />
        </Field>
        <Field label={t("birthPlace")} htmlFor="birthPlace" error={fe?.birthPlace}>
          <Input id="birthPlace" name="birthPlace" defaultValue={v("birthPlace")} />
        </Field>
        <Field label={t("occupation")} htmlFor="occupation" error={fe?.occupation} className="sm:col-span-2">
          <Input id="occupation" name="occupation" defaultValue={v("occupation")} />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border p-4">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold">
          <input
            type="checkbox"
            name="isDeceased"
            className="size-6 accent-[var(--primary)]"
            checked={deceased}
            onChange={(e) => setDeceased(e.target.checked)}
          />
          {t("isDeceased")}
        </label>
        {deceased && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("deathDate")} htmlFor="deathDate" error={fe?.deathDate}>
              <Input id="deathDate" name="deathDate" defaultValue={v("deathDate")} placeholder="2001-03-04" inputMode="numeric" aria-invalid={!!fe?.deathDate} />
            </Field>
            <Field label={t("deathPlace")} htmlFor="deathPlace" error={fe?.deathPlace}>
              <Input id="deathPlace" name="deathPlace" defaultValue={v("deathPlace")} />
            </Field>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <Field label={t("photo")} htmlFor="photo" error={photoError ?? fe?.photo} hint={t("photoHint")}>
          <div className="flex items-center gap-4">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="size-20 rounded-full object-cover" />
            ) : (
              <PersonAvatar name={defaults.fullName || "?"} photoPath={defaults.photoPath ?? null} gender={defaults.gender ?? "UNKNOWN"} className="size-20 text-xl" />
            )}
            <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} className="h-auto py-2" />
          </div>
        </Field>
        {defaults.photoPath && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="removePhoto" className="size-5" /> {t("removePhoto")}
          </label>
        )}
      </section>

      <Field label={t("bio")} htmlFor="bio" error={fe?.bio}>
        <Textarea id="bio" name="bio" rows={5} defaultValue={v("bio")} className="text-base" />
      </Field>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-semibold">
          {t("contact")} <span className="text-sm font-normal text-muted-foreground">({tc("optional")})</span>
        </legend>
        <Field label={t("phone")} htmlFor="phone" error={fe?.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={v("phone")} aria-invalid={!!fe?.phone} />
        </Field>
        <Field label={t("email")} htmlFor="email" error={fe?.email}>
          <Input id="email" name="email" type="email" defaultValue={v("email")} aria-invalid={!!fe?.email} />
        </Field>
      </fieldset>
    </div>
  );
}
