import "server-only";
import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { del as blobDel, get as blobGet, put as blobPut } from "@vercel/blob";

/**
 * Penyimpanan foto dengan dua mode:
 *  - Vercel Blob: aktif otomatis bila BLOB_READ_WRITE_TOKEN atau BLOB_STORE_ID tersedia (produksi di Vercel)
 *  - Disk lokal (UPLOAD_DIR): untuk pengembangan / VPS
 *
 * Di database hanya disimpan nama berkas ("<uuid>.webp"). Foto selalu disajikan lewat
 * /api/photos/<nama>, sehingga store Blob bisa dibuat "Private" dan URL asli Blob tidak terekspos.
 */
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const BLOB_PREFIX = "photos/";
const BLOB_ACCESS = process.env.BLOB_ACCESS === "public" ? "public" : "private";
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const NAME_RE = /^[0-9a-f-]{36}\.webp$/;

// Vercel Blob aktif bila ada token baca-tulis (cara lama) ATAU BLOB_STORE_ID
// (cara baru: SDK login otomatis memakai OIDC Vercel saat berjalan di Vercel).
const blobEnabled = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export class UploadError extends Error {}

/** Deteksi tipe berdasarkan "magic bytes", bukan ekstensi/MIME dari klien. */
function sniffImage(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

/** Validasi, perkecil, dan simpan ulang sebagai WebP (sekaligus membuang metadata EXIF/GPS). */
export async function savePhoto(file: File): Promise<string> {
  if (file.size === 0) throw new UploadError("Berkas kosong.");
  if (file.size > MAX_PHOTO_BYTES) throw new UploadError("Ukuran foto maksimal 2 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffImage(buf)) throw new UploadError("Format foto harus JPG, PNG, atau WebP.");
  // sharp (modul native) dimuat hanya saat ada upload, sehingga bila gagal dimuat
  // di server hanya fitur foto yang terdampak, bukan seluruh halaman.
  let sharp: typeof import("sharp").default;
  try {
    sharp = (await import("sharp")).default;
  } catch (e) {
    console.error("Modul sharp gagal dimuat:", e);
    throw new UploadError("Fitur foto sedang tidak tersedia. Data lain tetap bisa disimpan tanpa foto.");
  }
  let out: Buffer;
  try {
    out = await sharp(buf, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(600, 600, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new UploadError("Foto tidak dapat dibaca. Coba berkas lain.");
  }
  const name = `${randomUUID()}.webp`;

  if (blobEnabled()) {
    try {
      await blobPut(BLOB_PREFIX + name, out, {
        access: BLOB_ACCESS,
        contentType: "image/webp",
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
    } catch (e) {
      console.error("Upload ke Vercel Blob gagal:", e);
      throw new UploadError("Foto gagal diunggah ke penyimpanan. Coba lagi nanti.");
    }
    return name;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), out);
  return name;
}

export async function deletePhoto(name: string | null | undefined) {
  if (!name || !NAME_RE.test(name)) return;
  if (blobEnabled()) {
    await blobDel(BLOB_PREFIX + name).catch((e) => console.error("Hapus foto Blob gagal:", e));
    return;
  }
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}

/** Baca foto sebagai stream/buffer untuk disajikan oleh /api/photos/[name]. */
export async function readPhoto(name: string): Promise<ReadableStream<Uint8Array> | Uint8Array | null> {
  if (!NAME_RE.test(name)) return null;
  if (blobEnabled()) {
    const res = await blobGet(BLOB_PREFIX + name, { access: BLOB_ACCESS }).catch((e) => {
      console.error("Baca foto Blob gagal:", e);
      return null;
    });
    return res && res.statusCode === 200 ? res.stream : null;
  }
  const buf = await readFile(path.join(UPLOAD_DIR, name)).catch(() => null);
  return buf ? new Uint8Array(buf) : null;
}
