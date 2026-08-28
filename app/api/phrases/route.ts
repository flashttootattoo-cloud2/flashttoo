import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  const lang = new URL(req.url).searchParams.get('lang') || 'es'

  const { data: phrase } = await sb()
    .from('phrases')
    .select('id, image_url, description, language_code')
    .eq('language_code', lang)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!phrase) return NextResponse.json({ phrase: null })

  const { data: commenters, count: totalComments } = await sb()
    .from('phrase_comments')
    .select('id, guest_emoji, artist_id', { count: 'exact' })
    .eq('phrase_id', phrase.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const artistIds = (commenters || []).filter(c => c.artist_id).map(c => c.artist_id as string)
  const artistPhotos: Record<string, string | null> = {}
  if (artistIds.length > 0) {
    const { data: artists } = await sb().from('artists').select('id, photo_url').in('id', artistIds)
    ;(artists || []).forEach((a: { id: string; photo_url: string | null }) => { artistPhotos[a.id] = a.photo_url })
  }

  const recent_commenters = (commenters || []).map(c => ({
    id: c.id,
    emoji: c.guest_emoji as string | null,
    photo_url: c.artist_id ? (artistPhotos[c.artist_id] ?? null) : null,
  }))

  return NextResponse.json({ phrase: { ...phrase, recent_commenters, comment_count: totalComments ?? 0 } })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fd = await req.formData()
  const image = fd.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })

  const lang = (fd.get('language_code') as string | null) || 'es'
  const description = (fd.get('description') as string | null)?.trim() || null

  const ext = image.name.split('.').pop() || 'jpg'
  const image_url = await uploadFile(image, `phrases/${crypto.randomUUID()}.${ext}`)

  const { data, error } = await sb()
    .from('phrases')
    .insert({ image_url, description, language_code: lang, active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ phrase: data })
}
