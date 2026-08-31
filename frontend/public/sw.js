const CACHE_NAME = 'crm-san-luis-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];
const API_BASE = '/api';

// ===== Install: precache static assets =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

// ===== Activate: cleanup old caches =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== Fetch: offline-first strategy =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar requests del mismo origen
  if (url.origin !== location.origin) return;

  // API requests: Network-first con fallback offline y cola de sincronización
  if (url.pathname.startsWith(API_BASE)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Navegación: Network-first, fallback al cache, fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Assets estáticos (JS, CSS, imágenes): Cache-first, stale-while-revalidate
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});

// ===== API Request Handler =====
async function handleApiRequest(request) {
  // POST/PUT/PATCH: intentar red, si falla guardar en cola
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    try {
      const response = await fetch(request);
      return response;
    } catch {
      // Solicitar background sync si está disponible
      if ('sync' in self.registration) {
        await self.registration.sync.register('sync-pending-data');
      }
      // Responder con error 503 Service Unavailable para indicar offline
      return new Response(
        JSON.stringify({ success: false, data: null, error: 'Sin conexión. La operación se sincronizará automáticamente cuando haya red.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // GET: Network-first con cache fallback
  try {
    const response = await fetch(request);
    // Cachear respuestas GET exitosas
    if (response.ok) {
      const clone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, clone);
    }
    return response;
  } catch {
    // Intentar servir desde cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Si no hay cache y estamos offline, devolver datos de IndexedDB si es posible
    return new Response(
      JSON.stringify({ success: false, data: null, error: 'Sin conexión y sin datos en caché.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ===== Background Sync =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // Notificar a todos los clientes que deben sincronizar
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_REQUIRED' });
  });
}

// ===== Push Notifications (preparado para futuro) =====
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'CRM San Luis', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: data.url
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data) {
    event.waitUntil(self.clients.openWindow(event.notification.data));
  }
});
