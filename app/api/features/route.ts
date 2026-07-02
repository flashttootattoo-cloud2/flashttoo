import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('settings').select('key,value').in('key', ['artist_gallery_enabled'])
  const map = Object.fromEntries((data || []).map((r: { key: string; value: unknown }) => [r.key, r.value]))
  return NextResponse.json({ artist_gallery: map.artist_gallery_enabled === true })
}
