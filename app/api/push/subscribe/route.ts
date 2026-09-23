import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Para poder mostrar el país/idioma real guardado cuando se recarga la
// página (en vez de adivinar a partir de lo que haya quedado en el buscador)
export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get('endpoint')
  if (!endpoint) return NextResponse.json({ error: 'endpoint requerido' }, { status: 400 })
  const { data } = await sb().from('push_subscriptions').select('country, city, lang').eq('endpoint', endpoint).single()
  return NextResponse.json({ country: data?.country ?? null, city: data?.city ?? null, lang: data?.lang ?? null })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const sub = body?.subscription
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
  }

  const { error } = await sb().from('push_subscriptions').upsert({
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    country: typeof body.country === 'string' && body.country.trim() ? body.country.trim() : null,
    city: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : null,
    lang: typeof body.lang === 'string' && body.lang.trim() ? body.lang.trim() : null,
  }, { onConflict: 'endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
