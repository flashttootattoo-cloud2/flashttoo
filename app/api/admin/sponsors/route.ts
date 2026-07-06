import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const client = sb()
  const now = new Date().toISOString()

  // Marcar vencidos como inactivos automáticamente
  await client.from('sponsors')
    .update({ active: false })
    .eq('active', true)
    .not('expires_at', 'is', null)
    .lt('expires_at', now)

  const [{ data: sponsors }, { data: setting }] = await Promise.all([
    client.from('sponsors').select('*').order('created_at', { ascending: false }),
    client.from('settings').select('value').eq('key', 'sponsors_banner_active').single(),
  ])
  return NextResponse.json({ sponsors: sponsors || [], banner_active: setting?.value === true })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const logo       = form.get('logo') as File
  const name       = (form.get('name') as string)?.trim() || null
  const link       = (form.get('link') as string)?.trim() || null
  const country    = (form.get('country') as string)?.trim() || null
  const keep_color = form.get('keep_color') === 'true'
  const startsRaw  = (form.get('starts_at') as string)?.trim() || null
  const expiresRaw = (form.get('expires_at') as string)?.trim() || null
  const starts_at  = startsRaw  ? new Date(startsRaw).toISOString()  : new Date().toISOString()
  const expires_at = expiresRaw ? new Date(expiresRaw).toISOString() : null

  if (!logo || !logo.size) return NextResponse.json({ error: 'Logo requerido' }, { status: 400 })

  const client = sb()
  const ext  = logo.name.split('.').pop() || 'png'
  const path = `sponsors/${Date.now()}.${ext}`
  let logo_url: string
  try {
    logo_url = await uploadFile(logo, path)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload error' }, { status: 500 })
  }
  const { data, error } = await client.from('sponsors').insert({
    name, link, country, starts_at, expires_at, logo_url, keep_color,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sponsor: data })
}
