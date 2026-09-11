import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function slugify(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { user_id, email, name } = await req.json()
  if (!user_id || !email) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const sb = svc()

  const { data: { user } } = await sb.auth.admin.getUserById(user_id)
  if (!user || user.email !== email.toLowerCase()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: dup } = await sb.from('sponsors_v2').select('id, slug').eq('user_id', user_id).limit(1)
  if (dup?.length) return NextResponse.json({ error: 'Ya existe una marca para este usuario', slug: dup[0].slug }, { status: 409 })

  const baseName = (name?.trim() || email.split('@')[0]) as string
  const rawSlug = slugify(baseName)
  let slug = rawSlug
  const { data: existingSlug } = await sb.from('sponsors_v2').select('slug').eq('slug', slug).limit(1)
  if (existingSlug?.length) slug = `${rawSlug}-${Date.now()}`

  const { data: sponsor, error } = await sb.from('sponsors_v2').insert({
    name: baseName,
    slug,
    user_id,
    auth_email: email.toLowerCase(),
    level: 'global',
    active: false,
    starts_at: new Date().toISOString(),
    keep_color: false,
    detail_logo_mode: 'white',
    logo_scale: 100,
    grid_logo_scale: 100,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sponsor })
}

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const [{ data: setting }, { data: gapSetting }, { data: bgSetting }] = await Promise.all([
    sb.from('settings').select('value').eq('key', 'sponsors_v2_banner_active').single(),
    sb.from('settings').select('value').eq('key', 'sponsors_v2_banner_gap').single(),
    sb.from('settings').select('value').eq('key', 'insumos_bg_images').single(),
  ])
  if (!setting || setting.value !== true) return NextResponse.json({ sponsors: [] })
  const banner_gap = typeof gapSetting?.value === 'number' ? gapSetting.value : 8
  const bg_images: string[] = Array.isArray(bgSetting?.value) ? bgSetting.value : []

  const now = new Date().toISOString()

  // Marcar vencidos como inactivos automáticamente
  await sb.from('sponsors_v2')
    .update({ active: false })
    .eq('active', true)
    .not('expires_at', 'is', null)
    .lt('expires_at', now)

  const { data } = await sb
    .from('sponsors_v2')
    .select('id,name,logo_url,bg_image_url,bg_image_dark,logo_bg_color,detail_logo_url,detail_logo_mode,description,bio,instagram,link,level,city,country,keep_color,logo_scale,grid_logo_scale,whatsapp')
    .eq('active', true)
    .lte('starts_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)

  return NextResponse.json({ sponsors: data || [], banner_gap, bg_images })
}
