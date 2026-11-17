"use client";

import { memo } from "react";
import { BaseEdge, getSmoothStepPath, Handle, Position, type EdgeProps, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { lifeSpan } from "@/lib/dates";
import { PersonAvatar } from "@/components/person/person-avatar";
import type { PersonNode, UnionNode } from "@/lib/tree-layout";

const hidden = "!size-1.5 !min-w-0 !min-h-0 !border-0 !bg-transparent";

/** Handle di 4 sisi, masing-masing sebagai source & target (s-*, t-*). */
function AllHandles() {
  const sides = [
    ["t", Position.Top],
    ["b", Position.Bottom],
    ["l", Position.Left],
    ["r", Position.Right],
  ] as const;
  return (
    <>
      {sides.map(([k, pos]) => (
        <Handle key={`s-${k}`} id={`s-${k}`} type="source" position={pos} className={hidden} isConnectable={false} />
      ))}
      {sides.map(([k, pos]) => (
        <Handle key={`t-${k}`} id={`t-${k}`} type="target" position={pos} className={hidden} isConnectable={false} />
      ))}
    </>
  );
}

export const PersonNodeView = memo(function PersonNodeView({ data, selected }: NodeProps<PersonNode>) {
  const p = data.person;
  return (
    <div
      className={cn(
        "flex h-full w-full cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 shadow-sm transition-shadow hover:shadow-md",
        p.gender === "MALE" && "border-[var(--male-border)] bg-[var(--male-bg)]",
        p.gender === "FEMALE" && "border-[var(--female-border)] bg-[var(--female-bg)]",
        p.gender === "UNKNOWN" && "border-[var(--unknown-border)] bg-[var(--unknown-bg)]",
        p.isDeceased && "border-dashed bg-[var(--deceased-bg)]",
        selected && "ring-4 ring-ring/60",
        data.isFocus && "ring-4 ring-primary",
      )}
      title={p.fullName}
    >
      <AllHandles />
      <PersonAvatar name={p.fullName} photoPath={p.photoPath} gender={p.gender} isDeceased={p.isDeceased} className="size-14 text-base" />
      <div className="min-w-0 flex-1 text-left leading-tight">
        <p className="line-clamp-2 text-[15px] font-bold text-foreground">
          {p.fullName}
          {p.isDeceased && <span className="ml-1 font-normal text-muted-foreground">†</span>}
        </p>
        {p.nickname && <p className="truncate text-[13px] text-muted-foreground">{p.nickname}</p>}
        <p className="text-[13px] font-medium text-muted-foreground">{lifeSpan(p) || (p.isPrivate ? "" : " ")}</p>
      </div>
    </div>
  );
});

export const UnionNodeView = memo(function UnionNodeView({ data }: NodeProps<UnionNode>) {
  const ex = data.status === "DIVORCED" || data.status === "SEPARATED";
  return (
    <div
      className={cn(
        "size-full rounded-full border-2 border-background",
        ex ? "bg-muted-foreground" : "bg-primary",
      )}
      title={ex ? "Bercerai/berpisah" : "Pasangan"}
    >
      <AllHandles />
    </div>
  );
});

export const nodeTypes = { person: PersonNodeView, union: UnionNodeView };

/** Garis orang tua → anak dengan titik belok yang diatur tata letak (jalur per pasangan). */
export const FamilyEdge = memo(function FamilyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps) {
  const d = data as { centerX?: number; centerY?: number } | undefined;
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 6,
    centerX: d?.centerX,
    centerY: d?.centerY,
  });
  return <BaseEdge id={id} path={path} style={style} />;
});

export const edgeTypes = { family: FamilyEdge };
