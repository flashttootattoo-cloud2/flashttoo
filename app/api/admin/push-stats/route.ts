import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await sb().from('push_subscriptions').select('country, lang, last_success_at, created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const byCountry: Record<string, number> = {}
  let withoutCountry = 0
  let neverConfirmed = 0

  for (const r of rows) {
    // "Argentina" y "argentina" cuentan como el mismo país
    const key = r.country?.trim().toLowerCase()
    if (key) byCountry[key] = (byCountry[key] ?? 0) + 1
    else withoutCountry++
    if (!r.last_success_at) neverConfirmed++
  }

  return NextResponse.json({
    total: rows.length,
    withoutCountry,
    neverConfirmed,
    byCountry: Object.entries(byCountry)
      .map(([c, n]) => [c.charAt(0).toUpperCase() + c.slice(1), n] as [string, number])
      .sort((a, b) => b[1] - a[1]),
  })
}
