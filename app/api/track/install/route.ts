import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const body = await req.json().catch(() => ({}))
  const platform = ['ios', 'android', 'other'].includes(body.platform) ? body.platform : 'other'
  await sb.from('installs').insert({ platform, installed_at: new Date().toISOString() })
  return NextResponse.json({ ok: true })
}
