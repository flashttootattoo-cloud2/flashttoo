// Service worker mínimo, solo para recibir y mostrar push notifications.
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()) })

function debugLog(info) {
  try {
    fetch('/api/push/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info),
    }).catch(() => {})
  } catch {}
}

self.addEventListener('push', event => {
  debugLog({ step: 'push-received', hasData: !!event.data })

  if (!event.data) { debugLog({ step: 'no-data-bail' }); return }

  let payload
  try {
    payload = event.data.json()
    debugLog({ step: 'parsed-json', payload })
  } catch (e) {
    debugLog({ step: 'json-parse-failed', error: String(e), text: (() => { try { return event.data.text() } catch { return null } })() })
    payload = { title: 'Flashttoo', body: 'Novedades' }
  }

  const title = payload.title || 'Flashttoo'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-desktop-512.png',
    badge: '/icon-desktop-512.png',
    data: { url: payload.url || '/' },
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => debugLog({ step: 'shown-ok' }))
      .catch(err => debugLog({ step: 'shownotification-failed', error: String(err) }))
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) { client.navigate(url); return client.focus() }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
