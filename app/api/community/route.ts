import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function sbAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

const PAGE = 30

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lang    = searchParams.get('lang') || 'es'
  const offset  = parseInt(searchParams.get('offset') || '0', 10)
  // Sin comas/paréntesis/comodines: va directo a un ILIKE, no puede traer sintaxis rara
  const country = (searchParams.get('country') || '').trim().replace(/[,()%_]/g, '')
  const now = new Date().toISOString()

  const { data: tickerSetting } = await sb().from('settings').select('value').eq('key', 'search_ticker_mode').single()
  const hideSearchPosts = tickerSetting?.value === true

  const baseRows = () => {
    let q = sb().from('community_posts').select('*').gt('expires_at', now).lt('report_count', 3).eq('lang', lang)
    // Con esto activo, las búsquedas sin texto (search_description null) no
    // aparecen en el feed público — siguen guardadas y visibles en el admin
    if (hideSearchPosts) q = q.or('type.neq.search,search_description.not.is.null')
    return q
  }
  const baseCount = () => {
    let q = sb().from('community_posts').select('id', { count: 'exact', head: true }).gt('expires_at', now).lt('report_count', 3).eq('lang', lang)
    if (hideSearchPosts) q = q.or('type.neq.search,search_description.not.is.null')
    return q
  }

  let posts: Record<string, unknown>[] = []

  if (country) {
    // Los posts cuyo país coincide con el del que está mirando van primero
    // (aunque sean más viejos que otros), así no quedan enterrados en la
    // segunda página cuando hay mucho volumen de otros países. Los avisos de
    // Flashttoo (admin/news) sin país cargado son de alcance global — cuentan
    // como "coincidencia" para cualquiera y se ubican por fecha junto al resto,
    // en vez de quedar relegados detrás de todas las coincidencias de país.
    const pattern = `%${country}%`
    const matchFilter = `country.ilike.${pattern},and(country.is.null,type.in.(admin,news))`
    const restFilter = `and(country.not.is.null,country.not.ilike.${pattern}),and(country.is.null,type.not.in.(admin,news))`

    const { count: matchTotal } = await baseCount().or(matchFilter)
    const total = matchTotal ?? 0

    if (offset < total) {
      const { data: matchData } = await baseRows()
        .or(matchFilter)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE - 1)
      posts = matchData ?? []
      if (posts.length < PAGE) {
        const { data: restData } = await baseRows()
          .or(restFilter)
          .order('created_at', { ascending: false })
          .range(0, PAGE - posts.length - 1)
        posts = posts.concat(restData ?? [])
      }
    } else {
      const restOffset = offset - total
      const { data: restData } = await baseRows()
        .or(restFilter)
        .order('created_at', { ascending: false })
        .range(restOffset, restOffset + PAGE - 1)
      posts = restData ?? []
    }
  } else {
    const { data } = await baseRows()
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)
    posts = data ?? []
  }

  // Limpieza de vencidos sin depender de un cron externo: expires_at solo se
  // usaba como filtro de qué se muestra, nunca borraba nada de verdad y las
  // filas se acumulaban en la base para siempre. Se dispara con poca
  // probabilidad (no en cada request) aprovechando que este endpoint ya se
  // llama todo el tiempo — se espera (await) porque en serverless el código
  // después de responder no tiene garantía de terminar de ejecutarse.
  if (Math.random() < 0.02) {
    const { data: expired } = await sb().from('community_posts').delete().lt('expires_at', now).select('photo_url')
    const photoUrls = (expired ?? []).map(p => p.photo_url).filter((u): u is string => !!u)
    await Promise.all(photoUrls.map(url => deleteFile(url).catch(() => {})))
  }

  // Menciones @usuario en avisos de Flashttoo: si el usuario de Instagram
  // coincide con un tatuador visible de la app, el post lleva su id para que el
  // feed pueda abrir su perfil adentro de Flashttoo. Si no coincide, queda texto.
  const mentionRe = /@([A-Za-z0-9._]{1,29}[A-Za-z0-9_])/g
  const isOfficial = (p: Record<string, unknown>) => p.type === 'admin' || p.type === 'news'
  const wanted = new Set<string>()
  for (const p of posts) {
    if (!isOfficial(p)) continue
    for (const m of String(p.content ?? '').matchAll(mentionRe)) wanted.add(m[1].toLowerCase())
  }
  const found: Record<string, { id: string; name: string }> = {}
  if (wanted.size > 0) {
    const handles = [...wanted]
    // "_" es comodín en ilike, así que la búsqueda puede traer de más: se afina abajo con comparación exacta
    const { data: artists } = await sb().from('artists').select('id, name, instagram, visible, status')
      .or(handles.map(h => `instagram.ilike.${h},instagram.ilike.@${h}`).join(','))
    for (const a of artists ?? []) {
      if (a.visible === false || a.status === 'pending') continue
      const key = String(a.instagram ?? '').trim().replace(/^@/, '').toLowerCase()
      if (wanted.has(key)) found[key] = { id: a.id, name: a.name }
    }
  }
  if (Object.keys(found).length > 0) {
    posts = posts.map(p => {
      if (!isOfficial(p)) return p
      const mentions: Record<string, { id: string; name: string }> = {}
      for (const m of String(p.content ?? '').matchAll(mentionRe)) {
        const k = m[1].toLowerCase()
        if (found[k]) mentions[k] = found[k]
      }
      return Object.keys(mentions).length > 0 ? { ...p, mentions } : p
    })
  }

  return NextResponse.json({ posts, hasMore: posts.length === PAGE })
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

    const { data: limitSetting } = await sb().from('settings').select('value').eq('key', 'artist_daily_post_limit').single()
    const dailyLimit = parseInt(String(limitSetting?.value ?? '0'), 10)
    if (Number.isFinite(dailyLimit) && dailyLimit > 0) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await sb().from('community_posts').select('id', { count: 'exact', head: true })
        .eq('type', 'artist').eq('artist_id', body.artist_id).gte('created_at', since)
      if ((count ?? 0) >= dailyLimit) {
        return NextResponse.json({ error: `Alcanzaste el límite de ${dailyLimit} mensajes por día` }, { status: 429 })
      }
    }

    insert.artist_id      = body.artist_id
    insert.artist_name    = body.artist_name || null
    insert.artist_photo   = body.artist_photo || null
    insert.artist_slug    = body.artist_slug || null
    insert.show_flashbook  = body.show_flashbook === true ? true : null
    insert.flashbook_alias = body.show_flashbook === true ? (body.flashbook_alias || null) : null
    insert.show_availability = body.show_availability === true ? true : null
    insert.photo_url = typeof body.photo_url === 'string' && body.photo_url.trim() ? body.photo_url.trim() : null
  } else if (type === 'studio') {
    if (!body.studio_slug || !body.access_token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: studio } = await sb().from('studios').select('id, user_id, name, logo_url, slug, visible, expires_at').eq('slug', body.studio_slug).single()
    if (!studio) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: { user } } = await sbAnon().auth.getUser(body.access_token)
    if (!user || user.id !== studio.user_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const blocked = studio.visible === false || (studio.expires_at && new Date(studio.expires_at) < new Date())
    if (blocked) return NextResponse.json({ error: 'Tu perfil está bloqueado, no podés publicar' }, { status: 403 })

    const { data: studioLimitSetting } = await sb().from('settings').select('value').eq('key', 'studio_daily_post_limit').single()
    const studioDailyLimit = parseInt(String(studioLimitSetting?.value ?? '0'), 10)
    if (Number.isFinite(studioDailyLimit) && studioDailyLimit > 0) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await sb().from('community_posts').select('id', { count: 'exact', head: true })
        .eq('type', 'studio').eq('studio_slug', studio.slug).gte('created_at', since)
      if ((count ?? 0) >= studioDailyLimit) {
        return NextResponse.json({ error: `Alcanzaste el límite de ${studioDailyLimit} mensajes por día` }, { status: 429 })
      }
    }

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
