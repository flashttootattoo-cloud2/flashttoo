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
      // El badge SIEMPRE lo muestra Android en blanco/monocromático (regla
      // del sistema, no depende de nuestros colores) y necesita que la
      // imagen sea transparente para poder recortar una silueta — con una
      // imagen sin transparencia (como el favicon) queda un bloque sólido
      // en vez de una forma reconocible.
      badge: '/icon-desktop-512.png',
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
