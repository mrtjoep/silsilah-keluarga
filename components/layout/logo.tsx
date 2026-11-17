import Link from "next/link";
import { TreeDeciduous } from "lucide-react";

export function Logo({ href = "/", label }: { href?: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold text-lg text-primary">
      <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
        <TreeDeciduous className="size-5" aria-hidden />
      </span>
      <span className="text-foreground">{label}</span>
    </Link>
  );
}
