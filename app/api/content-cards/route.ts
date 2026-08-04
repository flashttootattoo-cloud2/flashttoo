import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const lang = req.nextUrl.searchParams.get('lang') || 'es'

  const settingsKey = lang === 'es' ? 'content_cards' : `content_cards_${lang}`

  const { data } = await sb.from('settings').select('value').eq('key', settingsKey).single()

  let cards = Array.isArray(data?.value) ? data.value : []

  // Fallback to Spanish if no cards for this language
  if (cards.length === 0 && lang !== 'es') {
    const { data: fallback } = await sb.from('settings').select('value').eq('key', 'content_cards').single()
    cards = Array.isArray(fallback?.value) ? fallback.value : []
  }

  const active = cards.filter((c: { active?: boolean }) => c.active !== false)
  return NextResponse.json({ cards: active })
}
