import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await sb.from('settings').select('value').eq('key', 'content_cards').single()
  if (error) return NextResponse.json({ cards: [], _e: error.message })
  const raw = data?.value
  const parsed = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : [])
  const cards = Array.isArray(parsed) ? parsed.filter((c: { active?: boolean }) => c.active !== false) : []
  return NextResponse.json({ cards, _raw: raw })
}
