// GET /api/writer/sales → the logged-in writer's newest sales (polled by the live feed).

import { getCurrentUser } from "@/lib/auth";
import { writerRecentSales } from "@/lib/queries";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "writer" && user.role !== "admin")) {
    return Response.json({ error: "Writers only." }, { status: 403 });
  }
  return Response.json({ sales: writerRecentSales(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
