/**
 * LifeOS — Service Worker
 * ========================================================================
 * Provides offline-first caching for the LifeOS PWA.
 *
 * Strategy:
 *   • Install  — pre-cache the full app shell (HTML, CSS, JS, manifest).
 *   • Activate — purge any caches from older versions.
 *   • Fetch    — cache-first for static assets, network-first for API/data
 *                requests, with graceful offline fallbacks.
 *
 * Bump CACHE_VERSION whenever you ship a new build so that the activate
 * step clears stale assets and the install step pulls fresh ones.
 * ========================================================================
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE  = `lifeos-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `lifeos-dynamic-${CACHE_VERSION}`;
const FONT_CACHE    = `lifeos-fonts-${CACHE_VERSION}`;

/* ── App-shell files to pre-cache during install ────────────────────── */
const PRE_CACHE_URLS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/data.js',
  '/js/app.js',
  '/js/secretary.js',
  '/js/screentime.js',
  '/js/kanban.js',
  '/js/integrations.js',
  '/js/notifications.js',
  '/js/timeline.js',
  '/js/ambient.js',
  '/js/study.js',
  '/js/food.js',
  '/js/finance.js',
  '/js/wellness.js',
  '/js/security.js',
  '/manifest.json',
  '/icons/icon.svg'
];

/* ── Helpers ────────────────────────────────────────────────────────── */

/**
 * Determine whether a request URL points to a Google Fonts resource
 * (stylesheet or woff2 file) so we can cache them separately with a
 * long TTL.
 */
function isFontRequest(url) {
  return url.origin === 'https://fonts.googleapis.com' ||
         url.origin === 'https://fonts.gstatic.com';
}

/**
 * Return true for any URL we treat as a "dynamic" / API call that
 * should use a network-first strategy.
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.pathname.startsWith('/data/') ||
         url.hostname !== self.location.hostname;
}

/**
 * Build a minimal offline fallback response when the network is
 * unreachable and nothing is cached.
 */
function offlineFallbackResponse() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>LifeOS — Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      background:#0a0a0f;color:#e0e0e0;display:flex;
      align-items:center;justify-content:center;min-height:100vh;
      text-align:center;padding:2rem;
    }
    .offline-card{
      background:rgba(108,92,231,.12);border:1px solid rgba(108,92,231,.3);
      border-radius:1.25rem;padding:3rem 2rem;max-width:420px;
    }
    .offline-card svg{width:80px;height:80px;margin-bottom:1.5rem;opacity:.8}
    h1{font-size:1.5rem;margin-bottom:.75rem;color:#a29bfe}
    p{font-size:1rem;line-height:1.6;opacity:.7;margin-bottom:1.5rem}
    button{
      background:#6c5ce7;color:#fff;border:none;padding:.85rem 2rem;
      border-radius:.75rem;font-size:1rem;cursor:pointer;
      transition:background .2s;
    }
    button:hover{background:#7c6ff7}
  </style>
</head>
<body>
  <div class="offline-card">
    <svg viewBox="0 0 24 24" fill="none" stroke="#a29bfe" stroke-width="1.5"
         stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
    <h1>You're Offline</h1>
    <p>LifeOS needs an internet connection for the first load.
       Your data is safely stored locally — reconnect and try again.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/* ═══════════════════════════════════════════════════════════════════════
 * INSTALL — pre-cache the app shell
 * ═══════════════════════════════════════════════════════════════════════ */
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${CACHE_VERSION}`);

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(PRE_CACHE_URLS);
      })
      .then(() => {
        // Activate immediately instead of waiting for open tabs to close
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Pre-cache failed:', err);
        // Don't throw — let the SW install even if a non-critical asset
        // fails (e.g., on first deploy before all files exist).
      })
  );
});

/* ═══════════════════════════════════════════════════════════════════════
 * ACTIVATE — clean up outdated caches
 * ═══════════════════════════════════════════════════════════════════════ */
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${CACHE_VERSION}`);

  const currentCaches = new Set([STATIC_CACHE, DYNAMIC_CACHE, FONT_CACHE]);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('lifeos-') && !currentCaches.has(name))
            .map((name) => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Claim all open clients so the new SW takes effect immediately
        return self.clients.claim();
      })
  );
});

/* ═══════════════════════════════════════════════════════════════════════
 * FETCH — route requests through the appropriate caching strategy
 * ═══════════════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests — let mutations pass through
  if (request.method !== 'GET') return;

  // Skip chrome-extension, devtools, etc.
  if (!url.protocol.startsWith('http')) return;

  /* ── Font requests → cache-first with long-lived font cache ──── */
  if (isFontRequest(url)) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  /* ── API / external data → network-first ─────────────────────── */
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  /* ── Everything else (app shell / static assets) → cache-first ─ */
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

/* ── Cache-first strategy ───────────────────────────────────────────── */
async function cacheFirst(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const networkResponse = await fetch(request);

    // Cache successful responses for next time
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (err) {
    // If the request is for a page navigation, show the offline fallback
    if (request.mode === 'navigate') {
      return offlineFallbackResponse();
    }
    // For sub-resources, try the static cache as a last resort
    const fallback = await caches.match(request);
    if (fallback) return fallback;

    return new Response('Offline — resource unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/* ── Network-first strategy ─────────────────────────────────────────── */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Cache a clone of successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (err) {
    // Network failed — fall back to cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Last resort for navigation requests
    if (request.mode === 'navigate') {
      return offlineFallbackResponse();
    }

    return new Response(
      JSON.stringify({ error: 'offline', message: 'You are currently offline.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * MESSAGE — allow the main app to trigger cache operations
 * ═══════════════════════════════════════════════════════════════════════ */
self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    /* Force the waiting SW to activate immediately */
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    /* Return the current cache version so the app can show "update available" */
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;

    /* Clear all LifeOS caches (useful for debugging) */
    case 'CLEAR_CACHES':
      caches.keys().then((names) =>
        Promise.all(
          names.filter((n) => n.startsWith('lifeos-')).map((n) => caches.delete(n))
        )
      ).then(() => {
        event.ports[0]?.postMessage({ cleared: true });
      });
      break;

    default:
      break;
  }
});
