import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const [{ data: sponsor }, { data: events }] = await Promise.all([
    sb.from('sponsors_v2').select('id,name,logo_url,keep_color,logo_scale,clicks').eq('id', id).single(),
    (() => {
      const since = new Date()
      since.setMonth(since.getMonth() - 5)
      since.setDate(1)
      since.setHours(0, 0, 0, 0)
      return sb.from('sponsor_events')
        .select('event_type,created_at')
        .eq('sponsor_id', id)
        .gte('created_at', since.toISOString())
    })(),
  ])

  // Inicializar los últimos 6 meses
  type Bucket = { detail_open: number; link_click: number; grid_view: number }
  const monthly: Record<string, Bucket> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthly[key] = { detail_open: 0, link_click: 0, grid_view: 0 }
  }

  const totals: Bucket = { detail_open: 0, link_click: 0, grid_view: 0 }
  for (const ev of events ?? []) {
    const d = new Date(ev.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const type = ev.event_type as keyof Bucket
    if (monthly[key] && type in totals) {
      monthly[key][type]++
      totals[type]++
    }
  }

  return NextResponse.json({ sponsor, totals, monthly })
}
