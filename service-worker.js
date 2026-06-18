// ============================================================
// service-worker.js — PWA offline support
// ============================================================
const VERSION = 'lifeos-v2.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/store.js',
  './js/bus.js',
  './js/router.js',
  './js/utils.js',
  './js/planner.js',
  './js/secretary.js',
  './js/secretary-ui.js',
  './js/seed.js',
  './js/sidebar.js',
  './js/toast-stack.js',
  './js/dashboard.js',
  './js/calendar.js',
  './js/planner-page.js',
  './js/tasks.js',
  './js/goals.js',
  './js/habits.js',
  './js/focus.js',
  './js/study.js',
  './js/food.js',
  './js/finance.js',
  './js/wellness.js',
  './js/screentime.js',
  './js/analytics.js',
  './js/timeline.js',
  './js/integrations.js',
  './js/security.js',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request).then((res) => {
        // Cache same-origin successful responses
        if (res.ok && new URL(e.request.url).origin === self.location.origin) {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
