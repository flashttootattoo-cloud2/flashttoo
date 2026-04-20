self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

// Re-subscribe when the push subscription is invalidated by the browser/OS
// (e.g. Chrome update, Android killing background services, long inactivity).
// Without this, pushes silently stop arriving until the user opens the app.
self.addEventListener("pushsubscriptionchange", (event) => {
  // Re-subscribe using the same options as the expired subscription.
  // Called by the browser when the subscription is invalidated
  // (Chrome update, Android battery killer, long inactivity).
  const options = event.oldSubscription?.options ?? { userVisibleOnly: true };
  event.waitUntil(
    self.registration.pushManager.subscribe(options)
      .then((sub) =>
        fetch("/api/push/subscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        })
      )
      .catch(() => {
        // If session expired, user re-registers on next app open.
      })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const base = {
    body: data.body ?? "",
    icon: data.icon ?? "/icon-notification.png",
    badge: "/notification-badge.png",
    tag: data.tag ?? "flashttoo",
    renotify: true,
    data: { url: data.url ?? "/" },
  };
  // Try with vibrate first; some Android versions reject it — fall back without
  const show = self.registration.showNotification(data.title ?? "Nuevo mensaje", {
    ...base,
    vibrate: [200, 100, 200],
  }).catch(() =>
    self.registration.showNotification(data.title ?? "Nuevo mensaje", base)
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
