import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('x-admin-pass')
  if (auth !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data } = await sb()
    .from('app_events')
    .select('event_name')

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.event_name] = (counts[row.event_name] ?? 0) + 1
  }

  return NextResponse.json({ counts })
}
