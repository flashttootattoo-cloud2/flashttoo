import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile, deleteFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const status = url.searchParams.get('status') // 'active' | 'archived' | null = all

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

  const authorInstagram = ((fd.get('author_instagram') as string | null) ?? '').trim()
  const description     = ((fd.get('description')      as string | null) ?? '').trim() || null
  const tagsRaw         = (fd.get('tags')              as string | null) ?? ''
  const tags            = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
  const publishAt       = (fd.get('publish_at')        as string | null) || null

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
    author_instagram: authorInstagram,
    description,
    tags,
    publish_at:   publishAt || null,
    active:       !publishAt,
    published_at: publishAt ? null : now,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ video: data })
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
