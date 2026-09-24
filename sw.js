/* Locos x la Pizza — Service Worker
 *
 * Objetivo: que la app sea instalable como PWA y que el "cascarón" (index.html,
 * íconos, SDK de Firebase, fuentes) abra rápido y también sin conexión.
 *
 * IMPORTANTE: este SW NO intercepta el tráfico de Firestore / Firebase Auth /
 * WhatsApp ni ningún request que no sea GET. Todo eso pasa directo a la red.
 * Sin conexión la app abre, pero los pedidos siguen necesitando Firestore
 * (número de pedido, guardado de ventas) — eso requiere el "modo offline" real.
 *
 * Al hacer cambios en este archivo, subí el número de CACHE para forzar la
 * actualización en los equipos ya instalados.
 */
const CACHE = 'lxp-shell-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png'
];

// CDNs de terceros que se pueden cachear (scripts versionados y fuentes)
function isCacheableCdn(url) {
  return (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))
      || url.hostname === 'fonts.googleapis.com'
      || url.hostname === 'fonts.gstatic.com';
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // nunca tocar POST/PUT (Firestore, etc.)

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // App propia: RED PRIMERO (para que cada deploy se vea al instante),
    // y si no hay red, se sirve la última copia cacheada.
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached =>
            cached || (req.mode === 'navigate' ? caches.match('/index.html') : undefined)
          )
        )
    );
    return;
  }

  if (isCacheableCdn(url)) {
    // SDK de Firebase y fuentes: CACHE PRIMERO, actualizando en segundo plano.
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req)
          .then(res => {
            caches.open(CACHE).then(cache => cache.put(req, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Todo lo demás (firestore.googleapis.com, identitytoolkit, wa.me, ...) → pasa directo, sin cache.
});
