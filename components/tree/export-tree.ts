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
    return { dataUrl, width, height };
  } finally {
    restore();
  }
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
