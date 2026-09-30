/* NoteLite offline support: keeps a copy of the app so it opens without network.
   Always tries the network first (so updates you upload show up), falls back to the saved copy. */
const CACHE = 'notelite-app-v1';
const APP = ['./', './manifest.webmanifest', './icon-180.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // GitHub API calls go straight to the network
  const scope = new URL(self.registration.scope);
  const isApp = req.mode === 'navigate' || url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html';
  const key = isApp ? './' : req;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([fetch(req, { cache: 'no-store' }), timeout(4000)]);
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    } catch (_) {
      const hit = await cache.match(key);
      return hit || new Response('NoteLite đang ngoại tuyến và chưa có bản lưu.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
