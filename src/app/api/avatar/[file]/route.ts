// GET /api/avatar/<file> → an uploaded profile picture.

import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { IMAGE_TYPES, UPLOAD_DIR, isSafeName } from "@/lib/avatars";

export async function GET(_request: Request, ctx: RouteContext<"/api/avatar/[file]">) {
  const { file } = await ctx.params;
  const path = join(UPLOAD_DIR, file);
  if (!isSafeName(file) || !existsSync(path)) return new Response("Not found", { status: 404 });
  return new Response(readFileSync(path), {
    headers: {
      "Content-Type": IMAGE_TYPES[extname(file).toLowerCase()],
      "Cache-Control": "public, max-age=31536000, immutable", // file names are unique
      "X-Content-Type-Options": "nosniff",
    },
  });
}
