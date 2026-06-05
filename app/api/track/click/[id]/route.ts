import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { type } = await req.json() as { type: 'instagram' | 'whatsapp' | 'ad' | 'like' | 'unlike' }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  if (type === 'ad') {
    await sb.rpc('increment_ad_clicks', { ad_id: id })
  } else if (type === 'instagram') {
    await sb.rpc('increment_artist_ig', { artist_id: id })
  } else if (type === 'whatsapp') {
    await sb.rpc('increment_artist_wa', { artist_id: id })
  } else if (type === 'like' || type === 'unlike') {
    const { data, error: selErr } = await sb.from('artists').select('likes').eq('id', id).single()
    if (selErr) console.error('likes select error:', selErr.message)
    const current = data?.likes ?? 0
    const next = type === 'like' ? current + 1 : Math.max(0, current - 1)
    const { error: updErr } = await sb.from('artists').update({ likes: next }).eq('id', id)
    if (updErr) console.error('likes update error:', updErr.message)
  }

  return NextResponse.json({ ok: true })
}
