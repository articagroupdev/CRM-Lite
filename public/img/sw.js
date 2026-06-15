// Service Worker para CRM Artica - Artask
// Versión 1.0.0

const CACHE_NAME = 'artask-v1';
const RUNTIME_CACHE = 'artask-runtime-v1';
const IMAGE_CACHE = 'artask-images-v1';
const API_CACHE = 'artask-api-v1';

// Recursos estáticos para cachear durante la instalación
const STATIC_ASSETS = [
  '/',
  '/tasks',
  '/offline',
  '/manifest.json',
  // Añadir más recursos estáticos según sea necesario
];

// Rutas de API que deben cachearse
const API_ROUTES = [
  '/api/tasks',
  '/api/boards',
  '/api/users',
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Eliminar caches antiguas
              return cacheName !== CACHE_NAME &&
                     cacheName !== RUNTIME_CACHE &&
                     cacheName !== IMAGE_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estrategia de fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests que no sean GET
  if (request.method !== 'GET') {
    return;
  }

  // Estrategia para imágenes: Cache First
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Estrategia para API: Network First con fallback a cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Estrategia para páginas: Network First con fallback a cache
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE));
    return;
  }

  // Estrategia por defecto: Cache First con fallback a network
  event.respondWith(cacheFirstStrategy(request, RUNTIME_CACHE));
});

// Estrategia Cache First
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    console.log('[SW] Fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Cachear respuesta si es exitosa
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache First failed:', error);
    
    // Si es una navegación, mostrar página offline
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/offline');
    }
    
    throw error;
  }
}

// Estrategia Network First
async function networkFirstStrategy(request, cacheName) {
  try {
    console.log('[SW] Fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Cachear respuesta si es exitosa
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    // Si es una navegación, mostrar página offline
    if (request.mode === 'navigate') {
      const mainCache = await caches.open(CACHE_NAME);
      return mainCache.match('/offline');
    }

    throw error;
  }
}

// Background Sync para sincronizar datos cuando vuelva la conexión
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  try {
    // Obtener tareas pendientes del IndexedDB
    const pendingTasks = await getPendingTasks();
    
    if (pendingTasks.length === 0) {
      console.log('[SW] No pending tasks to sync');
      return;
    }

    console.log('[SW] Syncing', pendingTasks.length, 'pending tasks');

    // Sincronizar cada tarea
    for (const task of pendingTasks) {
      try {
        const response = await fetch(task.url, {
          method: task.method,
          headers: task.headers,
          body: task.body,
        });

        if (response.ok) {
          // Eliminar tarea de la cola de pendientes
          await removePendingTask(task.id);
          console.log('[SW] Task synced successfully:', task.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync task:', task.id, error);
      }
    }

    // Notificar a los clientes que la sincronización terminó
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        pendingCount: await getPendingTasksCount(),
      });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

// Funciones auxiliares para IndexedDB (simuladas)
async function getPendingTasks() {
  // Implementar con IndexedDB
  return [];
}

async function removePendingTask(taskId) {
  // Implementar con IndexedDB
}

async function getPendingTasksCount() {
  // Implementar con IndexedDB
  return 0;
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let notificationData = {
    title: 'Artask',
    body: 'Tienes una nueva notificación',
    icon: '/icon-192.png',
    badge: '/icon-badge.png',
    tag: 'artask-notification',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions || [],
    })
  );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/tasks';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Si no, abrir nueva ventana
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Manejo de mensajes desde el cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});

console.log('[SW] Service Worker loaded');
















