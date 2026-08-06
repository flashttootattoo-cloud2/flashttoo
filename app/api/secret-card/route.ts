import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('settings').select('value').eq('key', 'secret_card').single()
  const card = data?.value ?? null
  if (!card || card.active !== true || !card.image_url) return NextResponse.json({ card: null })
  return NextResponse.json({ card })
}
