import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function verifyArtist(access_token: string, artist_id: string): Promise<boolean> {
  const { data: artist } = await sb().from('artists').select('user_id').eq('id', artist_id).single()
  if (!artist) return false
  const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error } = await sbAnon.auth.getUser(access_token)
  return !error && !!user && user.id === artist.user_id
}

async function fetchArtists(ids: string[]): Promise<{ id: string; name: string; photo_url: string | null }[]> {
  const { data, error } = await sb().from('artists').select('id, name, photo_url').in('id', ids)
  if (error) return []
  return data ?? []
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: post } = await sb().from('community_posts').select('helper_ids').eq('id', id).single()
  const ids: string[] = post?.helper_ids ?? []
  if (!ids.length) return NextResponse.json({ helpers: [] })
  const helpers = await fetchArtists(ids)
  return NextResponse.json({ helpers })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const artist_id = typeof body?.artist_id === 'string' ? body.artist_id : ''
  const access_token = typeof body?.access_token === 'string' ? body.access_token : ''
  const action = body?.action

  if (!artist_id || !access_token || (action !== 'add' && action !== 'remove')) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  if (!await verifyArtist(access_token, artist_id)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: post } = await sb().from('community_posts').select('country, type, helper_ids').eq('id', id).single()
  if (!post || (post.type !== 'search' && post.type !== 'client')) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (action === 'add') {
    const { data: artist } = await sb().from('artists').select('country').eq('id', artist_id).single()
    const artistCountry = artist?.country?.trim().toLowerCase()
    const postCountry = post.country?.trim().toLowerCase()
    if (!artistCountry || !postCountry || artistCountry !== postCountry) {
      return NextResponse.json({ error: 'Solo tatuadores del mismo país pueden responder' }, { status: 403 })
    }
  }

  const current: string[] = post.helper_ids ?? []
  const next = action === 'add'
    ? (current.includes(artist_id) ? current : [...current, artist_id])
    : current.filter(x => x !== artist_id)

  // .select().single() confirma que la fila realmente se actualizó — sin esto,
  // un update que no matchea ninguna fila no da error y la respuesta queda
  // armada con el array local, mostrando éxito aunque no se guardó nada.
  const { data: updated, error } = await sb()
    .from('community_posts')
    .update({ helper_ids: next })
    .eq('id', id)
    .select('helper_ids')
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'No se pudo guardar el cambio' }, { status: 500 })
  }

  const finalIds: string[] = updated.helper_ids ?? []
  if (!finalIds.length) return NextResponse.json({ helpers: [] })
  const helpers = await fetchArtists(finalIds)
  return NextResponse.json({ helpers })
}
