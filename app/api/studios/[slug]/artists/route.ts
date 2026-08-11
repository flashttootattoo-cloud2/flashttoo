import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function authorizeStudio(slug: string, edit_key?: string, access_token?: string) {
  const { data: studio } = await sb().from('studios').select('id, edit_key, user_id').eq('slug', slug).single()
  if (!studio) return null
  if (access_token && studio.user_id) {
    const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await sbAnon.auth.getUser(access_token)
    if (user?.id === studio.user_id) return studio
  }
  if (edit_key && edit_key === studio.edit_key) return studio
  return null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { edit_key, access_token, instagram } = await req.json()
  const studio = await authorizeStudio(slug, edit_key, access_token)
  if (!studio) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const handle = instagram.trim().replace(/^@/, '')
  const { data: artist } = await sb().from('artists')
    .select('id, name, photo_url, city, instagram')
    .or(`instagram.ilike.${handle},instagram.ilike.@${handle}`)
    .eq('visible', true)
    .limit(1)
    .single()

  if (!artist) return NextResponse.json({ error: 'artist_not_found', handle }, { status: 404 })

  const { error } = await sb().from('studio_artists').insert({ studio_id: studio.id, artist_id: artist.id })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Este artista ya está en el estudio' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ artist })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { edit_key, access_token, artist_id } = await req.json()
  const studio = await authorizeStudio(slug, edit_key, access_token)
  if (!studio) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await sb().from('studio_artists').delete().eq('studio_id', studio.id).eq('artist_id', artist_id)
  return NextResponse.json({ ok: true })
}
