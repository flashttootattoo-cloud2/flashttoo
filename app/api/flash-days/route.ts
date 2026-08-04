import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await sb().from('flash_days')
    .select('id, studio_slug, studio_name, flyer_url, date')
    .gte('date', today)
    .order('date', { ascending: true })
  return NextResponse.json({ flashDays: data ?? [] })
}
