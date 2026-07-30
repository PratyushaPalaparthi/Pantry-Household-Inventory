const CACHE_NAME = "pantry-shell-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Assets we must never cache. Next's dev server serves HMR updates from
// /_next/static/webpack/ and its dev chunks under stable (non-hashed) names, so
// caching either one pins the app to a stale build. Only content-hashed
// production assets are safe to serve cache-first.
function isNeverCacheable(pathname) {
  return pathname.startsWith("/_next/static/webpack/") || pathname.includes("hot-update");
}

// Serve from cache immediately, but refresh in the background so a changed file
// (icons, manifest, offline page) is picked up on the next visit instead of
// being pinned forever.
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle our own origin; cross-origin requests go straight to network.
  if (url.origin !== self.location.origin) return;

  if (isNeverCacheable(url.pathname)) return;

  // Network-first for page navigations (this app is dynamic/authenticated data,
  // so we don't pretend to serve fresh inventory offline) — just fall back to
  // a friendly offline page instead of the browser's default error screen.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Immutable, content-hashed build output: safe to serve cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // The precached shell: revalidate so it isn't pinned across deploys.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
