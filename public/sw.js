// Service worker mínimo, solo para recibir y mostrar push notifications.
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()) })

function debugLog(info) {
  return fetch('/api/push/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(info),
  }).catch(() => {})
}

// Todo el trabajo (logs incluidos) tiene que quedar dentro de un solo
// waitUntil — si el log queda afuera, el navegador puede matar el service
// worker antes de que el fetch del log llegue a salir (pasa mucho más
// seguido en celular, que corta procesos en segundo plano más agresivo
// que una PC para ahorrar batería).
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    await debugLog({ step: 'push-received', hasData: !!event.data })

    if (!event.data) { await debugLog({ step: 'no-data-bail' }); return }

    let payload
    try {
      payload = event.data.json()
      await debugLog({ step: 'parsed-json', payload })
    } catch (e) {
      let text = null
      try { text = event.data.text() } catch {}
      await debugLog({ step: 'json-parse-failed', error: String(e), text })
      payload = { title: 'Flashttoo', body: 'Novedades' }
    }

    const title = payload.title || 'Flashttoo'
    const options = {
      body: payload.body || '',
      icon: payload.icon || '/icon-desktop-512.png',
      // El badge (ícono chico de la barra de notificaciones) se ve mejor con
      // un fondo propio (como hace Instagram con su degradado) en vez de uno
      // transparente — Android le pone un círculo blanco atrás si no tiene
      // color de fondo, y con los 7 puntos separados quedaba como una mancha
      badge: '/favicon-32.png',
      vibrate: [200, 100, 200],
      data: { url: payload.url || '/' },
    }

    try {
      await self.registration.showNotification(title, options)
      await debugLog({ step: 'shown-ok' })
    } catch (err) {
      await debugLog({ step: 'shownotification-failed', error: String(err) })
    }
  })())
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
