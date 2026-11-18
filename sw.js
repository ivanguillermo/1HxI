/**
 * Service worker · app de Estudio
 * Sube VERSION cada vez que cambies index.html para que se actualice el caché.
 */
const VERSION = 'estudio-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // las llamadas al backend son POST: nunca se cachean
  const url = new URL(req.url);
  if (url.hostname === 'script.google.com' || url.hostname.endsWith('googleusercontent.com') ||
      url.hostname === 'accounts.google.com') return;     // backend y login de Google: siempre en vivo

  // Página: primero la red (para ver cambios), y sin conexión la copia guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copia = r.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copia));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto (iconos, Tailwind CDN): copia guardada y actualización en segundo plano
  e.respondWith(
    caches.match(req).then(guardado => {
      const red = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) {
          const copia = r.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
        }
        return r;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
