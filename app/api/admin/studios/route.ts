import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}
function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
function slugify(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await sb().from('studios').select('*').order('expires_at', { ascending: true, nullsFirst: false })
  return NextResponse.json({ studios: data || [] })
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const fd = await req.formData()
  const logo = fd.get('logo') as File | null
  const client = sb()

  let logo_url: string | null = null
  if (logo) {
    try { logo_url = await uploadFile(logo, `studio-logos/${Date.now()}.webp`) }
    catch (e: unknown) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload error' }, { status: 500 }) }
  }

  const ig = (fd.get('instagram') as string)?.trim().replace(/^@/, '').toLowerCase() || null
  if (ig) {
    const [{ data: a }, { data: s }] = await Promise.all([
      client.from('artists').select('id').or(`instagram.ilike.${ig},instagram.ilike.@${ig}`).limit(1),
      client.from('studios').select('id').or(`instagram.ilike.${ig},instagram.ilike.@${ig}`).limit(1),
    ])
    if (a?.length || s?.length) return NextResponse.json({ error: 'Este Instagram ya está en uso' }, { status: 400 })
  }

  const name = (fd.get('name') as string).trim()
  const rawSlug = (fd.get('slug') as string)?.trim() || slugify(name)

  // Make slug unique
  let slug = rawSlug
  const { data: existing } = await client.from('studios').select('slug').eq('slug', slug).limit(1)
  if (existing && existing.length > 0) slug = `${rawSlug}-${Date.now()}`

  const edit_key = genKey()
  const { data, error } = await client.from('studios').insert({
    name,
    slug,
    city:        (fd.get('city') as string)?.trim() || null,
    country:     (fd.get('country') as string)?.trim() || null,
    description: (fd.get('description') as string)?.trim() || null,
    instagram:   (fd.get('instagram') as string)?.trim() || null,
    whatsapp:    (fd.get('whatsapp') as string)?.trim() || null,
    website:     (fd.get('website') as string)?.trim() || null,
    logo_url,
    edit_key,
    visible: false,
    expires_at: (fd.get('expires_at') as string)?.trim() || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ studio: data, edit_key })
}
