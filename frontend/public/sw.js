/* Service Worker de Exiracks — notificaciones push e instalabilidad (PWA).
   No cachea la app (passthrough) para evitar quedarse con versiones viejas. */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Recibe una notificación push del servidor y la muestra.
self.addEventListener('push', (event) => {
  let data = { title: 'Exiracks', body: 'Tienes una nueva notificación.', url: '/admin' };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || 'exiracks',
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: data.url || '/admin' },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Al tocar la notificación, abre/enfoca el panel.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try { client.navigate(targetUrl); } catch (e) { /* noop */ }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// Handler de fetch vacío: habilita la instalabilidad sin cachear nada.
self.addEventListener('fetch', () => {});
