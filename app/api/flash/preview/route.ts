import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const artist_id = new URL(req.url).searchParams.get('artist_id') ?? ''
  if (!artist_id) return NextResponse.json({ error: 'Falta artist_id' }, { status: 400 })

  const [designsRes, countRes, artistRes] = await Promise.all([
    sb().from('flash_designs').select('photo_url, position').eq('artist_id', artist_id).order('position').limit(3),
    sb().from('flash_designs').select('id', { count: 'exact', head: true }).eq('artist_id', artist_id),
    sb().from('artists').select('flashbook_whatsapp').eq('id', artist_id).single(),
  ])

  const photos = (designsRes.data ?? []).map(d => d.photo_url)
  const count  = countRes.count ?? 0

  return NextResponse.json({
    count,
    photos,
    whatsapp: artistRes.data?.flashbook_whatsapp ?? null,
  })
}
