const STATIC_CACHE = 'design-diario-static-v2';
const RUNTIME_CACHE = 'design-diario-runtime-v2';
const OFFLINE_URL = '/offline.html';
const APP_SHELL = ['/', '/manifest.json', '/logo-dd.svg', '/favicon-dd.svg', OFFLINE_URL];
const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Design Diário offline</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;background:#0f1115;color:#e5e7eb;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;box-sizing:border-box}.card{max-width:520px;background:#1f2937;border-radius:1rem;padding:2rem;box-shadow:0 12px 30px rgba(15,23,42,.4);text-align:center}.logo{width:84px;height:84px;margin:0 auto 1rem;display:block}h1{margin:0 0 .5rem;font-size:1.5rem}p{margin:0 0 1.5rem;color:#cbd5f5;line-height:1.5}button{background:#0d6efd;border:none;color:#fff;padding:.6rem 1rem;border-radius:999px;cursor:pointer;font-weight:600}</style></head><body><div class="card"><svg class="logo" viewBox="0 0 512 512" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="96" fill="#0d6efd"></rect><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="220" font-weight="700" fill="#ffffff">DD</text></svg><h1>Você está offline</h1><p>Sem conexão no momento. Quando a internet voltar, atualizamos seus artigos automaticamente.</p><button onclick="location.reload()">Tentar novamente</button></div></body></html>`;

const safeCacheAddAll = async (cache, urls) => {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        await cache.add(url);
        return true;
      } catch {
        return false;
      }
    })
  );
  return results.some(Boolean);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const added = await safeCacheAddAll(cache, APP_SHELL);
      if (!added) {
        await cache.addAll(['/']);
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const networkFirst = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    if (request.mode === 'navigate') {
      const cachedOffline = await caches.match(OFFLINE_URL);
      if (cachedOffline) {
        return cachedOffline;
      }
      return new Response(OFFLINE_HTML, {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      });
    }
    throw new Error('Network error');
  }
};

const cacheFirst = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response && response.status === 200) {
    cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/api')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag !== 'refresh-articles') {
    return;
  }
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch('/api/articles');
        const cache = await caches.open(RUNTIME_CACHE);
        if (response && response.status === 200) {
          cache.put('/api/articles', response.clone());
        }
      } catch {
        return;
      }
    })()
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'refresh-articles') {
    return;
  }
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch('/api/articles');
        const cache = await caches.open(RUNTIME_CACHE);
        if (response && response.status === 200) {
          cache.put('/api/articles', response.clone());
        }
      } catch {
        return;
      }
    })()
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Design Diário';
  const body = data.body || 'Novos artigos disponíveis';
  const url = data.url || '/';
  const options = {
    body,
    icon: '/logo-dd.svg',
    badge: '/logo-dd.svg',
    data: { url },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return null;
    })()
  );
});
