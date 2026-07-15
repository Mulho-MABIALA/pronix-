// ── Gestionnaire de notifications push ──────────────────────────────────────
// Ce script est importé par le service worker généré par vite-plugin-pwa

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } catch (e) {
      data = { title: 'fpronix', body: event.data.text() };
    }
  }

  const title = data.title || 'fpronix';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'fpronix-notif',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  const fullUrl = self.location.origin + url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si un onglet fpronix est déjà ouvert, le focus + navigue
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      // Sinon ouvrir un nouvel onglet
      return clients.openWindow(fullUrl);
    })
  );
});
