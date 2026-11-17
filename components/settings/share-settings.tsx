"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { regenerateSlugAction, updateShareAction } from "@/lib/actions/tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmButton } from "@/components/forms/confirm-button";

export function ShareSettings({
  treeId,
  isPublic,
  hideLivingInPublic,
  slug,
}: {
  treeId: string;
  isPublic: boolean;
  hideLivingInPublic: boolean;
  slug: string | null;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = slug ? `${origin}/share/${slug}` : "";

  const save = (next: { isPublic: boolean; hideLivingInPublic: boolean }) =>
    start(async () => {
      const res = await updateShareAction(treeId, next);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block font-semibold">{t("enablePublic")}</span>
          <span className="text-muted-foreground">{t("shareDesc")}</span>
        </span>
        <Switch checked={isPublic} disabled={pending} onCheckedChange={(v) => save({ isPublic: v, hideLivingInPublic })} />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block font-semibold">{t("hideLiving")}</span>
          <span className="text-muted-foreground">{t("hideLivingDesc")}</span>
        </span>
        <Switch checked={hideLivingInPublic} disabled={pending} onCheckedChange={(v) => save({ isPublic, hideLivingInPublic: v })} />
      </label>
      {isPublic && slug && (
        <div className="space-y-2 rounded-xl border bg-muted/50 p-4">
          <p className="font-semibold">{t("publicLink")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={t("publicLink")} />
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                toast.success(t("copied"));
              }}
            >
              <Copy className="size-4" aria-hidden /> {t("copy")}
            </Button>
            <Button variant="outline" render={<a href={`/share/${slug}`} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink className="size-4" aria-hidden />
              <span className="sr-only">Buka</span>
            </Button>
          </div>
          <ConfirmButton
            title={`${t("regenerate")}?`}
            description="Tautan lama akan langsung berhenti berfungsi."
            confirmLabel={t("regenerate")}
            onConfirm={() => regenerateSlugAction(treeId)}
            onDone={() => router.refresh()}
            trigger={
              <Button variant="ghost" size="sm">
                <RefreshCw className="size-4" aria-hidden /> {t("regenerate")}
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
