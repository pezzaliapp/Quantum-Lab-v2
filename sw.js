/* Quantum Lab v2.1 — service worker.
   App-shell cache with relative paths (works from any sub-folder). Same-origin
   only: cross-origin requests are never cached. Stale caches are removed on
   activate, and SKIP_WAITING lets the page apply an update on demand. */

const VERSION = 'quantum-lab-v2.1.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/i18n.js',
  './js/parser.js',
  './js/analyses.js',
  './js/password.js',
  './js/import.js',
  './js/router.js',
  './js/pwa.js',
  './js/app.js',
  './locales/it.json',
  './locales/en.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)));
  // Do NOT skipWaiting automatically — the page decides when to update.
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never handle or cache cross-origin requests.
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first, fall back to cached shell (offline).
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Static assets: cache-first, then network with runtime caching.
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
