import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteFile } from '@/lib/storage'
import { sendToSegment } from '@/lib/push'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [adminPosts, reportedPosts, searchPosts, clientPosts] = await Promise.all([
    sb().from('community_posts').select('*').in('type', ['admin', 'news']).order('created_at', { ascending: false }),
    sb().from('community_posts').select('*').gte('report_count', 1).neq('type', 'admin').order('report_count', { ascending: false }),
    sb().from('community_posts').select('*').eq('type', 'search').order('created_at', { ascending: false }),
    sb().from('community_posts').select('*').eq('type', 'client').order('created_at', { ascending: false }).limit(50),
  ])

  return NextResponse.json({
    adminPosts: adminPosts.data ?? [],
    reportedPosts: reportedPosts.data ?? [],
    searchPosts: searchPosts.data ?? [],
    clientPosts: clientPosts.data ?? [],
  })
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const { data: post } = await sb().from('community_posts').select('photo_url').eq('id', id).single()
  const { error } = await sb().from('community_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // No dejar la foto huérfana en R2 cuando se borra el post que la usaba
  if (post?.photo_url) deleteFile(post.photo_url).catch(() => {})
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.content?.trim()) return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 })

  const lang = typeof body.lang === 'string' && body.lang ? body.lang : 'es'

  // Vencimiento: por defecto 7 días como el resto, pero el admin puede fijar
  // una fecha propia (ej. algo puntual como un flash day de este sábado)
  let expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  if (typeof body.expires_at === 'string' && body.expires_at.trim()) {
    const custom = new Date(body.expires_at)
    if (!isNaN(custom.getTime()) && custom.getTime() > Date.now()) expires = custom.toISOString()
  }

  const link = typeof body.link === 'string' && body.link.trim() ? body.link.trim().slice(0, 500) : null
  const country = typeof body.country === 'string' && body.country.trim() ? body.country.trim().slice(0, 200) : null
  const type = body.kind === 'news' ? 'news' : 'admin'

  const { data, error } = await sb()
    .from('community_posts')
    .insert({
      type,
      content: String(body.content).trim().slice(0, 300),
      lang,
      link,
      country,
      expires_at: expires,
      report_count: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificación inmediata (opcional) — no espera al resumen diario, se manda
  // al toque como parte de esta misma publicación
  if (body.notify === true) {
    sendToSegment(
      { country, lang },
      { title: 'Flashttoo', body: String(body.content).trim().slice(0, 140), url: '/?comunidad=1' },
    ).catch(err => console.error('[push] fallo sendToSegment desde admin', err))
  }

  return NextResponse.json({ post: data })
}
