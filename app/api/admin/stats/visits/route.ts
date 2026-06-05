import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const since = new Date()
  since.setDate(since.getDate() - 29)
  since.setHours(0, 0, 0, 0)

  const { data } = await sb
    .from('visits')
    .select('visited_at')
    .gte('visited_at', since.toISOString())

  // Agrupar por día
  const counts: Record<string, number> = {}
  data?.forEach(row => {
    const date = (row.visited_at as string).slice(0, 10)
    counts[date] = (counts[date] || 0) + 1
  })

  // Rellenar los 30 días aunque no haya datos
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().slice(0, 10)
    return { date: key, count: counts[key] ?? 0 }
  })

  return NextResponse.json({ days })
}
