import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const PAGE = 30

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lang   = searchParams.get('lang') || 'es'
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const now = new Date().toISOString()
  const { data, error } = await sb()
    .from('community_posts')
    .select('*')
    .gt('expires_at', now)
    .lt('report_count', 3)
    .eq('lang', lang)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE - 1)

  if (error) return NextResponse.json({ posts: [], hasMore: false })
  return NextResponse.json({ posts: data ?? [], hasMore: (data?.length ?? 0) === PAGE })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.content?.trim()) {
    return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 })
  }

  const content = String(body.content).trim().slice(0, 300)
  const type = body.type === 'artist' ? 'artist' : body.type === 'studio' ? 'studio' : 'client'

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const lang = typeof body.lang === 'string' && body.lang ? body.lang : 'es'

  const insert: Record<string, unknown> = {
    type,
    content,
    city: body.city?.trim() || null,
    country: body.country?.trim() || null,
    expires_at: expires,
    lang,
  }

  if (type === 'artist') {
    if (!body.artist_id) return NextResponse.json({ error: 'artist_id requerido' }, { status: 400 })
    insert.artist_id      = body.artist_id
    insert.artist_name    = body.artist_name || null
    insert.artist_photo   = body.artist_photo || null
    insert.artist_slug    = body.artist_slug || null
    insert.show_flashbook  = body.show_flashbook === true ? true : null
    insert.flashbook_alias = body.show_flashbook === true ? (body.flashbook_alias || null) : null
    insert.show_availability = body.show_availability === true ? true : null
  } else if (type === 'studio') {
    insert.studio_id   = body.studio_id || null
    insert.studio_name = body.studio_name || null
    insert.studio_logo = body.studio_logo || null
    insert.studio_slug = body.studio_slug || null
  } else {
    if (!body.client_name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    insert.client_name  = String(body.client_name).trim().slice(0, 60)
    insert.client_emoji = body.client_emoji || '🙂'
    insert.contact_type = ['ig', 'whatsapp', 'email'].includes(body.contact_type) ? body.contact_type : null
    insert.contact      = body.contact?.trim().slice(0, 100) || null
  }

  const { data, error } = await sb().from('community_posts').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}
