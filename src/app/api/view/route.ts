// POST /api/view  { articleId }  → counts one view (per viewer, item and day).
// Logged-in users are counted by account, everyone else by an anonymous random cookie.
// Writers viewing their own work and admins are not counted.

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getArticle, recordView } from "@/lib/queries";

export async function POST(request: Request) {
  const { articleId } = await request.json().catch(() => ({}));
  const article = typeof articleId === "number" ? getArticle(articleId) : null;
  if (!article) return new Response(null, { status: 204 });

  const user = await getCurrentUser();
  if (user && (user.role === "admin" || user.id === article.writer_id)) return new Response(null, { status: 204 });

  let viewer = user ? `user:${user.id}` : null;
  if (!viewer) {
    const store = await cookies();
    let anon = store.get("anon_id")?.value;
    if (!anon || !/^[a-f0-9]{32}$/.test(anon)) {
      anon = randomBytes(16).toString("hex");
      store.set("anon_id", anon, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    viewer = `anon:${anon}`;
  }

  recordView(article.id, viewer);
  return new Response(null, { status: 204 });
}
