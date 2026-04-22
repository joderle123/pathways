const CACHE_NAME = 'pathways-v3';

const PRECACHE_ASSETS = [
  'index.html',
  'css/style.css',
  'css/arbeitsblatt.css',
  'css/fachkraft-modul.css',
  'css/therapiemodul.css',
  'css/eltern-infoblatt.css',
  'css/evaluationsbogen.css',
  'css/entscheidungsbaum.css',
  'css/fallbeispiel.css',
  'css/sitzungsplan.css',
  'css/weiterbildung.css',
  'css/wissenstest.css',
  'js/app.js',
  'js/data.js',
  'js/icons.js',
  'js/phase-ressourcen.js',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.1.7/dist/purify.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pathways — Offline</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #FAFAFA;
      color: #1E293B;
      text-align: center;
      padding: 2rem;
    }
    .offline-container { max-width: 420px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #64748B; line-height: 1.6; }
    button {
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: #2563EB;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover { background: #1D4ED8; }
  </style>
</head>
<body>
  <div class="offline-container">
    <h1>Keine Verbindung</h1>
    <p>Pathways ist momentan offline und die angeforderte Seite ist nicht im Cache verfügbar. Bitte prüfen Sie Ihre Internetverbindung.</p>
    <button onclick="window.location.reload()">Erneut versuchen</button>
  </div>
</body>
</html>`;

// ---------- Install: precache core assets ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ---------- Activate: clean up old caches ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ---------- Fetch strategies ----------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // HTML files -> network-first
  if (request.headers.get('Accept')?.includes('text/html') ||
      url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (CSS, JS, fonts) -> cache-first
  if (url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else -> stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ---------- Strategy: network-first ----------
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(OFFLINE_PAGE, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// ---------- Strategy: cache-first ----------
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ---------- Strategy: stale-while-revalidate ----------
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
