import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ alias: string }> }) {
  const { alias } = await params

  const { data: artist } = await sb()
    .from('artists')
    .select('id, name, photo_url, city, country, flashbook_alias, flashbook_whatsapp, gallery_photo_1, gallery_photo_2, gallery_photo_3')
    .eq('flashbook_alias', alias)
    .single()

  if (!artist) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { data: designs } = await sb()
    .from('flash_designs')
    .select('id, photo_url, medidas, position, labels')
    .eq('artist_id', artist.id)
    .order('position')

  return NextResponse.json({ artist, designs: designs ?? [] })
}
