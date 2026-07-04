self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  let webPayload = payload;
  if (typeof payload.WEB === 'string') {
    try {
      webPayload = JSON.parse(payload.WEB);
    } catch {
      webPayload = payload;
    }
  }

  const notification = webPayload.notification || {};
  const data = webPayload.data || {};
  const title = notification.title || payload.title || 'New blog post';
  const options = {
    body: notification.body || payload.body || payload.default || '',
    icon: notification.icon || '/g-logo.svg',
    badge: '/g-logo.svg',
    data: {
      url: data.url || '/blog',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/blog';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
