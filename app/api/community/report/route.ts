import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.post_id) return NextResponse.json({ error: 'post_id requerido' }, { status: 400 })

  const { post_id, reporter_id } = body

  // Evitar reporte duplicado del mismo usuario
  if (reporter_id) {
    const { data: existing } = await sb()
      .from('community_reports')
      .select('id')
      .eq('post_id', post_id)
      .eq('reporter_id', reporter_id)
      .limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, duplicate: true })
    }
    try { await sb().from('community_reports').insert({ post_id, reporter_id }) } catch { /* ignorar */ }
  }

  // Incrementar contador
  const { data: post } = await sb()
    .from('community_posts')
    .select('report_count')
    .eq('id', post_id)
    .single()

  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

  const newCount = (post.report_count ?? 0) + 1
  await sb().from('community_posts').update({ report_count: newCount }).eq('id', post_id)

  return NextResponse.json({ ok: true, report_count: newCount })
}
