import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

// Dado un listado de usuarios de Instagram, devuelve cuáles corresponden a un
// tatuador visible de la app (mismo criterio que usa el feed para resaltar menciones)
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const handles = (req.nextUrl.searchParams.get('handles') || '')
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(h => /^[a-z0-9._]{2,30}$/.test(h))
    .slice(0, 20)
  if (handles.length === 0) return NextResponse.json({ found: [] })

  // "_" es comodín en ilike, así que puede traer de más: se afina con comparación exacta
  const { data } = await sb().from('artists').select('instagram, visible, status')
    .or(handles.map(h => `instagram.ilike.${h},instagram.ilike.@${h}`).join(','))
  const wanted = new Set(handles)
  const found = new Set<string>()
  for (const a of data ?? []) {
    if (a.visible === false || a.status === 'pending') continue
    const key = String(a.instagram ?? '').trim().replace(/^@/, '').toLowerCase()
    if (wanted.has(key)) found.add(key)
  }
  return NextResponse.json({ found: [...found] })
}
