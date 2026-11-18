"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import { ArrowDown, ArrowRight, Download, FileText, Loader2, Maximize, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NativeSelect } from "@/components/forms/field";
import { focusSubset } from "@/lib/family";
import { layoutFamily, type Direction, type FamilyNode } from "@/lib/tree-layout";
import { edgeTypes, nodeTypes } from "@/components/tree/nodes";
import { PersonPanel } from "@/components/tree/person-panel";
import { exportPdf, exportPng, slugify } from "@/components/tree/export-tree";
import type { FamilyData } from "@/types";

export interface FamilyTreeViewProps {
  data: FamilyData;
  title: string;
  /** contoh: (id) => `/trees/x/members/${id}` ; kosong untuk tampilan publik */
  profileHrefBase?: string;
  canEdit?: boolean;
}

export function FamilyTreeView(props: FamilyTreeViewProps) {
  return (
    <ReactFlowProvider>
      <TreeInner {...props} />
    </ReactFlowProvider>
  );
}

function TreeInner({ data, title, profileHrefBase, canEdit }: FamilyTreeViewProps) {
  const t = useTranslations("tree");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const { fitView, setCenter, getNodes } = useReactFlow();

  const focusId = searchParams.get("focus");
  const [direction, setDirection] = useState<Direction>(() => (searchParams.get("dir") === "h" ? "RIGHT" : "DOWN"));
  const [nodes, setNodes] = useState<FamilyNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const visibleData = useMemo(() => (focusId ? focusSubset(data, focusId) : data), [data, focusId]);
  const focusPerson = focusId ? data.persons.find((p) => p.id === focusId) : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    layoutFamily(visibleData, direction, focusId)
      .then((res) => {
        if (cancelled) return;
        setNodes(res.nodes);
        setEdges(res.edges);
        setLoading(false);
        requestAnimationFrame(() => fitView({ padding: 0.15, duration: 400, maxZoom: 1.1 }));
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) {
          toast.error("Gagal menyusun pohon.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [visibleData, direction, focusId, fitView]);

  const updateUrl = useCallback(
    (params: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(params)) {
        if (v === null) sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const focusOn = useCallback(
    (id: string | null) => {
      setSelected(null);
      updateUrl({ focus: id });
    },
    [updateUrl],
  );

  const changeDirection = (d: Direction) => {
    setDirection(d);
    updateUrl({ dir: d === "RIGHT" ? "h" : null });
  };

  const centerOn = (id: string) => {
    const n = getNodes().find((x) => x.id === id);
    if (!n) return;
    setCenter(n.position.x + (n.width ?? 0) / 2, n.position.y + (n.height ?? 0) / 2, { zoom: 1.1, duration: 600 });
    setSelected(id);
  };

  async function doExport(kind: "png" | "pdf") {
    setExporting(true);
    try {
      const file = slugify(title) + (focusPerson ? `-${slugify(focusPerson.fullName)}` : "");
      if (kind === "png") await exportPng(getNodes(), file);
      else await exportPdf(getNodes(), file, focusPerson ? `${title} — ${focusPerson.fullName}` : title);
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengekspor pohon.");
    } finally {
      setExporting(false);
    }
  }

  if (data.persons.length === 0) {
    return (
      <div className="m-4 flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center">
        <p className="text-xl font-semibold">{t("empty")}</p>
        <p className="mt-2 max-w-md text-muted-foreground">{t("emptyHint")}</p>
        {canEdit && profileHrefBase && (
          <Button size="lg" className="mt-6" onClick={() => router.push(`${profileHrefBase}/new`)}>
            + Tambah anggota pertama
          </Button>
        )}
      </div>
    );
  }

  const sortedPersons = [...visibleData.persons].filter((p) => !p.isPrivate).sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="relative flex min-h-[70dvh] flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2 sm:px-6">
        <div role="group" aria-label="Arah pohon" className="flex rounded-lg border p-0.5">
          <Button size="sm" variant={direction === "DOWN" ? "default" : "ghost"} onClick={() => changeDirection("DOWN")} aria-pressed={direction === "DOWN"}>
            <ArrowDown className="size-4" aria-hidden /> {t("vertical")}
          </Button>
          <Button size="sm" variant={direction === "RIGHT" ? "default" : "ghost"} onClick={() => changeDirection("RIGHT")} aria-pressed={direction === "RIGHT"}>
            <ArrowRight className="size-4" aria-hidden /> {t("horizontal")}
          </Button>
        </div>

        <NativeSelect
          aria-label={t("searchPerson")}
          className="h-9 w-full max-w-64 text-sm sm:w-64"
          value=""
          onChange={(e) => e.target.value && centerOn(e.target.value)}
        >
          <option value="">{t("searchPerson")}</option>
          {sortedPersons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </NativeSelect>

        {focusPerson && (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-3 text-sm font-semibold text-primary">
            {t("focusOn", { name: focusPerson.isPrivate ? "—" : focusPerson.fullName })}
            <Button size="icon-sm" variant="ghost" onClick={() => focusOn(null)} aria-label={t("showAll")} title={t("showAll")}>
              <X className="size-4" />
            </Button>
          </span>
        )}

        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fitView({ padding: 0.15, duration: 400 })} title="Tampilkan seluruh pohon">
            <Maximize className="size-4" aria-hidden />
            <span className="sr-only">Tampilkan seluruh pohon</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => doExport("png")} disabled={exporting || loading}>
            <Download className="size-4" aria-hidden /> PNG
          </Button>
          <Button size="sm" variant="outline" onClick={() => doExport("pdf")} disabled={exporting || loading}>
            <FileText className="size-4" aria-hidden /> PDF
          </Button>
        </div>
      </div>

      {/* Kanvas */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background/70" aria-live="polite">
            <span className="flex items-center gap-2 text-lg">
              <Loader2 className="size-5 animate-spin" aria-hidden /> {t("layouting")}
            </span>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode={mounted && resolvedTheme === "dark" ? "dark" : "light"}
          onNodeClick={(_, n) => n.type === "person" && setSelected(n.id)}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="!absolute inset-0"
        >
          <Background gap={24} />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            className="!hidden sm:!block"
            bgColor="var(--card)"
            maskColor="color-mix(in oklch, var(--background) 60%, transparent)"
            nodeColor={(n) => {
              if (n.type === "union") return "transparent";
              const g = (n.data as { person: { gender: string } }).person.gender;
              return g === "MALE" ? "var(--male-border)" : g === "FEMALE" ? "var(--female-border)" : "var(--unknown-border)";
            }}
          />
        </ReactFlow>
        <Legend />
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-5 text-base sm:max-w-md">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Detail anggota</SheetTitle>
          </SheetHeader>
          {selected && (
            <PersonPanel
              data={data}
              personId={selected}
              onSelect={(id) => (nodes.some((n) => n.id === id) ? centerOn(id) : setSelected(id))}
              onFocus={(id) => focusOn(id)}
              profileHref={profileHrefBase ? `${profileHrefBase}/${selected}` : undefined}
              editHref={canEdit && profileHrefBase ? `${profileHrefBase}/${selected}/edit` : undefined}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Legend() {
  const t = useTranslations("tree");
  const tg = useTranslations("gender");
  return (
    <details className="absolute top-3 left-3 z-[5] rounded-xl border bg-card/95 p-3 text-sm shadow-sm">
      <summary className="cursor-pointer font-semibold">{t("legend")}</summary>
      <ul className="mt-2 space-y-1.5">
        <li className="flex items-center gap-2">
          <span className="size-4 rounded border-2 border-[var(--male-border)] bg-[var(--male-bg)]" /> {tg("MALE")}
        </li>
        <li className="flex items-center gap-2">
          <span className="size-4 rounded border-2 border-[var(--female-border)] bg-[var(--female-bg)]" /> {tg("FEMALE")}
        </li>
        <li className="flex items-center gap-2">
          <span className="size-4 rounded border-2 border-dashed border-muted-foreground bg-[var(--deceased-bg)]" /> Wafat (bingkai putus-putus)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-primary" /> Pasangan menikah
        </li>
        <li className="flex items-center gap-2">
          <span className="h-0 w-5 border-t-2 border-dashed border-muted-foreground" /> Bercerai / anak angkat
        </li>
      </ul>
    </details>
  );
}
