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
  const dataUrl = await toPng(el, {
    backgroundColor: bg,
    width,
    height,
    pixelRatio: 1,
    style: { width: `${width}px`, height: `${height}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
  });
  return { dataUrl, width, height };
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
  pdf.addImage(dataUrl, "PNG", margin + (availW - width * ratio) / 2, margin + 24, width * ratio, height * ratio);
  pdf.save(`${filename}.pdf`);
}

export { slugify } from "@/lib/slug";
