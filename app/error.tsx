"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Terjadi kesalahan</h1>
      <p className="max-w-md text-muted-foreground">Maaf, halaman ini gagal dimuat. Silakan coba lagi.</p>
      <Button size="lg" onClick={reset}>
        Coba lagi
      </Button>
    </main>
  );
}
