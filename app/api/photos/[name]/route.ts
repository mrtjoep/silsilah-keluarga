import { readPhoto } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const body = await readPhoto(name);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": "image/webp",
      // nama berkas unik (UUID) & tidak pernah ditimpa → aman di-cache lama
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
