// Klangschrift – Offline-Speicher.
// Die Seite selbst wird immer zuerst frisch aus dem Netz geholt (Updates erscheinen sofort);
// nur ohne Internet kommt sie aus dem Speicher. Bei jeder neuen Version VERSION hochzählen.
const VERSION = 'klangschrift-v14';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // „reload“: am Browser-Zwischenspeicher vorbei, damit wirklich die neuen Dateien gespeichert werden
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => r.ok ? c.put(f, r) : null).catch(() => null))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate' || /\/(index\.html)?(\?.*)?$/.test(new URL(e.request.url).pathname);
  if (isPage) {
    // Netz zuerst (ohne veralteten Zwischenspeicher), sonst gespeicherte Fassung
    e.respondWith(fetch(e.request, { cache: 'no-cache' })
      .then(r => { if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); } return r; })
      .catch(() => caches.match('./index.html').then(h => h || caches.match('./'))));
    return;
  }
  // Bilder, Manifest: Speicher zuerst, im Hintergrund auffrischen
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
