/**
 * Ledra Service Worker
 * - Caches app shell for offline resilience
 * - Network-first for API calls, cache-first for static assets
 */

const CACHE_NAME = "ledra-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and API requests
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  // Static assets (fonts, images): cache-first
  // JS/CSS are excluded — Next.js uses content-hashed URLs and handles its own caching
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|avif|woff2?|ico|gif)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // All other requests (HTML, JS, CSS, API): network-only
  // Let Next.js and the browser handle caching via Cache-Control headers
});
