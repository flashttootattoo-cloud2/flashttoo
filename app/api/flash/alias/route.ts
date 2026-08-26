import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function PATCH(req: NextRequest) {
  const { access_token, artist_id, alias, flashbook_whatsapp } = await req.json()

  const { data: artist } = await sb().from('artists').select('user_id').eq('id', artist_id).single()
  if (!artist) return NextResponse.json({ error: 'Artista no encontrado' }, { status: 404 })

  const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error: authErr } = await sbAnon.auth.getUser(access_token)
  if (authErr || !user || user.id !== artist.user_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const updates: Record<string, string | null> = {}

  if (alias !== undefined) {
    const raw = String(alias ?? '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
    if (!raw) return NextResponse.json({ error: 'Alias inválido' }, { status: 400 })
    const { data: taken } = await sb().from('artists').select('id').eq('flashbook_alias', raw).single()
    if (taken && taken.id !== artist_id) {
      return NextResponse.json({ error: 'Ese alias ya está en uso' }, { status: 409 })
    }
    updates.flashbook_alias = raw
  }

  if (flashbook_whatsapp !== undefined) {
    updates.flashbook_whatsapp = flashbook_whatsapp ? String(flashbook_whatsapp).replace(/\D/g, '') : null
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  const { error } = await sb().from('artists').update(updates).eq('id', artist_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ alias: updates.flashbook_alias, flashbook_whatsapp: updates.flashbook_whatsapp })
}

export async function GET(req: NextRequest) {
  const alias = new URL(req.url).searchParams.get('check') ?? ''
  const artist_id = new URL(req.url).searchParams.get('artist_id') ?? ''
  const raw = alias.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
  if (!raw) return NextResponse.json({ available: false })
  const { data } = await sb().from('artists').select('id').eq('flashbook_alias', raw).single()
  return NextResponse.json({ available: !data || data.id === artist_id })
}
