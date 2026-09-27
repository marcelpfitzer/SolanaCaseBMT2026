// Browser only: keeps copies of bought articles and podcasts on this device,
// so they open without internet. The service worker (public/sw.js) serves them
// from this cache when the network is gone.

export const OFFLINE_CACHE = "payperread-offline-v1";

const pagePath = (id: number) => `/articles/${id}`;
const audioPath = (id: number) => `/api/media/${id}`;

const supported = () => typeof caches !== "undefined";

// Scripts, styles and images a page needs to work offline.
function assetUrls(html: string): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(/["'\s](\/(?:_next\/[^"'\s]+|[\w-]+\.(?:png|svg|ico)))/g)) {
    urls.add(match[1].replace(/&amp;/g, "&"));
  }
  return [...urls];
}

async function cachePage(cache: Cache, path: string) {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Could not download ${path}`);
  const html = await res.clone().text();
  await cache.put(path, res);
  // Missing assets are not fatal: most are already cached from browsing.
  await Promise.all(
    assetUrls(html).map(async (url) => {
      if (await cache.match(url)) return;
      const asset = await fetch(url).catch(() => null);
      if (asset?.ok) await cache.put(url, asset);
    }),
  );
}

// Save one bought item (plus the library page) for offline use.
export async function saveOffline(id: number, kind: "article" | "podcast") {
  if (!supported()) throw new Error("This browser can't save pages for offline use.");
  const cache = await caches.open(OFFLINE_CACHE);
  await cachePage(cache, pagePath(id));
  if (kind === "podcast") {
    const audio = await fetch(audioPath(id), { credentials: "same-origin" });
    if (!audio.ok) throw new Error("Could not download the audio.");
    await cache.put(audioPath(id), audio);
  }
  await cachePage(cache, "/library");
}

export async function isSavedOffline(id: number): Promise<boolean> {
  if (!supported()) return false;
  const cache = await caches.open(OFFLINE_CACHE);
  return !!(await cache.match(pagePath(id)));
}

export async function removeOffline(id: number) {
  if (!supported()) return;
  const cache = await caches.open(OFFLINE_CACHE);
  await Promise.all([cache.delete(pagePath(id)), cache.delete(audioPath(id))]);
}

// Refresh the saved copy of the library page (called when the library opens).
export async function refreshLibraryCopy() {
  if (!supported()) return;
  await cachePage(await caches.open(OFFLINE_CACHE), "/library");
}

// On logout: remove everything, so the next person on this device can't read it.
export async function clearOffline() {
  if (supported()) await caches.delete(OFFLINE_CACHE);
}
