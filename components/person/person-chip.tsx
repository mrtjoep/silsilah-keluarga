import Link from "next/link";
import { PersonAvatar } from "@/components/person/person-avatar";
import { lifeSpan } from "@/lib/dates";
import type { PersonLite } from "@/types";

export function PersonChip({ person, href, note, children }: { person: PersonLite; href?: string; note?: string; children?: React.ReactNode }) {
  const body = (
    <>
      <PersonAvatar name={person.fullName} photoPath={person.photoPath} gender={person.gender} isDeceased={person.isDeceased} className="size-11" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {person.fullName}
          {person.isDeceased && <span className="ml-1 text-muted-foreground" title="Wafat">†</span>}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {[lifeSpan(person), note].filter(Boolean).join(" · ")}
        </span>
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-2 pr-1">
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {children}
    </div>
  );
}
