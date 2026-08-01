import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await sb.from('conventions')
    .select('id,name,image_url,link,expires_at')
    .eq('active', true)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order('created_at', { ascending: false })
  return NextResponse.json({ conventions: data ?? [] })
}
