import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

function r2Path(file: File, prefix: string) {
  const ext = file.name.split('.').pop() || 'png'
  return `sponsors-v2/${prefix}-${Date.now()}.${ext}`
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const client = sb()
  const now = new Date().toISOString()

  // Marcar vencidos como inactivos automáticamente
  await client.from('sponsors_v2')
    .update({ active: false })
    .eq('active', true)
    .not('expires_at', 'is', null)
    .lt('expires_at', now)

  const [{ data: sponsors }, { data: setting }] = await Promise.all([
    client.from('sponsors_v2').select('*').order('expires_at', { ascending: true, nullsFirst: false }),
    client.from('settings').select('value').eq('key', 'sponsors_v2_banner_active').single(),
  ])
  return NextResponse.json({ sponsors: sponsors || [], banner_active: setting?.value === true })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const logo           = form.get('logo') as File
  const bgFile         = form.get('bg_image') as File | null
  const detailLogoFile = form.get('detail_logo') as File | null
  const name        = (form.get('name') as string)?.trim() || null
  const description = (form.get('description') as string)?.trim() || null
  const link        = (form.get('link') as string)?.trim() || null
  const notes       = (form.get('notes') as string)?.trim() || null
  const level       = (form.get('level') as string)?.trim() || 'global'
  const city        = (form.get('city') as string)?.trim() || null
  const country     = (form.get('country') as string)?.trim() || null
  const keep_color       = form.get('keep_color') === 'true'
  const detail_logo_mode = (form.get('detail_logo_mode') as string)?.trim() || 'white'
  const logoScaleRaw     = parseInt((form.get('logo_scale') as string) || '', 10)
  const logo_scale       = Number.isFinite(logoScaleRaw) && logoScaleRaw > 0 ? logoScaleRaw : 100
  const startsRaw   = (form.get('starts_at') as string)?.trim() || null
  const expiresRaw  = (form.get('expires_at') as string)?.trim() || null
  const starts_at   = startsRaw  ? new Date(startsRaw).toISOString()  : new Date().toISOString()
  const expires_at  = expiresRaw ? new Date(expiresRaw).toISOString() : null

  if (!logo || !logo.size) return NextResponse.json({ error: 'Logo requerido' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const client = sb()
  try {
    const logo_url        = await uploadFile(logo, r2Path(logo, 'logo'))
    const bg_image_url    = bgFile?.size ? await uploadFile(bgFile, r2Path(bgFile, 'bg')) : null
    const detail_logo_url = detailLogoFile?.size ? await uploadFile(detailLogoFile, r2Path(detailLogoFile, 'detail')) : null

    const { data, error } = await client.from('sponsors_v2').insert({
      name, description, link, level, city, country, keep_color, starts_at, expires_at,
      logo_url, bg_image_url, detail_logo_url, detail_logo_mode, notes, logo_scale,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ sponsor: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
