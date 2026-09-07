import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile } from '@/lib/storage'

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const artist_id = searchParams.get('artist_id') ?? ''
  const access_token = searchParams.get('access_token') ?? ''
  if (!await verifyArtist(access_token, artist_id)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const [designsRes, artistRes] = await Promise.all([
    sb().from('flash_designs').select('id, photo_url, medidas, position, labels').eq('artist_id', artist_id).order('position'),
    sb().from('artists').select('flashbook_alias, flashbook_whatsapp, availability, slug').eq('id', artist_id).single(),
  ])
  return NextResponse.json({
    designs: designsRes.data ?? [],
    flashbook_alias: artistRes.data?.flashbook_alias ?? null,
    flashbook_whatsapp: artistRes.data?.flashbook_whatsapp ?? null,
    availability: artistRes.data?.availability ?? [],
    slug: artistRes.data?.slug ?? null,
  })
}

export async function POST(req: NextRequest) {
  const fd = await req.formData()
  const file = fd.get('file') as File | null
  const artist_id = fd.get('artist_id') as string | null
  const access_token = fd.get('access_token') as string | null
  const medidas = fd.get('medidas') as string | null

  if (!file || !artist_id || !access_token) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }
  if (!await verifyArtist(access_token, artist_id)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { count } = await sb()
    .from('flash_designs')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', artist_id)
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Límite de 10 diseños alcanzado' }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `flash/${artist_id}/${Date.now()}.${ext}`
  const photo_url = await uploadFile(file, path)

  const { data: last } = await sb()
    .from('flash_designs')
    .select('position')
    .eq('artist_id', artist_id)
    .order('position', { ascending: false })
    .limit(1)
    .single()
  const position = (last?.position ?? -1) + 1

  const { data: design, error } = await sb()
    .from('flash_designs')
    .insert({ artist_id, photo_url, medidas: medidas || null, position })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ design })
}
