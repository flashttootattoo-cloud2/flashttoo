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

  const { data: phrases } = await sb()
    .from('phrases')
    .select('id, image_url, description, language_code')
    .eq('language_code', lang)
    .eq('active', true)
    .limit(10)

  // Mezclar aleatoriamente
  if (phrases) {
    for (let i = phrases.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [phrases[i], phrases[j]] = [phrases[j], phrases[i]]
    }
  }

  if (!phrases || phrases.length === 0) return NextResponse.json({ phrases: [] })

  const phraseIds = phrases.map(p => p.id)

  const { data: allCommenters } = await sb()
    .from('phrase_comments')
    .select('id, phrase_id, guest_emoji, artist_id')
    .in('phrase_id', phraseIds)
    .order('created_at', { ascending: false })

  const artistIds = (allCommenters || []).filter(c => c.artist_id).map(c => c.artist_id as string)
  const artistPhotos: Record<string, string | null> = {}
  if (artistIds.length > 0) {
    const { data: artists } = await sb().from('artists').select('id, photo_url').in('id', artistIds)
    ;(artists || []).forEach((a: { id: string; photo_url: string | null }) => { artistPhotos[a.id] = a.photo_url })
  }

  const enriched = phrases.map(phrase => {
    const commenters = (allCommenters || []).filter(c => c.phrase_id === phrase.id)
    const recent_commenters = commenters.slice(0, 3).map(c => ({
      id: c.id,
      emoji: c.guest_emoji as string | null,
      photo_url: c.artist_id ? (artistPhotos[c.artist_id] ?? null) : null,
    }))
    return { ...phrase, recent_commenters, comment_count: commenters.length }
  })

  return NextResponse.json({ phrases: enriched })
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
