import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('conventions').select('clicks').eq('id', id).single()
  await sb.from('conventions').update({ clicks: (data?.clicks ?? 0) + 1 }).eq('id', id)
  return NextResponse.json({ ok: true })
}
