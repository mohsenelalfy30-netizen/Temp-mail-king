const CACHE_NAME = 'tempmail-king-v1';
const urlsToCache = [
  "/",
  "/index.html",
  "/logic.js",
  "/decoder.js", // تأكد من وجود هذا الملف في مسارك
  "/domains.js",
  "/api-config.js",
  "/src/main.tsx",
  "/src/i18n.ts",
  "/manifest.json",
  "https://cdn.jsdelivr.net/npm/postal-mime@2.1.0/+esm", // إضافة المكتبة للكاش لضمان عملها أوفلاين
  "/src/locales/am/translation.json",
  "/src/locales/ar/translation.json",
  "/src/locales/bn/translation.json",
  "/src/locales/de/translation.json",
  "/src/locales/en/translation.json",
  "/src/locales/es/translation.json",
  "/src/locales/fa/translation.json",
  "/src/locales/fr/translation.json",
  "/src/locales/gu/translation.json",
  "/src/locales/ha/translation.json",
  "/src/locales/he/translation.json",
  "/src/locales/hi/translation.json",
  "/src/locales/id/translation.json",
  "/src/locales/ig/translation.json",
  "/src/locales/it/translation.json",
  "/src/locales/ja/translation.json",
  "/src/locales/kn/translation.json",
  "/src/locales/ko/translation.json",
  "/src/locales/ml/translation.json",
  "/src/locales/mr/translation.json",
  "/src/locales/ms/translation.json",
  "/src/locales/my/translation.json",
  "/src/locales/nl/translation.json",
  "/src/locales/pa/translation.json",
  "/src/locales/pl/translation.json",
  "/src/locales/pt/translation.json",
  "/src/locales/ru/translation.json",
  "/src/locales/sw/translation.json",
  "/src/locales/ta/translation.json",
  "/src/locales/te/translation.json",
  "/src/locales/th/translation.json",
  "/src/locales/tl/translation.json",
  "/src/locales/tr/translation.json",
  "/src/locales/uk/translation.json",
  "/src/locales/ur/translation.json",
  "/src/locales/vi/translation.json",
  "/src/locales/xh/translation.json",
  "/src/locales/yo/translation.json",
  "/src/locales/zh/translation.json",
  "/src/locales/zu/translation.json"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
