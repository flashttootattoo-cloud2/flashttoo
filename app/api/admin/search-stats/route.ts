import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await sb()
    .from('search_stats')
    .select('type, value, count')
    .order('count', { ascending: false })

  const countries = (data || []).filter(r => r.type === 'country').slice(0, 15)
  const cities    = (data || []).filter(r => r.type === 'city').slice(0, 15)
  const styles    = (data || []).filter(r => r.type === 'style').slice(0, 20)

  return NextResponse.json({ countries, cities, styles })
}
