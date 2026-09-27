// Service worker: makes saved articles and podcasts work without internet.
//
// Online:  everything comes from the network as usual. Saved pages are refreshed.
// Offline: pages, audio and the app's scripts are served from the offline cache
//          (filled by src/lib/offline.ts when you buy or download something).

const CACHE = "payperread-offline-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/media/")) {
    event.respondWith(audio(request, url));
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(asset(request));
  } else if (request.mode === "navigate") {
    event.respondWith(page(request, url));
  }
});

// Pages: network first. Keep saved copies fresh; fall back to the copy when offline.
async function page(request, url) {
  const cache = await caches.open(CACHE);
  const key = url.pathname + url.search;
  try {
    const response = await fetch(request);
    if (response.ok && (await cache.match(key))) await cache.put(key, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(key)) ||
      (await cache.match("/library")) ||
      new Response(
        "<!doctype html><meta name=viewport content='width=device-width'><body style='font-family:-apple-system,Helvetica,Arial,sans-serif;padding:40px;color:#1d1d1f'><h1>You're offline</h1><p>This page isn't saved on this device. Open your library while online to download your purchases.</p></body>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      )
    );
  }
}

// Scripts, styles, images: network first, remember a copy for offline use.
async function asset(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

// Podcast audio: play the downloaded copy if there is one (supports seeking).
async function audio(request, url) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(url.pathname);
  if (!saved) return fetch(request);

  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") || "");
  if (!range) return saved;

  const data = await saved.arrayBuffer();
  const size = data.byteLength;
  const start = range[1] ? Number(range[1]) : 0;
  const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  return new Response(data.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": saved.headers.get("Content-Type") || "audio/mp4",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}
