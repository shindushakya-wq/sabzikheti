const STATIC_CACHE = 'crop-sabzi-doctor-static-v2';
const SHEET_CACHE = 'crop-sabzi-doctor-sheets-v2';
const MEDIA_CACHE = 'crop-sabzi-doctor-media-v2';
const ACTIVE_CACHES = [STATIC_CACHE, SHEET_CACHE, MEDIA_CACHE];

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => !ACTIVE_CACHES.includes(key)).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const reqUrl = new URL(event.request.url);

  // 1. Google Sheets CSV डेटा: पहले नेटवर्क, ऑफ़लाइन में कैश
  if (reqUrl.hostname.includes('docs.google.com') && reqUrl.pathname.includes('/gviz/tq')) {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(SHEET_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 2. इमेजेज: पहले कैश, फिर नेटवर्क
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((networkRes) => {
            if (networkRes && networkRes.ok) {
              const clone = networkRes.clone();
              caches.open(MEDIA_CACHE).then((cache) => cache.put(event.request, clone));
            }
            return networkRes;
          })
          .catch(() => null);

        return cached || networkFetch;
      })
    );
    return;
  }

  // 3. ऐप की अपनी फ़ाइलें: नेटवर्क मिले तो अपडेट, वरना कैश
  if (reqUrl.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (event.request.mode === 'navigate') return caches.match('./index.html');
            return new Response('', { status: 503 });
          })
        )
    );
  }
});
