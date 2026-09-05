import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await sb().from('search_stats').update({ count: 0 }).gte('count', 0)
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await sb()
    .from('search_stats')
    .select('type, value, count')
    .order('count', { ascending: false })

  const countries = (data || []).filter(r => r.type === 'country').slice(0, 50)
  const cities    = (data || []).filter(r => r.type === 'city').slice(0, 50)
  const styles    = (data || []).filter(r => r.type === 'style').slice(0, 50)

  return NextResponse.json({ countries, cities, styles })
}
