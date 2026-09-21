import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('insumos_videos').select('id, video_url, link, sponsor_name, country').eq('active', true).order('created_at', { ascending: false })
  const res = NextResponse.json({ videos: data ?? [] })
  res.headers.set('Cache-Control', 'no-store')
  return res
}
