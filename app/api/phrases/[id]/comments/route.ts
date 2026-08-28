import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: comments } = await sb()
    .from('phrase_comments')
    .select('id, phrase_id, artist_id, studio_id, guest_name, guest_emoji, content, created_at, parent_id')
    .eq('phrase_id', id)
    .order('created_at', { ascending: false })
    .limit(200)

  const artistIds = (comments || []).filter(c => c.artist_id).map(c => c.artist_id as string)
  const artistMap: Record<string, { name: string; photo_url: string | null; instagram: string | null }> = {}
  if (artistIds.length > 0) {
    const { data: artists } = await sb().from('artists').select('id, name, photo_url, instagram').in('id', artistIds)
    ;(artists || []).forEach((a: { id: string; name: string; photo_url: string | null; instagram: string | null }) => {
      artistMap[a.id] = { name: a.name, photo_url: a.photo_url, instagram: a.instagram }
    })
  }

  const studioIds = (comments || []).filter(c => c.studio_id).map(c => c.studio_id as string)
  const studioMap: Record<string, { name: string; slug: string; logo_url: string | null }> = {}
  if (studioIds.length > 0) {
    const { data: studios } = await sb().from('studios').select('id, name, slug, logo_url').in('id', studioIds)
    ;(studios || []).forEach((s: { id: string; name: string; slug: string; logo_url: string | null }) => {
      studioMap[s.id] = { name: s.name, slug: s.slug, logo_url: s.logo_url }
    })
  }

  const enriched = (comments || []).map(c => ({
    ...c,
    artist_name:      c.artist_id ? (artistMap[c.artist_id]?.name      ?? null) : null,
    artist_photo_url: c.artist_id ? (artistMap[c.artist_id]?.photo_url ?? null) : null,
    artist_slug:      c.artist_id ? (artistMap[c.artist_id]?.instagram?.replace('@', '') ?? c.artist_id) : null,
    studio_name:      c.studio_id ? (studioMap[c.studio_id]?.name     ?? null) : null,
    studio_slug:      c.studio_id ? (studioMap[c.studio_id]?.slug     ?? null) : null,
    studio_logo_url:  c.studio_id ? (studioMap[c.studio_id]?.logo_url ?? null) : null,
    parent_id:        c.parent_id ?? null,
  }))

  return NextResponse.json({ comments: enriched })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { content, access_token, guest_name, guest_emoji, parent_id } = body

  if (!content?.trim()) return NextResponse.json({ error: 'Comentario vacío' }, { status: 400 })

  let artist_id: string | null = null
  let studio_id: string | null = null

  if (access_token) {
    const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await sbAnon.auth.getUser(access_token)
    if (user) {
      const { data: artist } = await sb().from('artists').select('id').eq('user_id', user.id).single()
      if (artist) {
        artist_id = artist.id
      } else {
        const { data: studio } = await sb().from('studios').select('id, visible').eq('user_id', user.id).single()
        if (studio) {
          if (!studio.visible) return NextResponse.json({ error: 'Tu perfil está en revisión. Podés comentar cuando esté activo.' }, { status: 403 })
          studio_id = studio.id
        }
      }
    }
  }

  if (access_token && !artist_id && !studio_id) {
    return NextResponse.json({ error: 'Sesión expirada. Volvé a iniciar sesión.' }, { status: 401 })
  }

  const isIdentified = !!(artist_id || studio_id)
  if (!isIdentified && !guest_name?.trim()) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  }

  const { data: comment, error } = await sb()
    .from('phrase_comments')
    .insert({
      phrase_id:   id,
      artist_id,
      studio_id,
      guest_name:  isIdentified ? null : (guest_name as string).trim(),
      guest_emoji: isIdentified ? null : (guest_emoji || '😊'),
      content:     (content as string).trim(),
      parent_id:   parent_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let artist_name: string | null = null
  let artist_photo_url: string | null = null
  let artist_slug: string | null = null
  let studio_name: string | null = null
  let studio_slug: string | null = null

  if (artist_id) {
    const { data: a } = await sb().from('artists').select('name, photo_url, instagram').eq('id', artist_id).single()
    if (a) {
      artist_name = a.name
      artist_photo_url = a.photo_url
      artist_slug = a.instagram ? a.instagram.replace('@', '') : artist_id
    }
  }

  let studio_logo_url: string | null = null
  if (studio_id) {
    const { data: s } = await sb().from('studios').select('name, slug, logo_url').eq('id', studio_id).single()
    if (s) { studio_name = s.name; studio_slug = s.slug; studio_logo_url = s.logo_url ?? null }
  }

  return NextResponse.json({ comment: { ...comment, artist_name, artist_photo_url, artist_slug, studio_name, studio_slug, studio_logo_url, parent_id: parent_id || null } })
}
