const CACHE_NAME = 'lesson5-v1';
const urlsToCache = [
  './',
  './index.html',
  './theory.html',
  './hanzi.html',
  './tasks.json',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});