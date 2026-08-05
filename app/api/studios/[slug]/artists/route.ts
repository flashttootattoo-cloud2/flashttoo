import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getStudio(slug: string) {
  const { data } = await sb().from('studios').select('id, edit_key').eq('slug', slug).single()
  return data
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { edit_key, instagram } = await req.json()
  const studio = await getStudio(slug)
  if (!studio) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (edit_key !== studio.edit_key) return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })

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
  const { edit_key, artist_id } = await req.json()
  const studio = await getStudio(slug)
  if (!studio) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (edit_key !== studio.edit_key) return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })

  await sb().from('studio_artists').delete().eq('studio_id', studio.id).eq('artist_id', artist_id)
  return NextResponse.json({ ok: true })
}
