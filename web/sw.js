// Service worker : met en cache la "coquille" de l'app pour qu'elle
// s'ouvre même hors-ligne. Les photos et l'API ne sont jamais mises en cache.
const CACHE = "photo-roulette-v3";
const SHELL = [
  "/",
  "/static/styles.css",
  "/static/capture.js",
  "/static/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // ne jamais intercepter l'API, les uploads, ni le websocket
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/uploads") || url.pathname === "/ws") {
    return;
  }
  // coquille : RÉSEAU d'abord (toujours la dernière version), cache en secours hors-ligne
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
