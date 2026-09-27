"use client";

// Registers the service worker (public/sw.js) and shows a notice while offline.

import { useEffect, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export default function OfflineSupport() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    } else {
      // Dev server: no service worker, so you always see the latest code and styles.
      navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => r.unregister()));
    }
  }, []);

  if (online) return null;
  return (
    <div role="status" style={{ top: 52 }} className="type-caption sticky z-10 bg-apple-ink px-4 py-2 text-center text-white">
      You’re offline. Your downloaded stories and podcasts still work:{" "}
      <a href="/library" className="text-apple-link-dark underline">
        open library
      </a>
    </div>
  );
}
