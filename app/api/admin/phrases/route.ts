import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: phrases } = await sb()
    .from('phrases')
    .select('id, image_url, description, language_code, active, created_at, tags, links')
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
