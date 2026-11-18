"use client";

import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";

/** Render seluruh pohon (bukan hanya area yang terlihat) menjadi PNG data URL. */
export async function treeToPng(nodes: Node[]): Promise<{ dataUrl: string; width: number; height: number }> {
  const { toPng } = await import("html-to-image");
  const bounds = getNodesBounds(nodes);
  const padding = 40;
  // batasi ukuran agar browser tidak kehabisan memori
  const scale = Math.min(2, 8000 / Math.max(bounds.width, bounds.height));
  const width = Math.ceil((bounds.width + padding * 2) * scale);
  const height = Math.ceil((bounds.height + padding * 2) * scale);
  const vp = getViewportForBounds(bounds, width, height, 0.05, 4, 0);
  const el = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!el) throw new Error("Pohon belum siap");
  const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
  const restore = expandEdgeSvgs(el, bounds);
  try {
    const dataUrl = await toPng(el, {
      backgroundColor: bg,
      width,
      height,
      pixelRatio: 1,
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
    });
    return await addLegend(dataUrl, width, height, bg);
  } finally {
    restore();
  }
}

/** Isi keterangan (legend) — sama dengan keterangan di layar. */
export const LEGEND_ITEMS = [
  { label: "Laki-laki", kind: "box", fill: "var(--male-bg)", stroke: "var(--male-border)" },
  { label: "Perempuan", kind: "box", fill: "var(--female-bg)", stroke: "var(--female-border)" },
  { label: "Sudah wafat (bingkai putus-putus)", kind: "box", fill: "var(--deceased-bg)", stroke: "var(--muted-foreground)", dashed: true },
  { label: "Pasangan menikah (titik = pasangan)", kind: "spouse", stroke: "var(--primary)" },
  { label: "Bercerai / berpisah", kind: "spouse", stroke: "var(--muted-foreground)", dashed: true },
  { label: "Orang tua → anak kandung", kind: "line", stroke: "edge" },
  { label: "Anak angkat / tiri / asuh", kind: "line", stroke: "edge", dashed: true },
] as const;

/** Tambahkan kotak keterangan di bawah gambar pohon (untuk PNG & PDF). */
async function addLegend(dataUrl: string, width: number, height: number, bg: string) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const color = (expr: string) => {
    if (expr === "edge") {
      // warna garis anak (bukan garis pasangan yang berwarna utama)
      const p = document.querySelector<SVGPathElement>(
        ".react-flow__edge-family .react-flow__edge-path, .react-flow__edge-smoothstep .react-flow__edge-path",
      );
      return toRgb((p && getComputedStyle(p).stroke) || "#9ca3af");
    }
    const el = document.createElement("span");
    el.style.color = expr;
    document.body.appendChild(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return toRgb(c);
  };
  const fg = color("var(--foreground)");
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";

  // ukuran huruf mengikuti lebar gambar agar tetap terbaca saat dicetak
  const u = Math.max(16, Math.min(44, width / 70));
  const pad = u * 1.5;
  const sw = u * 2.4; // lebar contoh warna/garis
  const ctx0 = document.createElement("canvas").getContext("2d")!;
  ctx0.font = `${u}px ${font}`;
  const itemW = LEGEND_ITEMS.map((it) => sw + u * 0.7 + ctx0.measureText(it.label).width + u * 2);
  // susun item per baris sesuai lebar gambar
  const rows: number[][] = [[]];
  let lineW = 0;
  itemW.forEach((w, i) => {
    if (lineW + w > width - pad * 2 && rows[rows.length - 1].length) {
      rows.push([]);
      lineW = 0;
    }
    rows[rows.length - 1].push(i);
    lineW += w;
  });
  const rowH = u * 2;
  const legendH = pad * 2 + u * 1.6 + rows.length * rowH;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.ceil(height + legendH);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, width, height);

  // garis pemisah & judul
  ctx.strokeStyle = color("var(--border)");
  ctx.lineWidth = Math.max(1, u / 10);
  ctx.beginPath();
  ctx.moveTo(pad, height + 0.5);
  ctx.lineTo(width - pad, height + 0.5);
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.font = `bold ${u * 1.05}px ${font}`;
  ctx.fillText("Keterangan", pad, height + pad + u * 0.5);
  ctx.font = `${u}px ${font}`;

  rows.forEach((row, r) => {
    let x = pad;
    const cy = height + pad + u * 1.6 + r * rowH + rowH / 2;
    for (const i of row) {
      const it = LEGEND_ITEMS[i];
      const stroke = color(it.stroke);
      ctx.setLineDash("dashed" in it && it.dashed ? [u * 0.4, u * 0.3] : []);
      ctx.strokeStyle = stroke;
      if (it.kind === "box") {
        ctx.fillStyle = color(it.fill);
        ctx.lineWidth = u / 7;
        ctx.beginPath();
        ctx.roundRect(x, cy - u * 0.65, sw, u * 1.3, u * 0.35);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.lineWidth = it.kind === "spouse" ? u / 5.5 : u / 7;
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.lineTo(x + sw, cy);
        ctx.stroke();
        if (it.kind === "spouse") {
          ctx.setLineDash([]);
          ctx.fillStyle = stroke;
          ctx.beginPath();
          ctx.arc(x + sw / 2, cy, u * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.setLineDash([]);
      ctx.fillStyle = fg;
      ctx.fillText(it.label, x + sw + u * 0.7, cy);
      x += itemW[i];
    }
  });
  return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
}

/**
 * React Flow menggambar tiap garis di <svg> kecil (bawaan 300×150) dengan overflow: visible.
 * html-to-image tidak menghormati overflow tersebut, sehingga garis di luar kotak itu terpotong
 * (garis silsilah "hilang" di PNG/PDF). Sementara waktu, perbesar setiap svg garis agar menutupi
 * seluruh pohon — viewBox digeser sama besar sehingga posisi garis tidak berubah.
 */
function expandEdgeSvgs(viewport: HTMLElement, b: { x: number; y: number; width: number; height: number }) {
  const margin = 200;
  const x = Math.floor(b.x - margin);
  const y = Math.floor(b.y - margin);
  const w = Math.ceil(b.width + margin * 2);
  const h = Math.ceil(b.height + margin * 2);
  const svgs = [...viewport.querySelectorAll<SVGSVGElement>("svg")].filter((s) => s.querySelector(".react-flow__edge"));
  const saved = svgs.map((s) => ({
    s,
    style: s.getAttribute("style"),
    viewBox: s.getAttribute("viewBox"),
    width: s.getAttribute("width"),
    height: s.getAttribute("height"),
  }));
  // Warna tema berformat oklch/lab tidak dikenali saat garis SVG dirender ke gambar →
  // ubah sementara ke rgb biasa.
  const paths = [...viewport.querySelectorAll<SVGPathElement>(".react-flow__edge-path")];
  const savedPaths = paths.map((p) => ({ p, style: p.getAttribute("style") }));
  for (const p of paths) {
    const stroke = getComputedStyle(p).stroke;
    if (stroke && !/^(rgb|#|none)/.test(stroke)) p.style.stroke = toRgb(stroke);
  }
  for (const s of svgs) {
    s.style.position = "absolute";
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.width = `${w}px`;
    s.style.height = `${h}px`;
    s.setAttribute("width", String(w));
    s.setAttribute("height", String(h));
    s.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  }
  return () => {
    for (const { p, style } of savedPaths) {
      if (style === null) p.removeAttribute("style");
      else p.setAttribute("style", style);
    }
    for (const { s, style, viewBox, width, height } of saved) {
      const set = (k: string, v: string | null) => (v === null ? s.removeAttribute(k) : s.setAttribute(k, v));
      set("style", style);
      set("viewBox", viewBox);
      set("width", width);
      set("height", height);
    }
  };
}

/** Konversi warna CSS apa pun (oklch, lab, var yang sudah di-resolve) ke rgb() lewat canvas 1×1. */
function toRgb(color: string): string {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return color;
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export async function exportPng(nodes: Node[], filename: string) {
  const { dataUrl } = await treeToPng(nodes);
  download(dataUrl, `${filename}.png`);
}

export async function exportPdf(nodes: Node[], filename: string, title: string) {
  const [{ dataUrl, width, height }, { jsPDF }] = await Promise.all([treeToPng(nodes), import("jspdf")]);
  const landscape = width >= height;
  const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a3" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 28;
  pdf.setFontSize(16);
  pdf.text(title, margin, margin + 6);
  const availW = pw - margin * 2;
  const availH = ph - margin * 2 - 24;
  const ratio = Math.min(availW / width, availH / height);
  // kompresi "FAST" (deflate) memperkecil PDF puluhan kali tanpa mengurangi ketajaman
  pdf.addImage(dataUrl, "PNG", margin + (availW - width * ratio) / 2, margin + 24, width * ratio, height * ratio, undefined, "FAST");
  pdf.save(`${filename}.pdf`);
}

export { slugify } from "@/lib/slug";
