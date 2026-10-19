import { getMedia } from "@/lib/social";

// Serves uploaded images. Media rows are never edited (a new upload gets a new id), so cache forever.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });
  const media = await getMedia(id);
  if (!media) return new Response("Not found", { status: 404 });
  return new Response(media.bytes, {
    headers: {
      "Content-Type": media.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
