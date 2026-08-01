import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED = ['insumos_open', 'eventos_open'] as const

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* ignore */ }
  const event_name = body.event_name as string
  if (!ALLOWED.includes(event_name as typeof ALLOWED[number])) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 })
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  await sb.from('app_events').insert({ event_name })
  return NextResponse.json({ ok: true })
}
