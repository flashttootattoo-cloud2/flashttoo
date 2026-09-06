import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function auth(req: NextRequest) {
  if (req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD) return true
  const token = req.headers.get('x-cultura-token')
  if (!token) return false
  const { data } = await sb()
    .from('cultura_editors')
    .select('id')
    .eq('session_token', token)
    .gt('session_expires_at', new Date().toISOString())
    .single()
  return !!data
}

export async function GET(req: NextRequest) {
  if (!await auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: phrases } = await sb()
    .from('phrases')
    .select('id, image_url, description, language_code, active, created_at, tags, links, view_count, external_view_count, publish_at, slug')
    .order('created_at', { ascending: false })

  if (!phrases) return NextResponse.json({ phrases: [] })

  const ids = phrases.map(p => p.id)
  const commentCounts: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: counts } = await sb()
      .from('phrase_comments')
      .select('phrase_id')
      .in('phrase_id', ids)
    ;(counts || []).forEach((c: { phrase_id: string }) => {
      commentCounts[c.phrase_id] = (commentCounts[c.phrase_id] || 0) + 1
    })
  }

  return NextResponse.json({
    phrases: phrases.map(p => ({ ...p, comment_count: commentCounts[p.id] || 0 }))
  })
}
