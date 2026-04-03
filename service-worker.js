const CACHE_NAME = 'farmacia-dp-pwa-v1-1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './js/core.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './modules/ventas/ventas.js',
  './modules/ventas_mayoreo/ventas_mayoreo.js',
  './modules/inventario/inventario.js',
  './modules/inventario_mayoreo/inventario_mayoreo.js',
  './modules/clientes/clientes.js',
  './modules/clientes_mayoreo/clientes_mayoreo.js',
  './modules/historial/historial.js',
  './modules/historial_mayoreo/historial_mayoreo.js',
  './modules/bodega/bodega.js',
  './modules/reportes/reportes.js',
  './modules/reportes_mayoreo/reportes_mayoreo.js',
  './modules/dashboard/dashboard.js',
  './modules/dashboard_mayoreo/dashboard_mayoreo.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
