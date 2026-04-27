const CACHE_NAME = 'pathways-v3.1';

const PRECACHE_ASSETS = [
  'hub.html',
  'core/ui-base.css',
  'core/db.js',
  'core/bridge.js',
  'core/utils.js',
  'core/schemas.js',
  'core/constants.js',
  'core/instruments.js',
  'core/hypotheses-engine.js',
  'core/demo-seed.js',
  'hub/index.html',
  'hub/app.js',
  'hub/styles.css',
  'hub/views/home.js',
  'hub/views/profil.js',
  'hub/views/kalender.js',
  'hub/views/aufgaben.js',
  'hub/views/notizen.js',
  'hub/views/crisis.js',
  'hub/tools/cssrs.js',
  'hub/tools/safety-plan.js',
  'hub/tools/triage.js',
  'claro/index.html',
  'claro/app.js',
  'claro/styles.css',
  'claro/formulation/5p-builder.js',
  'claro/icd/mapper.js',
  'via/index.html',
  'via/app.js',
  'via/styles.css',
  'via/plan-views.js',
  'via/session-views.js',
  'via/phases/phase-templates.json',
  'codex/index.html',
  'codex/app.js',
  'codex/styles.css',
  'codex/parents-views.js',
  'codex/data/materials-index.json',
  'academy/index.html',
  'academy/app.js',
  'academy/styles.css',
  'academy/quiz/engine.js',
  'academy/courses/lernpfade-index.json',
  'academy/cdss/decision-trees.json',
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
