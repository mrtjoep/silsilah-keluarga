/**
 * Mengubah data keluarga menjadi node & edge React Flow, lalu menyusun posisinya dengan ELK (layered).
 *
 * Model graf:
 *  - node "person" untuk setiap anggota
 *  - node "union" (titik kecil) untuk setiap pasangan
 *  - edge pasangan -> union, union -> anak (jika anak memiliki kedua pasangan itu sebagai orang tua)
 *  - edge orang tua -> anak langsung untuk orang tua tunggal / tanpa union
 * Setelah ELK selesai, titik union dipindahkan ke tengah garis antar pasangan
 * agar tampil seperti bagan silsilah klasik.
 */
import type { Edge, Node } from "@xyflow/react";
import type { ElkNode } from "elkjs/lib/elk-api";
import type { FamilyData, ParentType, PersonLite, UnionStatus } from "@/types";

export type Direction = "DOWN" | "RIGHT";

export const PERSON_W = 230;
export const PERSON_H = 96;
const UNION_SIZE = 14;

export type PersonNodeData = { person: PersonLite; isFocus?: boolean; direction: Direction };
export type UnionNodeData = { status: UnionStatus; direction: Direction };
export type PersonNode = Node<PersonNodeData, "person">;
export type UnionNode = Node<UnionNodeData, "union">;
export type FamilyNode = PersonNode | UnionNode;

let elkPromise: Promise<{ layout: (g: ElkNode) => Promise<ElkNode> }> | null = null;
function getElk() {
  if (!elkPromise) {
    elkPromise = import("elkjs/lib/elk.bundled.js").then((m) => new m.default());
  }
  return elkPromise;
}

export async function layoutFamily(
  data: FamilyData,
  direction: Direction,
  focusId?: string | null,
): Promise<{ nodes: FamilyNode[]; edges: Edge[] }> {
  const vertical = direction === "DOWN";
  const personIds = new Set(data.persons.map((p) => p.id));

  // Orang tua per anak
  const parentsOf = new Map<string, { parentId: string; type: ParentType }[]>();
  for (const l of data.parentLinks) {
    if (!personIds.has(l.parentId) || !personIds.has(l.childId)) continue;
    const arr = parentsOf.get(l.childId) ?? [];
    arr.push({ parentId: l.parentId, type: l.type });
    parentsOf.set(l.childId, arr);
  }

  const unions = data.unions.filter((u) => personIds.has(u.partner1Id) && personIds.has(u.partner2Id));
  const elkEdges: { id: string; sources: string[]; targets: string[] }[] = [];
  const rfEdges: Edge[] = [];
  const coveredChildParent = new Set<string>(); // `${child}|${parent}`

  for (const u of unions) {
    const uid = `u-${u.id}`;
    const ex = u.status === "DIVORCED" || u.status === "SEPARATED";
    for (const p of [u.partner1Id, u.partner2Id]) {
      elkEdges.push({ id: `e-${p}-${uid}`, sources: [p], targets: [uid] });
      rfEdges.push({
        id: `e-${p}-${uid}`,
        source: p,
        target: uid,
        type: "straight",
        data: { kind: "spouse" },
        style: { strokeWidth: 2.5, stroke: ex ? "var(--muted-foreground)" : "var(--primary)", strokeDasharray: ex ? "6 4" : undefined },
      });
    }
    // anak dari pasangan ini
    for (const [childId, parents] of parentsOf) {
      const ids = parents.map((x) => x.parentId);
      if (ids.includes(u.partner1Id) && ids.includes(u.partner2Id)) {
        const nonBio = parents.some((x) => (x.parentId === u.partner1Id || x.parentId === u.partner2Id) && x.type !== "BIOLOGICAL");
        coveredChildParent.add(`${childId}|${u.partner1Id}`);
        coveredChildParent.add(`${childId}|${u.partner2Id}`);
        elkEdges.push({ id: `e-${uid}-${childId}`, sources: [uid], targets: [childId] });
        rfEdges.push({
          id: `e-${uid}-${childId}`,
          source: uid,
          target: childId,
          sourceHandle: vertical ? "s-b" : "s-r",
          targetHandle: vertical ? "t-t" : "t-l",
          type: "smoothstep",
          data: { kind: "child" },
          style: { strokeWidth: 2, strokeDasharray: nonBio ? "6 4" : undefined },
        });
      }
    }
  }
  // Orang tua tanpa union yang mencakup anak tersebut
  for (const [childId, parents] of parentsOf) {
    for (const { parentId, type } of parents) {
      if (coveredChildParent.has(`${childId}|${parentId}`)) continue;
      const id = `e-${parentId}-${childId}`;
      elkEdges.push({ id, sources: [parentId], targets: [childId] });
      rfEdges.push({
        id,
        source: parentId,
        target: childId,
        sourceHandle: vertical ? "s-b" : "s-r",
        targetHandle: vertical ? "t-t" : "t-l",
        type: "smoothstep",
        data: { kind: "child" },
        style: { strokeWidth: 2, strokeDasharray: type !== "BIOLOGICAL" ? "6 4" : undefined },
      });
    }
  }

  const order = modelOrder(data, unions, parentsOf);
  const pw = PERSON_W;
  const ph = PERSON_H;
  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.layered.spacing.nodeNodeBetweenLayers": vertical ? "34" : "50",
      "elk.spacing.nodeNode": vertical ? "28" : "18",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      // urutan model (DFS keluarga) dipertahankan agar pasangan selalu berdampingan
      "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
      "elk.separateConnectedComponents": "true",
      "elk.spacing.componentComponent": "80",
    },
    children: order.map((id) =>
      id.startsWith("u-") ? { id, width: UNION_SIZE, height: UNION_SIZE } : { id, width: pw, height: ph },
    ),
    edges: elkEdges,
  };

  const elk = await getElk();
  const res = await elk.layout(graph);
  const pos = new Map((res.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));

  const nodes: FamilyNode[] = data.persons.map((p) => ({
    id: p.id,
    type: "person",
    position: pos.get(p.id) ?? { x: 0, y: 0 },
    data: { person: p, isFocus: p.id === focusId, direction },
    width: pw,
    height: ph,
  }));

  // Pindahkan titik union ke tengah antar pasangan & tentukan handle sisi
  for (const u of unions) {
    const uid = `u-${u.id}`;
    const a = pos.get(u.partner1Id)!;
    const b = pos.get(u.partner2Id)!;
    let x: number, y: number;
    const sameLayer = vertical ? Math.abs(a.y - b.y) < 1 : Math.abs(a.x - b.x) < 1;
    // Titik pasangan hanya diletakkan DI ANTARA kedua kartu bila keduanya benar-benar
    // berdampingan. Jika ada kartu lain di antaranya (mis. adik ipar), titik di tengah akan
    // menumpuk kartu itu → gunakan posisi ELK di bawah deretan kartu dan tarik garis dari bawah.
    const between = (lo: number, hi: number) =>
      data.persons.some((p) => {
        if (p.id === u.partner1Id || p.id === u.partner2Id) return false;
        const q = pos.get(p.id);
        if (!q) return false;
        return vertical
          ? Math.abs(q.y - a.y) < 1 && q.x > lo && q.x < hi
          : Math.abs(q.x - a.x) < 1 && q.y > lo && q.y < hi;
      });
    const adjacent =
      sameLayer && !(vertical ? between(Math.min(a.x, b.x), Math.max(a.x, b.x)) : between(Math.min(a.y, b.y), Math.max(a.y, b.y)));
    if (adjacent) {
      if (vertical) {
        const [l, r] = a.x < b.x ? [a, b] : [b, a];
        x = (l.x + pw + r.x) / 2 - UNION_SIZE / 2;
        y = a.y + ph / 2 - UNION_SIZE / 2;
      } else {
        const [t, btm] = a.y < b.y ? [a, b] : [b, a];
        x = a.x + pw / 2 - UNION_SIZE / 2;
        y = (t.y + ph + btm.y) / 2 - UNION_SIZE / 2;
      }
    } else {
      const p = pos.get(uid)!;
      x = p.x;
      y = p.y;
    }
    nodes.push({
      id: uid,
      type: "union",
      position: { x, y },
      data: { status: u.status, direction },
      width: UNION_SIZE,
      height: UNION_SIZE,
      selectable: false,
      draggable: false,
    });
    for (const pid of [u.partner1Id, u.partner2Id]) {
      const edge = rfEdges.find((e) => e.id === `e-${pid}-${uid}`)!;
      const pp = pos.get(pid)!;
      if (!adjacent) {
        // garis turun dari bawah kartu ke titik pasangan (tidak melintasi kartu lain)
        edge.type = "smoothstep";
        (edge as Edge & { pathOptions?: { offset?: number; borderRadius?: number } }).pathOptions = { offset: 6, borderRadius: 6 };
        edge.sourceHandle = vertical ? "s-b" : "s-r";
        edge.targetHandle = vertical ? "t-t" : "t-l";
      } else if (vertical) {
        const left = pp.x < x;
        edge.sourceHandle = left ? "s-r" : "s-l";
        edge.targetHandle = left ? "t-l" : "t-r";
      } else {
        const above = pp.y < y;
        edge.sourceHandle = above ? "s-b" : "s-t";
        edge.targetHandle = above ? "t-t" : "t-b";
      }
    }
  }

  assignLanes(nodes, rfEdges, vertical);
  return { nodes, edges: rfEdges };
}

/**
 * Garis orang tua → anak berbelok di antara dua generasi. Bila semua garis berbelok di
 * ketinggian yang sama, garis mendatar milik pasangan berbeda (mis. pernikahan pertama &
 * kedua) bisa menyatu sehingga anak tampak tersambung ke orang tua yang salah.
 * Fungsi ini memberi tiap kelompok (sumber garis → anak-anaknya) "jalur" ketinggian sendiri
 * bila rentang mendatarnya bertumpuk dengan kelompok lain.
 */
function assignLanes(nodes: FamilyNode[], edges: Edge[], vertical: boolean) {
  const box = new Map(nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y, w: n.width ?? 0, h: n.height ?? 0 }]));
  type Group = { layer: number; lo: number; hi: number; srcEnd: number; edges: Edge[] };
  const groups = new Map<string, Group>();
  for (const e of edges) {
    if ((e.data as { kind?: string } | undefined)?.kind !== "child") continue;
    const s = box.get(e.source);
    const t = box.get(e.target);
    if (!s || !t) continue;
    // "cross" = sumbu mendatar garis belok, "flow" = arah generasi
    const sCross = vertical ? s.x + s.w / 2 : s.y + s.h / 2;
    const tCross = vertical ? t.x + t.w / 2 : t.y + t.h / 2;
    const srcEnd = vertical ? s.y + s.h : s.x + s.w;
    const layer = Math.round(vertical ? t.y : t.x);
    const key = `${e.source}|${layer}`;
    let g = groups.get(key);
    if (!g) {
      g = { layer, lo: sCross, hi: sCross, srcEnd, edges: [] };
      groups.set(key, g);
    }
    g.lo = Math.min(g.lo, tCross);
    g.hi = Math.max(g.hi, tCross);
    g.srcEnd = Math.max(g.srcEnd, srcEnd);
    g.edges.push(e);
  }

  const byLayer = new Map<number, Group[]>();
  for (const g of groups.values()) byLayer.set(g.layer, [...(byLayer.get(g.layer) ?? []), g]);

  const GAP = 60; // kelompok yang berdekatan (< 60px) juga dipisah jalurnya agar tidak tampak menyambung
  for (const [layer, gs] of byLayer) {
    gs.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
    const laneEnds: number[] = [];
    const laneOf = new Map<Group, number>();
    for (const g of gs) {
      let i = laneEnds.findIndex((end) => end + GAP < g.lo);
      if (i === -1) {
        i = laneEnds.length;
        laneEnds.push(g.hi);
      } else laneEnds[i] = g.hi;
      laneOf.set(g, i);
    }
    const lanes = laneEnds.length;
    const top = Math.max(...gs.map((g) => g.srcEnd)) + 6;
    const bottom = layer - 8;
    for (const g of gs) {
      const i = laneOf.get(g)!;
      const c = top + ((bottom - top) * (i + 1)) / (lanes + 1);
      for (const e of g.edges) {
        e.type = "family";
        e.data = { ...(e.data ?? {}), ...(vertical ? { centerY: c } : { centerX: c }) };
      }
    }
  }
}

/**
 * Urutan DFS keluarga: [pasangan-1, orang, pasangan-2, ...], titik union, lalu anak-anak (urut lahir).
 * Dipakai sebagai "model order" ELK sehingga pasangan berdampingan & anak berada di bawah orang tuanya.
 */
function modelOrder(
  data: FamilyData,
  unions: FamilyData["unions"],
  parentsOf: Map<string, { parentId: string; type: ParentType }[]>,
): string[] {
  const byId = new Map(data.persons.map((p) => [p.id, p]));
  const birth = (id: string) => byId.get(id)?.birthDate ?? "9999";
  const unionsOf = new Map<string, FamilyData["unions"]>();
  for (const u of unions) {
    for (const p of [u.partner1Id, u.partner2Id]) unionsOf.set(p, [...(unionsOf.get(p) ?? []), u]);
  }
  for (const list of unionsOf.values()) list.sort((a, b) => (a.marriageDate ?? "9999").localeCompare(b.marriageDate ?? "9999"));
  const childrenOf = new Map<string, string[]>();
  for (const [c, ps] of parentsOf) for (const { parentId } of ps) childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), c]);

  const out: string[] = [];
  const seen = new Set<string>();
  const emit = (id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  };

  function visit(id: string) {
    if (seen.has(id)) return;
    const us = unionsOf.get(id) ?? [];
    const spouse = (u: (typeof us)[number]) => (u.partner1Id === id ? u.partner2Id : u.partner1Id);
    // Pasangan ditempatkan di sisi keluarga asalnya agar garis tidak bersilangan:
    //  - pasangan yang keluarganya (orang tua) BELUM ditempatkan → di KANAN (keluarganya menyusul di kanan)
    //  - pasangan yang keluarganya SUDAH ditempatkan → sudah muncul di kiri (tidak di-emit ulang)
    //  - pasangan tanpa keluarga tercatat: bila menikah lebih dari sekali, pasangan pertama di kiri
    //    (agar orang ini berada di tengah), selebihnya di kanan
    const left: string[] = [];
    const right: string[] = [];
    us.forEach((u, i) => {
      const s = spouse(u);
      if (seen.has(s)) return;
      const familyPending = (parentsOf.get(s) ?? []).some((x) => !seen.has(x.parentId));
      if (!familyPending && i === 0 && us.length > 1) left.push(s);
      else right.push(s);
    });
    left.forEach(emit);
    emit(id);
    right.forEach(emit);
    for (const u of us) emit(`u-${u.id}`);
    const kidsDone = new Set<string>();
    for (const u of us) {
      const kids = (childrenOf.get(id) ?? []).filter((c) => (parentsOf.get(c) ?? []).some((x) => x.parentId === spouse(u)));
      kids.sort((a, b) => birth(a).localeCompare(birth(b)));
      for (const k of kids) {
        kidsDone.add(k);
        visit(k);
      }
    }
    const rest = (childrenOf.get(id) ?? []).filter((c) => !kidsDone.has(c)).sort((a, b) => birth(a).localeCompare(birth(b)));
    for (const k of rest) visit(k);
    // anak dari pasangan (mis. anak bawaan) juga ikut dikunjungi
    for (const u of us) for (const k of childrenOf.get(spouse(u)) ?? []) visit(k);
  }

  const hasParents = (id: string) => (parentsOf.get(id)?.length ?? 0) > 0;
  const roots = data.persons
    .filter((p) => !hasParents(p.id) && !(unionsOf.get(p.id) ?? []).some((u) => hasParents(u.partner1Id === p.id ? u.partner2Id : u.partner1Id)))
    .sort((a, b) => birth(a.id).localeCompare(birth(b.id)));
  for (const r of roots) visit(r.id);
  for (const p of data.persons) visit(p.id);
  for (const u of unions) emit(`u-${u.id}`);
  return out;
}
