import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile, deleteFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

async function autoPublishScheduled() {
  const now = new Date().toISOString()
  await sb()
    .from('cultura_videos')
    .update({ active: true, published_at: now })
    .eq('active', false)
    .not('publish_at', 'is', null)
    .lte('publish_at', now)
    .is('archived_at', null)
}

async function autoArchiveOld() {
  const client = sb()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch all active videos ordered newest first
  const { data: active } = await client
    .from('cultura_videos')
    .select('id, video_url, published_at')
    .is('archived_at', null)
    .eq('active', true)
    .order('published_at', { ascending: false, nullsFirst: false })

  if (!active?.length) return

  // Archive: beyond position 7 OR older than 7 days
  const toArchive = active.filter((v, i) => i >= 7 || (v.published_at && v.published_at < sevenDaysAgo))
  if (!toArchive.length) return

  const now = new Date().toISOString()
  await Promise.allSettled(toArchive.map(async v => {
    if (v.video_url) await deleteFile(v.video_url).catch(() => {})
    await client.from('cultura_videos').update({
      video_url: null, archived_at: now, video_deleted_at: now,
    }).eq('id', v.id)
  }))
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const status = url.searchParams.get('status') // 'active' | 'archived' | null = all

  // Auto-publicar programados y auto-archivar viejos (fire and forget)
  if (!status || status === 'active') {
    void autoPublishScheduled().then(() => autoArchiveOld())
  }

  const client = sb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = client.from('cultura_videos').select('*')
  if (status === 'active')   q = q.is('archived_at', null).eq('active', true)
  if (status === 'archived') q = q.not('archived_at', 'is', null)

  const { data, error } = await q.order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ videos: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fd = await req.formData()
  const videoFile  = fd.get('video')  as File | null
  const coverFile  = fd.get('cover')  as File | null

  if (!videoFile) return NextResponse.json({ error: 'Video requerido' }, { status: 400 })
  if (!coverFile) return NextResponse.json({ error: 'Portada requerida' }, { status: 400 })

  const authorInstagram      = ((fd.get('author_instagram')      as string | null) ?? '').trim()
  const authorFlashttooSlug  = ((fd.get('author_flashttoo_slug') as string | null) ?? '').trim() || null
  const instagramVideoUrl = ((fd.get('instagram_video_url') as string | null) ?? '').trim() || null
  const descriptionEn     = ((fd.get('description_en')      as string | null) ?? '').trim() || null
  const descriptionPt     = ((fd.get('description_pt')      as string | null) ?? '').trim() || null
  const tagsEnRaw         = (fd.get('tags_en')              as string | null) ?? ''
  const tagsPtRaw         = (fd.get('tags_pt')              as string | null) ?? ''
  const tagsEn            = tagsEnRaw ? tagsEnRaw.split(',').map(t => t.trim()).filter(Boolean) : []
  const tagsPt            = tagsPtRaw ? tagsPtRaw.split(',').map(t => t.trim()).filter(Boolean) : []
  const description     = ((fd.get('description')      as string | null) ?? '').trim() || null
  const tagsRaw         = (fd.get('tags')              as string | null) ?? ''
  const tags            = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
  const publishAt       = (fd.get('publish_at')        as string | null) || null
  const muteAudio       = fd.get('mute_audio') === 'true'

  const id = crypto.randomUUID()
  const videoExt = videoFile.name.split('.').pop() || 'mp4'
  const coverExt = coverFile.name.split('.').pop()  || 'jpg'

  const [videoUrl, coverUrl] = await Promise.all([
    uploadFile(videoFile, `cultura-videos/${id}/video.${videoExt}`),
    uploadFile(coverFile, `cultura-videos/${id}/cover.${coverExt}`),
  ])

  const now = new Date().toISOString()
  const { data, error } = await sb().from('cultura_videos').insert({
    id,
    video_url:        videoUrl,
    cover_image_url:  coverUrl,
    author_instagram:      authorInstagram,
    author_flashttoo_slug: authorFlashttooSlug,
    instagram_video_url: instagramVideoUrl,
    description_en:      descriptionEn,
    description_pt:      descriptionPt,
    tags_en:             tagsEn,
    tags_pt:             tagsPt,
    description,
    tags,
    mute_audio:   muteAudio,
    publish_at:   publishAt || null,
    active:       !publishAt,
    published_at: publishAt ? null : now,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ video: data })
}

// PUT: editar metadata
export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    id: string
    author_instagram?: string
    author_flashttoo_slug?: string | null
    instagram_video_url?: string | null
    description?: string | null
    tags?: string[]
    publish_at?: string | null
    active?: boolean
    description_en?: string | null
    description_pt?: string | null
    tags_en?: string[]
    tags_pt?: string[]
    mute_audio?: boolean
  }
  if (!body.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {}
  if (body.author_instagram      !== undefined) update.author_instagram      = body.author_instagram
  if (body.author_flashttoo_slug !== undefined) update.author_flashttoo_slug = body.author_flashttoo_slug
  if (body.instagram_video_url   !== undefined) update.instagram_video_url   = body.instagram_video_url
  if (body.description           !== undefined) update.description           = body.description
  if (body.tags                  !== undefined) update.tags                  = body.tags
  if (body.publish_at            !== undefined) {
    update.publish_at   = body.publish_at || null
    update.active       = !body.publish_at
    update.published_at = body.publish_at ? null : new Date().toISOString()
  }
  if (body.active         !== undefined) update.active         = body.active
  if (body.description_en !== undefined) update.description_en = body.description_en
  if (body.description_pt !== undefined) update.description_pt = body.description_pt
  if (body.tags_en        !== undefined) update.tags_en        = body.tags_en
  if (body.tags_pt        !== undefined) update.tags_pt        = body.tags_pt
  if (body.mute_audio     !== undefined) update.mute_audio     = body.mute_audio

  const { error } = await sb().from('cultura_videos').update(update).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH: archivar (borra el video de R2, mantiene portada)
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { data: video } = await sb().from('cultura_videos').select('video_url').eq('id', id).single()
  if (!video) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (video.video_url) await deleteFile(video.video_url).catch(() => {})

  const now = new Date().toISOString()
  const { error } = await sb().from('cultura_videos').update({
    video_url:        null,
    archived_at:      now,
    video_deleted_at: now,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: borrar completamente
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json() as { id: string }
  const { data: video } = await sb().from('cultura_videos').select('video_url, cover_image_url').eq('id', id).single()

  if (video) {
    await Promise.allSettled([
      video.video_url        ? deleteFile(video.video_url)        : Promise.resolve(),
      video.cover_image_url  ? deleteFile(video.cover_image_url)  : Promise.resolve(),
    ])
  }

  await sb().from('cultura_videos').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
