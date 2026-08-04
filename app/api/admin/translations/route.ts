import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const lang = new URL(req.url).searchParams.get('lang') || 'es'
  const { data } = await sb()
    .from('translations').select('section, key, value')
    .eq('language_code', lang).order('section').order('key')
  return NextResponse.json({ translations: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const rows = (Array.isArray(body) ? body : [body]).map(r => ({
    ...r, updated_at: new Date().toISOString(),
  }))
  const { error } = await sb()
    .from('translations')
    .upsert(rows, { onConflict: 'language_code,section,key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
