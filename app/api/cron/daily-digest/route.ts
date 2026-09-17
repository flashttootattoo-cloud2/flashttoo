import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendToSubscriptions } from '@/lib/push'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const DIGEST_TEXT: Record<string, { title: string; body: string }> = {
  es: { title: 'Flashttoo', body: 'Hay mensajes de tatuadores y estudios de tu país' },
  en: { title: 'Flashttoo', body: 'There are new posts from tattoo artists and studios in your country' },
  pt: { title: 'Flashttoo', body: 'Há novas mensagens de tatuadores e estúdios do seu país' },
}

// Resumen diario para suscriptos anónimos (sin login) — agrupado por país
// para no mandar una notificación por cada post individual. Solo se manda
// si hubo actividad real de tatuadores/estudios en las últimas 24hs en ese
// país; si no hubo nada, no se manda nada.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: activeCountries } = await sb()
    .from('community_posts')
    .select('country')
    .in('type', ['artist', 'studio'])
    .not('country', 'is', null)
    .gte('created_at', since)

  const countriesWithActivity = new Set((activeCountries ?? []).map(p => (p.country as string).toLowerCase()))
  if (countriesWithActivity.size === 0) return NextResponse.json({ sent: 0, countries: 0 })

  const { data: subs } = await sb().from('push_subscriptions').select('id, endpoint, p256dh, auth, country, lang').not('country', 'is', null)
  const bySegment = new Map<string, { id: string; endpoint: string; p256dh: string; auth: string }[]>()

  for (const s of subs ?? []) {
    const country = (s.country as string).toLowerCase()
    if (!countriesWithActivity.has(country)) continue
    const lang = (s.lang as string) || 'es'
    const key = `${country}|${lang}`
    if (!bySegment.has(key)) bySegment.set(key, [])
    bySegment.get(key)!.push({ id: s.id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })
  }

  let sent = 0
  for (const [key, segmentSubs] of bySegment) {
    const lang = key.split('|')[1]
    const text = DIGEST_TEXT[lang] || DIGEST_TEXT.es
    await sendToSubscriptions(segmentSubs, { ...text, url: '/?comunidad=1' })
    sent += segmentSubs.length
  }

  return NextResponse.json({ sent, countries: bySegment.size })
}
