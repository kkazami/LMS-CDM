const CACHE_NAME = 'cdm-lms-public-v2';
const OFFLINE_URL = '/offline.html';
const PRECACHE_ASSETS = ['/manifest.json', '/images/cdm-logo.png', OFFLINE_URL];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('cdm-lms-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // API responses and account pages must never survive sign-out in Cache Storage.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;
  const publicAsset = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/images/') || PRECACHE_ASSETS.includes(url.pathname);
  if (publicAsset) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      const refresh = fetch(request).then(response => {
        if (response.ok && !/no-store|private/i.test(response.headers.get('cache-control') || '')) void cache.put(request, response.clone());
        return response;
      });
      if (cached) { event.waitUntil(refresh.catch(() => {})); return cached; }
      return refresh;
    }));
  } else if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || new Response('Offline. Check your connection.', { status: 503, headers: { 'Content-Type': 'text/plain' } })));
  }
});