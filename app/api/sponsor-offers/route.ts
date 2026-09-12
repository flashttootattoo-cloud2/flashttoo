import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAX_OFFERS = 10
const MAX_ITEMS = 6

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function verifySponsor(access_token: string): Promise<{ id: string; user_id: string } | null> {
  const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error } = await sbAnon.auth.getUser(access_token)
  if (error || !user) return null
  const { data: sponsor } = await sb().from('sponsors_v2').select('id, user_id').eq('user_id', user.id).single()
  if (!sponsor || sponsor.user_id !== user.id) return null
  return sponsor
}

export async function GET(req: NextRequest) {
  const access_token = req.nextUrl.searchParams.get('access_token') || ''
  const sponsor = await verifySponsor(access_token)
  if (!sponsor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: offers } = await sb().from('sponsor_offers')
    .select('id, title, whatsapp, items, created_at')
    .eq('sponsor_id', sponsor.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ offers: offers ?? [] })
}

export async function POST(req: NextRequest) {
  const { access_token, title, whatsapp, items } = await req.json()
  const sponsor = await verifySponsor(access_token || '')
  if (!sponsor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const cleanTitle = String(title ?? '').trim().slice(0, 60)
  if (!cleanTitle) return NextResponse.json({ error: 'Ponele un nombre a la oferta' }, { status: 400 })

  const cleanWhatsapp = String(whatsapp ?? '').trim()
  if (!cleanWhatsapp) return NextResponse.json({ error: 'Ingresá el WhatsApp que va a recibir estos pedidos' }, { status: 400 })

  const cleanItems = Array.isArray(items)
    ? items.slice(0, MAX_ITEMS)
        .map((it: { name?: unknown; price?: unknown }) => ({ name: String(it?.name ?? '').trim().slice(0, 60), price: Number(it?.price) }))
        .filter((it: { name: string; price: number }) => it.name && Number.isFinite(it.price) && it.price > 0)
    : []
  if (cleanItems.length === 0) return NextResponse.json({ error: 'Agregá al menos un ítem con precio' }, { status: 400 })

  const { count } = await sb().from('sponsor_offers').select('id', { count: 'exact', head: true }).eq('sponsor_id', sponsor.id)
  if ((count ?? 0) >= MAX_OFFERS) return NextResponse.json({ error: `Máximo ${MAX_OFFERS} ofertas guardadas — borrá alguna para crear otra` }, { status: 400 })

  const { data: offer, error } = await sb().from('sponsor_offers').insert({ sponsor_id: sponsor.id, title: cleanTitle, whatsapp: cleanWhatsapp, items: cleanItems }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ offer })
}
