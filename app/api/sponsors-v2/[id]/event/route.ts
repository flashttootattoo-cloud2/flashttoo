import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED = ['detail_open', 'banner_click', 'detail_click'] as const

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* ignore */ }
  const event_type = body.event_type as string
  if (!ALLOWED.includes(event_type as typeof ALLOWED[number])) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 })
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  await sb.from('sponsor_events').insert({ sponsor_id: id, event_type })
  return NextResponse.json({ ok: true })
}
