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
  const { data } = await sb().from('settings').select('key,value')
  const out: Record<string, unknown> = {}
  for (const row of data || []) out[row.key] = row.value
  return NextResponse.json({ settings: out, r2_available: !!process.env.CLOUDFLARE_R2_PUBLIC_URL })
}

export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { key, value } = await req.json()
  await sb().from('settings').upsert({ key, value })
  return NextResponse.json({ ok: true })
}
