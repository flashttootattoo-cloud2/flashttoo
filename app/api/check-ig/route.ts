import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export async function GET(req: NextRequest) {
  const handle = new URL(req.url).searchParams.get('handle')?.trim().replace(/^@/, '').toLowerCase()
  if (!handle) return NextResponse.json({ available: true })

  const client = sb()
  const [{ data: a }, { data: s }] = await Promise.all([
    client.from('artists').select('id').or(`instagram.ilike.${handle},instagram.ilike.@${handle}`).limit(1),
    client.from('studios').select('id').or(`instagram.ilike.${handle},instagram.ilike.@${handle}`).limit(1),
  ])

  return NextResponse.json({ available: !(a?.length || s?.length) })
}
