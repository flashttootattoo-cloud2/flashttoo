import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const isExternal = body.source === 'external'

  const { data } = await sb().from('phrases').select('view_count, external_view_count').eq('id', id).single()
  if (!data) return NextResponse.json({ ok: true })

  const updates: Record<string, number> = { view_count: (data.view_count ?? 0) + 1 }
  if (isExternal) updates.external_view_count = (data.external_view_count ?? 0) + 1

  await sb().from('phrases').update(updates).eq('id', id)
  return NextResponse.json({ ok: true })
}
