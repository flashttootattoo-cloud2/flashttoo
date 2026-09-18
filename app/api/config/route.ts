import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('settings').select('key,value').in('key', ['moderation', 'search_ticker_mode', 'push_notifications_visible'])
  const map: Record<string, unknown> = {}
  for (const row of data || []) map[row.key] = row.value
  const res = NextResponse.json({ moderation: map.moderation === true, search_ticker_mode: map.search_ticker_mode === true, push_notifications_visible: map.push_notifications_visible === true })
  res.headers.set('Cache-Control', 'no-store')
  return res
}
