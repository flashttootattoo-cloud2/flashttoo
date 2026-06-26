import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Check global banner toggle
  const { data: setting } = await sb.from('settings').select('value').eq('key', 'sponsors_banner_active').single()
  if (!setting || setting.value !== true) {
    return NextResponse.json({ sponsors: [] })
  }

  const now = new Date().toISOString()
  const { data } = await sb
    .from('sponsors')
    .select('id,name,logo_url,link,country,keep_color')
    .eq('active', true)
    .lte('starts_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)

  return NextResponse.json({ sponsors: data || [] })
}
