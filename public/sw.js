self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Nuevo mensaje", {
      body: data.body ?? "",
      icon: "/icon-192.png",
      badge: "/notification-badge.png",
      tag: "flashtto-message",
      renotify: true,
      data: { url: data.url ?? "/messages" },
    })
  );
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
