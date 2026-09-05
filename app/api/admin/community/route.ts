import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [adminPosts, reportedPosts] = await Promise.all([
    sb().from('community_posts').select('*').eq('type', 'admin').order('created_at', { ascending: false }),
    sb().from('community_posts').select('*').gte('report_count', 1).neq('type', 'admin').order('report_count', { ascending: false }),
  ])

  return NextResponse.json({
    adminPosts: adminPosts.data ?? [],
    reportedPosts: reportedPosts.data ?? [],
  })
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const { error } = await sb().from('community_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.content?.trim()) return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 })

  const lang = typeof body.lang === 'string' && body.lang ? body.lang : 'es'
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await sb()
    .from('community_posts')
    .insert({
      type: 'admin',
      content: String(body.content).trim().slice(0, 300),
      lang,
      expires_at: expires,
      report_count: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}
