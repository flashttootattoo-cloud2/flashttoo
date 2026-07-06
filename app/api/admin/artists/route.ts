import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url    = new URL(req.url)
  const offset = parseInt(url.searchParams.get('offset') || '0')
  const limit  = parseInt(url.searchParams.get('limit')  || '10')
  const { data, count } = await getAdminClient()
    .from('artists')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return NextResponse.json({ artists: data || [], total: count ?? 0 })
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const fd = await req.formData()
  const photo = fd.get('photo') as File | null
  const sb = getAdminClient()

  let photo_url = ''
  if (photo) {
    const path = `${Date.now()}.webp`
    const { error: upErr } = await sb.storage.from('artist-photos').upload(path, photo, { contentType: 'image/webp' })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    photo_url = sb.storage.from('artist-photos').getPublicUrl(path).data.publicUrl
  }

  const edit_key = genKey()
  const { data, error } = await sb.from('artists').insert({
    name:      (fd.get('name') as string).trim(),
    city:      (fd.get('city') as string).trim(),
    country:   (fd.get('country') as string).trim(),
    styles:    JSON.parse((fd.get('styles') as string) || '[]'),
    photo_url,
    instagram: (fd.get('instagram') as string)?.trim() || null,
    whatsapp:  (fd.get('whatsapp') as string)?.trim() || null,
    email:     (fd.get('email') as string)?.trim()    || null,
    bio:       (fd.get('bio') as string)?.trim()      || null,
    visits:    JSON.parse((fd.get('visits') as string) || '[]'),
    edit_key,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ artist: data, edit_key })
}
