const CACHE_PREFIX = 'memory-gohar-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);

self.addEventListener('install', (event) => {
  if (!IS_LOCAL) {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([self.registration.scope])));
  }
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && (IS_LOCAL || name !== CACHE_NAME))
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.pathname.includes('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({ error: 'Offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  // Development bundles keep the same URLs between builds and must never be cached.
  if (IS_LOCAL || request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Revalidate application pages and bundles on every request so a reload gets the latest build.
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const shell = await caches.match(self.registration.scope);
        if (shell) return shell;
      }
      throw error;
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});
