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
  const type = body.type === 'artist' ? 'artist' : body.type === 'studio' ? 'studio' : body.type === 'sponsor' ? 'sponsor' : body.type === 'search' ? 'search' : 'client'

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
    const { data: sponsor } = await sb().from('sponsors_v2').select('id, user_id, name, logo_url, slug, description, country, active, expires_at, daily_post_limit').eq('slug', body.sponsor_slug).single()
    if (!sponsor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: { user } } = await sbAnon().auth.getUser(body.access_token)
    if (!user || user.id !== sponsor.user_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const blocked = !sponsor.active || (sponsor.expires_at && new Date(sponsor.expires_at) < new Date())
    if (blocked) return NextResponse.json({ error: 'Tu perfil está bloqueado, no podés publicar' }, { status: 403 })
    if (sponsor.daily_post_limit != null) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await sb().from('community_posts').select('id', { count: 'exact', head: true }).eq('sponsor_id', sponsor.id).gte('created_at', since)
      if ((count ?? 0) >= sponsor.daily_post_limit) {
        return NextResponse.json({ error: `Alcanzaste el límite de ${sponsor.daily_post_limit} mensajes por día` }, { status: 429 })
      }
    }
    insert.sponsor_id   = sponsor.id
    insert.sponsor_name = sponsor.name
    insert.sponsor_logo = sponsor.logo_url
    insert.sponsor_slug = sponsor.slug
    insert.sponsor_description = sponsor.description
    // País(es) de venta de la marca — ya vienen separados por coma desde su perfil,
    // se usan tal cual para la cercanía, sin que la marca los tipee en cada mensaje
    insert.country = sponsor.country || null

    // Pedido Flash: adjunta una oferta ya guardada por la marca (elegida en el composer)
    if (body.offer_id) {
      const { data: offer } = await sb().from('sponsor_offers').select('sponsor_id, title, whatsapp, items').eq('id', body.offer_id).single()
      if (offer && offer.sponsor_id === sponsor.id && Array.isArray(offer.items) && offer.items.length > 0) {
        insert.offer_title = offer.title
        insert.offer_items = offer.items
        insert.sponsor_whatsapp = offer.whatsapp || null
      }
    }
  } else if (type === 'search') {
    if (!insert.country) return NextResponse.json({ error: 'País requerido' }, { status: 400 })
    const deviceId = typeof body.device_id === 'string' ? body.device_id.trim().slice(0, 80) : null

    const { data: settingsRows } = await sb().from('settings').select('key, value').in('key', ['search_wizard_daily_limit', 'search_wizard_expiry_days'])
    const settingsMap: Record<string, unknown> = {}
    for (const row of settingsRows || []) settingsMap[row.key] = row.value

    if (deviceId) {
      const limit = parseInt(String(settingsMap.search_wizard_daily_limit ?? '15'), 10)
      if (Number.isFinite(limit) && limit > 0) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count } = await sb().from('community_posts').select('id', { count: 'exact', head: true })
          .eq('type', 'search').eq('device_id', deviceId).gte('created_at', since)
        if ((count ?? 0) >= limit) {
          return NextResponse.json({ error: 'Ya alcanzaste el límite de búsquedas de hoy' }, { status: 429 })
        }
      }
    }

    // Vigencia propia, configurable desde el admin (separada de los 7 días del resto de la comunidad)
    const expiryDays = parseInt(String(settingsMap.search_wizard_expiry_days ?? '7'), 10)
    insert.expires_at = new Date(Date.now() + (Number.isFinite(expiryDays) && expiryDays > 0 ? expiryDays : 7) * 24 * 60 * 60 * 1000).toISOString()

    insert.device_id          = deviceId
    insert.search_category    = ['parche', 'pieza'].includes(body.search_category) ? body.search_category : null
    insert.search_size        = ['chico', 'mediano', 'grande'].includes(body.search_size) ? body.search_size : null
    insert.search_style       = body.search_style?.trim().slice(0, 60) || null
    insert.search_description = body.search_description?.trim().slice(0, 300) || null
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
