import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const since = new Date()
  since.setDate(since.getDate() - 29)
  since.setHours(0, 0, 0, 0)

  const [recent, all] = await Promise.all([
    sb.from('installs').select('installed_at,platform').gte('installed_at', since.toISOString()),
    sb.from('installs').select('platform', { count: 'exact', head: false }),
  ])

  const counts: Record<string, number> = {}
  const byPlatform: Record<string, number> = { ios: 0, android: 0, other: 0 }

  recent.data?.forEach(row => {
    const date = (row.installed_at as string).slice(0, 10)
    counts[date] = (counts[date] || 0) + 1
    if (row.platform in byPlatform) byPlatform[row.platform as keyof typeof byPlatform]++
  })

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().slice(0, 10)
    return { date: key, count: counts[key] ?? 0 }
  })

  // total histórico
  const total = all.count ?? 0

  return NextResponse.json({ days, byPlatform, total })
}
