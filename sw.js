const CACHE = 'kas-rc-arena-v1.2';
const BASE = self.registration.scope;
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/app.js',
  './js/store.js',
  './js/utils.js',
  './manifest.webmanifest',
  './assets/kas-logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
].map(path => new URL(path, BASE).toString());

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        if (event.request.mode === 'navigate') {
          return caches.match(new URL('./index.html', BASE).toString());
        }

        return Response.error();
      })
  );
});
