self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const show = self.registration.showNotification(data.title ?? "Nuevo mensaje", {
    body: data.body ?? "",
    icon: data.icon ?? "/icon-notification.png",
    badge: "/notification-badge.png",
    tag: data.tag ?? "flashttoo",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url ?? "/" },
  }).catch(() =>
    self.registration.showNotification(data.title ?? "Nuevo mensaje", {
      body: data.body ?? "",
      tag: data.tag ?? "flashttoo",
      renotify: true,
      data: { url: data.url ?? "/" },
    })
  );
  event.waitUntil(show);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const appUrl = event.notification.data?.url ?? "/messages";
        for (const client of list) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(appUrl);
            return client.focus();
          }
        }
        return clients.openWindow(appUrl);
      })
  );
});
