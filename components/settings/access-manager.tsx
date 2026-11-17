"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { addAccessAction, removeAccessAction, updateAccessAction } from "@/lib/actions/tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { ROLES } from "@/types";

export function AccessManager({
  treeId,
  currentUserId,
  members,
}: {
  treeId: string;
  currentUserId: string;
  members: { userId: string; name: string; email: string; role: string }[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, action] = useActionState(addAccessAction.bind(null, treeId), null);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef(state);
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state?.ok) {
      toast.success(state.message);
      formRef.current?.reset();
    }
  }, [state]);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">{t("settings.roleHelp")}</p>
      <ul className="divide-y rounded-xl border">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-3 p-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {m.name} {m.userId === currentUserId && <span className="text-muted-foreground">({t("settings.you")})</span>}
              </span>
              <span className="block truncate text-sm text-muted-foreground">{m.email}</span>
            </span>
            <NativeSelect
              aria-label="Peran"
              className="h-10 w-36"
              defaultValue={m.role}
              disabled={pending}
              onChange={(e) =>
                start(async () => {
                  const res = await updateAccessAction(treeId, m.userId, e.target.value);
                  if (!res.ok) toast.error(res.error);
                  else toast.success("Peran diperbarui.");
                  router.refresh();
                })
              }
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </NativeSelect>
            <ConfirmButton
              title={`Hapus akses ${m.name}?`}
              description="Pengguna ini tidak bisa lagi membuka pohon."
              onConfirm={() => removeAccessAction(treeId, m.userId)}
              onDone={() => router.refresh()}
              trigger={
                <Button variant="ghost" size="icon" aria-label={`Hapus akses ${m.name}`}>
                  <Trash2 className="size-4" />
                </Button>
              }
            />
          </li>
        ))}
      </ul>
      <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Field label={t("auth.email")} htmlFor="access-email" error={fe?.email}>
          <Input id="access-email" name="email" type="email" required placeholder="nama@email.com" />
        </Field>
        <Field label="Peran" htmlFor="access-role">
          <NativeSelect id="access-role" name="role" defaultValue="VIEWER">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <SubmitButton pendingText="...">
          <UserPlus className="size-4" aria-hidden /> {t("settings.addUser")}
        </SubmitButton>
      </form>
      <p className="text-sm text-muted-foreground">{t("settings.accessDesc")}</p>
    </div>
  );
}
