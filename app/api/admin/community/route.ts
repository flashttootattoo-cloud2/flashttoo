import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteFile, uploadFile } from '@/lib/storage'
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

  const contentType = req.headers.get('content-type') || ''
  let content = '', lang = 'es', expiresRaw = '', link = '', country = '', city = '', kind = ''
  let notify = false
  let photo: File | null = null

  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData()
    content     = (fd.get('content') as string) || ''
    lang        = (fd.get('lang') as string) || 'es'
    expiresRaw  = (fd.get('expires_at') as string) || ''
    link        = (fd.get('link') as string) || ''
    country     = (fd.get('country') as string) || ''
    city        = (fd.get('city') as string) || ''
    kind        = (fd.get('kind') as string) || ''
    notify      = fd.get('notify') === 'true'
    photo       = fd.get('photo') as File | null
  } else {
    const body = await req.json().catch(() => null)
    content     = body?.content || ''
    lang        = body?.lang || 'es'
    expiresRaw  = body?.expires_at || ''
    link        = body?.link || ''
    country     = body?.country || ''
    city        = body?.city || ''
    kind        = body?.kind || ''
    notify      = body?.notify === true
  }

  if (!content.trim()) return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 })

  // Vencimiento: por defecto 7 días como el resto, pero el admin puede fijar
  // una fecha propia (ej. algo puntual como un flash day de este sábado)
  let expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  if (expiresRaw.trim()) {
    const custom = new Date(expiresRaw)
    if (!isNaN(custom.getTime()) && custom.getTime() > Date.now()) expires = custom.toISOString()
  }

  let photo_url: string | null = null
  if (photo && photo.size) {
    try { photo_url = await uploadFile(photo, `community-admin/${Date.now()}.webp`) }
    catch (e: unknown) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload error' }, { status: 500 }) }
  }

  const linkTrim    = link.trim() ? link.trim().slice(0, 500) : null
  const countryTrim = country.trim() ? country.trim().slice(0, 200) : null
  const cityTrim    = city.trim() ? city.trim().slice(0, 200) : null
  const type = kind === 'news' ? 'news' : 'admin'

  const { data, error } = await sb()
    .from('community_posts')
    .insert({
      type,
      content: content.trim().slice(0, 300),
      lang,
      link: linkTrim,
      country: countryTrim,
      city: cityTrim,
      photo_url,
      expires_at: expires,
      report_count: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificación inmediata (opcional) — no espera al resumen diario, se manda
  // al toque como parte de esta misma publicación. El link lleva el id del post
  // para que al entrar desde la notificación el mensaje se resalte y se apague
  // solo, igual que cuando se abre un mensaje compartido.
  if (notify) {
    sendToSegment(
      { country: countryTrim, city: cityTrim, lang },
      { title: 'Flashttoo', body: content.trim().slice(0, 140), url: `/?comunidad=1&post=${data.id}` },
    ).catch(err => console.error('[push] fallo sendToSegment desde admin', err))
  }

  return NextResponse.json({ post: data })
}
