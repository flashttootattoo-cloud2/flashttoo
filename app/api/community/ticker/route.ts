import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const LIMIT = 15

// Últimas búsquedas sin texto propio (las que en modo ticker se sacan del feed
// normal) — el frontend hace polling acá para mostrarlas de a una arriba del todo.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lang = searchParams.get('lang') || 'es'
  const now = new Date().toISOString()

  const { data, error } = await sb()
    .from('community_posts')
    .select('id, content, city, country, created_at')
    .eq('type', 'search')
    .is('search_description', null)
    .gt('expires_at', now)
    .lt('report_count', 3)
    .eq('lang', lang)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (error) return NextResponse.json({ items: [] })
  const res = NextResponse.json({ items: data ?? [] })
  res.headers.set('Cache-Control', 'no-store')
  return res
}
