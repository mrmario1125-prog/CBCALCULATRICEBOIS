const CACHE_NAME = 'calculadora-madera-v3-3-neon-name';
const APP_FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const APP_CACHE_PREFIX = 'calculadora-madera-';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(APP_CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Para la página principal y HTML: primero intenta obtener la versión actual.
  // Si no hay conexión, utiliza la copia guardada para modo sin conexión.
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          await cache.put(request, fresh.clone());
          if (url.pathname.endsWith('/') || request.mode === 'navigate') {
            await cache.put('./index.html', fresh.clone());
          }
        }
        return fresh;
      } catch (error) {
        return (await cache.match(request)) || (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Para iconos y otros recursos estáticos: caché primero, red como respaldo.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});
