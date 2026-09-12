import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function sbAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
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
  const type = body.type === 'artist' ? 'artist' : body.type === 'studio' ? 'studio' : body.type === 'sponsor' ? 'sponsor' : 'client'

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
    if (!body.studio_slug || !body.access_token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: studio } = await sb().from('studios').select('id, user_id, name, logo_url, slug, visible, expires_at').eq('slug', body.studio_slug).single()
    if (!studio) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: { user } } = await sbAnon().auth.getUser(body.access_token)
    if (!user || user.id !== studio.user_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const blocked = studio.visible === false || (studio.expires_at && new Date(studio.expires_at) < new Date())
    if (blocked) return NextResponse.json({ error: 'Tu perfil está bloqueado, no podés publicar' }, { status: 403 })
    insert.studio_id   = studio.slug
    insert.studio_name = studio.name
    insert.studio_logo = studio.logo_url
    insert.studio_slug = studio.slug
  } else if (type === 'sponsor') {
    if (!body.sponsor_slug || !body.access_token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: sponsor } = await sb().from('sponsors_v2').select('id, user_id, name, logo_url, slug, description, country, active, expires_at').eq('slug', body.sponsor_slug).single()
    if (!sponsor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: { user } } = await sbAnon().auth.getUser(body.access_token)
    if (!user || user.id !== sponsor.user_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const blocked = !sponsor.active || (sponsor.expires_at && new Date(sponsor.expires_at) < new Date())
    if (blocked) return NextResponse.json({ error: 'Tu perfil está bloqueado, no podés publicar' }, { status: 403 })
    insert.sponsor_id   = sponsor.id
    insert.sponsor_name = sponsor.name
    insert.sponsor_logo = sponsor.logo_url
    insert.sponsor_slug = sponsor.slug
    insert.sponsor_description = sponsor.description
    // País(es) de venta de la marca — ya vienen separados por coma desde su perfil,
    // se usan tal cual para la cercanía, sin que la marca los tipee en cada mensaje
    insert.country = sponsor.country || null
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
