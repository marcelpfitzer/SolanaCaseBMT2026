// GET /api/media/:id  → streams a podcast's audio, but only to people who paid
// (or its writer / admins). Supports "Range" requests so the player can seek.

import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { getCurrentUser } from "@/lib/auth";
import { resolveAudio } from "@/lib/media";
import { canRead, getArticle } from "@/lib/queries";

export async function GET(request: Request, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  const item = getArticle(Number(id));
  if (!item || item.kind !== "podcast" || !item.audio_path) {
    return new Response("Not found", { status: 404 });
  }

  const user = await getCurrentUser();
  if (!canRead(user, item)) return new Response("Payment required", { status: 402 });

  const audio = resolveAudio(item.audio_path);
  if (!audio) return new Response("Audio file missing", { status: 404 });

  const size = statSync(audio.file).size;
  const headers: Record<string, string> = {
    "Content-Type": audio.type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };

  // The browser asks for pieces ("bytes=start-end") when you skip around.
  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(audio.file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  const stream = Readable.toWeb(createReadStream(audio.file)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
