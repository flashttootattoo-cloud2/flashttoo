import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false })

  const entries: { type: string; value: string }[] = []
  if (body.country?.trim()) entries.push({ type: 'country', value: body.country.trim() })
  if (body.city?.trim())    entries.push({ type: 'city',    value: body.city.trim() })
  if (Array.isArray(body.styles)) {
    for (const s of body.styles) {
      if (s?.trim()) entries.push({ type: 'style', value: s.trim() })
    }
  }

  if (entries.length === 0) return NextResponse.json({ ok: true })

  const client = sb()
  await Promise.all(entries.map(({ type, value }) =>
    client.rpc('increment_search_stat', { p_type: type, p_value: value })
  ))

  return NextResponse.json({ ok: true })
}
