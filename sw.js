/* Offline-Cache: Die App funktioniert nach dem ersten Laden ohne Internet. Es werden nur eigene Dateien gecacht. */
const CACHE = 'rof-bildstudio-v2.0.0';
const FILES = ['./', 'index.html', 'css/app.css', 'manifest.json', 'icon-512.png', 'apple-touch-icon.png',
  'js/app.js', 'js/editor.js', 'js/panels.js', 'js/modes.js', 'js/process.js', 'js/effects.js', 'js/compose.js',
  'js/brush.js', 'js/data.js', 'js/util.js', 'js/store.js', 'js/zip.js', 'js/icons.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  /* Netz zuerst (damit Updates ankommen), sonst Cache */
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
