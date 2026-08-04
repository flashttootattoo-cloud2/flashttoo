import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const { data } = await sb().from('languages').select('code, name, flag').eq('active', true).order('code')
  return NextResponse.json({ languages: data ?? [] })
}
