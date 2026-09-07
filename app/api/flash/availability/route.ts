import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET ?artist_id=xxx  — private (solo disponibilidad)
// GET ?slug=xxx       — public (artista + disponibilidad)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug') ?? ''
  const artist_id = url.searchParams.get('artist_id') ?? ''

  // caso interno: solo necesitamos los slots
  if (artist_id) {
    const { data: avail } = await sb()
      .from('artist_availability')
      .select('slots')
      .eq('artist_id', artist_id)
      .single()
    const res = NextResponse.json({ artist: { id: artist_id, availability: avail?.slots ?? [] } })
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  // caso público por slug: necesitamos info del artista
  if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 })

  // formato "turnoslibresynombre-[uuid]" — no depende del flashbook_alias
  const uuidRx = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
  const idMatch = slug.startsWith('turnoslibresy') ? slug.match(uuidRx) : null
  const lookupId = idMatch ? idMatch[1] : null

  const { data: artist } = await sb()
    .from('artists')
    .select('id, name, photo_url, flashbook_alias')
    .eq(lookupId ? 'id' : 'flashbook_alias', lookupId ?? slug)
    .single()
  if (!artist) return NextResponse.json({ error: 'Artista no encontrado' }, { status: 404 })

  const { data: avail } = await sb()
    .from('artist_availability')
    .select('slots')
    .eq('artist_id', artist.id)
    .single()

  const res = NextResponse.json({ artist: { ...artist, availability: avail?.slots ?? [] } })
  res.headers.set('Cache-Control', 'no-store')
  return res
}

// PATCH — authenticated save
export async function PATCH(req: NextRequest) {
  const { access_token, artist_id, slots } = await req.json()

  const { data: artist } = await sb().from('artists').select('user_id').eq('id', artist_id).single()
  if (!artist) return NextResponse.json({ error: 'Artista no encontrado' }, { status: 404 })

  const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error: authErr } = await sbAnon.auth.getUser(access_token)
  if (authErr || !user || user.id !== artist.user_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: saved, error } = await sb()
    .from('artist_availability')
    .upsert({ artist_id, slots: slots ?? [], updated_at: new Date().toISOString() })
    .select('slots')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, availability: saved?.slots ?? [] })
}
