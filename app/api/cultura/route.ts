import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tag = url.searchParams.get('tag')
  const lang = url.searchParams.get('lang')
  let query = sb()
    .from('phrases')
    .select('id, image_url, description, language_code, created_at, tags')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(50)
  if (lang) query = query.eq('language_code', lang)
  if (tag) query = query.contains('tags', [tag])
  const { data: articles } = await query
  if (!articles || articles.length === 0) return NextResponse.json({ articles: [] })

  const ids = articles.map(a => a.id)
  const { data: allCommenters } = await sb()
    .from('phrase_comments')
    .select('id, phrase_id, guest_emoji, artist_id')
    .in('phrase_id', ids)
    .order('created_at', { ascending: false })

  const artistIds = (allCommenters || []).filter(c => c.artist_id).map(c => c.artist_id as string)
  const artistPhotos: Record<string, string | null> = {}
  if (artistIds.length > 0) {
    const { data: artists } = await sb().from('artists').select('id, photo_url').in('id', artistIds)
    ;(artists || []).forEach((a: { id: string; photo_url: string | null }) => { artistPhotos[a.id] = a.photo_url })
  }

  const enriched = articles.map(a => {
    const commenters = (allCommenters || []).filter(c => c.phrase_id === a.id)
    return {
      ...a,
      comment_count: commenters.length,
      recent_commenters: commenters.slice(0, 3).map(c => ({
        id: c.id,
        emoji: c.guest_emoji as string | null,
        photo_url: c.artist_id ? (artistPhotos[c.artist_id] ?? null) : null,
      })),
    }
  })

  return NextResponse.json({ articles: enriched })
}
