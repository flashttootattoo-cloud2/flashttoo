import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { type } = await req.json()
  const col = type === 'instagram' ? 'instagram_clicks' : type === 'whatsapp' ? 'whatsapp_clicks' : type === 'website' ? 'website_clicks' : type === 'profile_view' ? 'profile_views' : null
  if (!col) return NextResponse.json({ ok: true })
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('studios').select('id, profile_views, instagram_clicks, whatsapp_clicks, website_clicks').eq('slug', slug).single()
  if (data) {
    const cur = (data as Record<string, number>)[col] || 0
    await sb.from('studios').update({ [col]: cur + 1 }).eq('id', data.id)
  }
  return NextResponse.json({ ok: true })
}
