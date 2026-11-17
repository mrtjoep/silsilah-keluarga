import { cn } from "@/lib/utils";
import { photoUrl } from "@/lib/photo";
import type { Gender } from "@/types";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function PersonAvatar({
  name,
  photoPath,
  gender,
  isDeceased,
  className,
}: {
  name: string;
  photoPath: string | null;
  gender: Gender;
  isDeceased?: boolean;
  className?: string;
}) {
  const src = photoUrl(photoPath);
  return (
    <span
      className={cn(
        "relative inline-grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 font-bold",
        gender === "MALE" && "border-[var(--male-border)] bg-[var(--male-bg)]",
        gender === "FEMALE" && "border-[var(--female-border)] bg-[var(--female-bg)]",
        gender === "UNKNOWN" && "border-[var(--unknown-border)] bg-[var(--unknown-bg)]",
        isDeceased && "grayscale-[60%]",
        className,
      )}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}
