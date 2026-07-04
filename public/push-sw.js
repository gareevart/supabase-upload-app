/* Blog push service worker v2 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function absoluteUrl(path) {
  if (!path) {
    return `${self.location.origin}/blog`;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${self.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function parsePushPayload(event) {
  let title = 'New blog post';
  let body = 'A new post was published';
  let url = '/blog';

  if (!event.data) {
    return { title, body, url: absoluteUrl(url) };
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    const text = event.data.text();
    return {
      title,
      body: text || body,
      url: absoluteUrl(url),
    };
  }

  if (typeof payload.WEB === 'string') {
    try {
      const web = JSON.parse(payload.WEB);
      if (web.notification) {
        title = web.notification.title || title;
        body = web.notification.body || body;
      } else {
        title = web.title || title;
        body = web.body || body;
      }
      url = web.data?.url || web.url || url;
    } catch {
      body = payload.WEB;
    }
  }

  if (payload.notification) {
    title = payload.notification.title || title;
    body = payload.notification.body || body;
  }

  if (payload.data?.url) {
    url = payload.data.url;
  }

  if (payload.title) {
    title = payload.title;
  }

  if (payload.body || payload.default) {
    body = payload.body || payload.default || body;
  }

  return {
    title,
    body,
    url: absoluteUrl(url),
  };
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const { title, body, url } = parsePushPayload(event);
      const icon = absoluteUrl('/g-logo.svg');

      await self.registration.showNotification(title, {
        body,
        icon,
        badge: icon,
        data: { url },
      });
    })().catch((error) => {
      console.error('[push-sw] Failed to show notification:', error);
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || absoluteUrl('/blog');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then(() => client.focus());
          }
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
