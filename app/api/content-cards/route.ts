import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('settings').select('value').eq('key', 'content_cards').single()
  const cards = Array.isArray(data?.value)
    ? data.value.filter((c: { active?: boolean }) => c.active !== false)
    : []
  return NextResponse.json({ cards })
}
