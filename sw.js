const CACHE_NAME = 'crop-sabzi-doctor-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const reqUrl = new URL(event.request.url);
  if (reqUrl.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkRes;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
        )
    );
  }
});
