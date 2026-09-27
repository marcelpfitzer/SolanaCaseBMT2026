"use client";

// "Download for offline" per item, plus "Download all". Shows what's already on this device.

import { useCallback, useEffect, useState } from "react";
import { isSavedOffline, refreshLibraryCopy, removeOffline, saveOffline } from "@/lib/offline";

type Item = { id: number; kind: "article" | "podcast" };
type Status = "unknown" | "saved" | "not-saved" | "saving" | "error";

// Everything on the library page shares one status map, so "Download all" updates each row.
const listeners = new Set<() => void>();
const statuses = new Map<number, Status>();
const setStatus = (id: number, status: Status) => {
  statuses.set(id, status);
  listeners.forEach((listener) => listener());
};

function useStatus(id: number): Status {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => void listeners.delete(listener);
  }, []);
  return statuses.get(id) ?? "unknown";
}

async function download(item: Item) {
  setStatus(item.id, "saving");
  try {
    await saveOffline(item.id, item.kind);
    setStatus(item.id, "saved");
  } catch {
    setStatus(item.id, "error");
  }
}

export function OfflineButton({ item }: { item: Item }) {
  const status = useStatus(item.id);

  useEffect(() => {
    if (statuses.has(item.id)) return;
    isSavedOffline(item.id).then((saved) => setStatus(item.id, saved ? "saved" : "not-saved"));
  }, [item.id]);

  if (status === "saved") {
    return (
      <span className="type-caption flex items-center gap-3 text-black/60">
        ✓ On this device
        <button
          onClick={() => removeOffline(item.id).then(() => setStatus(item.id, "not-saved"))}
          className="text-apple-link hover:underline"
        >
          Remove
        </button>
      </span>
    );
  }
  return (
    <button onClick={() => download(item)} disabled={status === "saving" || status === "unknown"} className="btn-pill">
      {status === "saving" ? "Downloading…" : status === "error" ? "Retry download" : "Download"}
    </button>
  );
}

export function DownloadAll({ items }: { items: Item[] }) {
  const [busy, setBusy] = useState(false);

  // Keep the offline copy of this page up to date whenever it's opened online.
  const refresh = useCallback(() => {
    if (navigator.onLine) refreshLibraryCopy().catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);

  if (items.length === 0) return null;
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        for (const item of items) if (statuses.get(item.id) !== "saved") await download(item);
        setBusy(false);
      }}
      className="btn-blue"
    >
      {busy ? "Downloading…" : "Download all for offline"}
    </button>
  );
}
