"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/types";

/** Tombol dengan dialog konfirmasi yang menjalankan server action. */
export function ConfirmButton({
  title,
  description,
  confirmLabel,
  onConfirm,
  onDone,
  trigger,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<ActionResult | void>;
  onDone?: () => void;
  trigger: React.ReactElement;
}) {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">{description ?? tc("cannotUndo")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await onConfirm();
                if (res && !res.ok) toast.error(res.error);
                else {
                  if (res?.message) toast.success(res.message);
                  setOpen(false);
                  onDone?.();
                }
              })
            }
          >
            {pending ? "..." : confirmLabel ?? tc("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function IconButton(props: React.ComponentProps<typeof Button>) {
  return <Button variant="ghost" size="icon" {...props} />;
}
