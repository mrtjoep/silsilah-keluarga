"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

/** Tampilkan notifikasi dari query string (?created=1 dsb) lalu bersihkan URL. */
export function FlashToast({ success, warning }: { success?: string; warning?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current || (!success && !warning)) return;
    shown.current = true;
    if (success) toast.success(success);
    if (warning) toast.warning(warning, { duration: 8000 });
    router.replace(pathname, { scroll: false });
  }, [success, warning, router, pathname]);
  return null;
}
