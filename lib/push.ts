import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

let configured = false
function ensureConfigured() {
  if (configured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:info@flashttoo.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  configured = true
}

type PushSub = { id: string; endpoint: string; p256dh: string; auth: string }

// Manda el mismo mensaje a una lista de suscripciones — si alguna ya no es
// válida (usuario desinstaló, borró permisos, etc.) la limpia de la base en
// vez de seguir intentando mandarle para siempre.
export async function sendToSubscriptions(subs: PushSub[], payload: { title: string; body: string; url?: string }) {
  ensureConfigured()
  const expiredIds: string[] = []

  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      console.error('[push] error enviando a', sub.endpoint.slice(0, 60), 'status:', statusCode, err)
      if (statusCode === 404 || statusCode === 410) expiredIds.push(sub.id)
    }
  }))

  if (expiredIds.length) {
    await sb().from('push_subscriptions').delete().in('id', expiredIds)
  }
}

// country puede venir vacío (sin país = para todos) o con varios separados
// por coma (mismo formato que ya usan sponsors/admin en el resto de la app)
export async function sendToSegment(
  opts: { country?: string | null; lang: string },
  payload: { title: string; body: string; url?: string },
) {
  const { data, error } = await sb().from('push_subscriptions').select('id, endpoint, p256dh, auth, country').eq('lang', opts.lang)
  if (error) console.error('[push] error consultando suscripciones', error)
  const targets = opts.country ? opts.country.split(',').map(c => c.trim().toLowerCase()).filter(Boolean) : []

  const matches = (data ?? []).filter(s => {
    if (targets.length === 0) return true
    if (!s.country) return false
    return targets.includes((s.country as string).toLowerCase())
  })

  console.log('[push] sendToSegment', { lang: opts.lang, country: opts.country, totalConLangMatch: data?.length ?? 0, matches: matches.length })

  if (matches.length) await sendToSubscriptions(matches, payload)
  return matches.length
}
