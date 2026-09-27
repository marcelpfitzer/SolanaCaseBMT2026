"use client";

// Tells the server "this item was viewed" once per page visit (for the writer's statistics).

import { useEffect } from "react";

export default function ViewTracker({ articleId }: { articleId: number }) {
  useEffect(() => {
    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
      keepalive: true,
    }).catch(() => {}); // offline or blocked: no problem
  }, [articleId]);
  return null;
}
