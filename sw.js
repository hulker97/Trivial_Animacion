// Service Worker de Trivial de Animación: permite jugar sin conexión una vez que
// la app y el banco de preguntas se han cargado al menos una vez con internet.
//
// Estrategias distintas según el tipo de recurso:
// - La propia página y las imágenes de las casillas: "cache primero", para que
//   la app cargue al instante incluso sin conexión.
// - Las preguntas de Supabase: "red primero", para tener siempre lo más
//   actualizado cuando hay conexión, cayendo a lo que ya esté en caché si no la hay.

const CACHE_VERSION = 'trivial-v1';
const CACHE_ESTATICO = `${CACHE_VERSION}-estatico`;
const CACHE_PREGUNTAS = `${CACHE_VERSION}-preguntas`;

// Lo mínimo imprescindible para que la app arranque sin conexión.
// El resto de imágenes se van añadiendo solas a la caché la primera vez que se piden
// (ver el "cache-as-you-go" más abajo), así no hace falta mantener aquí una lista
// exhaustiva de las ~100 imágenes que se iría desactualizando.
const RECURSOS_BASICOS = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ESTATICO).then(cache => cache.addAll(RECURSOS_BASICOS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(nombres =>
      Promise.all(
        nombres
          .filter(n => n.startsWith('trivial-') && n !== CACHE_ESTATICO && n !== CACHE_PREGUNTAS)
          .map(n => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return; // no cachear escrituras (POST/PATCH, etc.)

  // Preguntas de Supabase: red primero, caer a caché si no hay conexión
  if (url.hostname.endsWith('.supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then(respuesta => {
          const copia = respuesta.clone();
          caches.open(CACHE_PREGUNTAS).then(cache => cache.put(event.request, copia));
          return respuesta;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Todo lo demás (la app, imágenes, scripts externos): caché primero, red de refresco
  event.respondWith(
    caches.match(event.request).then(enCache => {
      const fetchYActualizar = fetch(event.request).then(respuesta => {
        if (respuesta && respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE_ESTATICO).then(cache => cache.put(event.request, copia));
        }
        return respuesta;
      }).catch(() => enCache);
      return enCache || fetchYActualizar;
    })
  );
});
