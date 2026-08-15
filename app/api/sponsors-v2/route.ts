import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    .select('id,name,logo_url,bg_image_url,bg_image_dark,detail_logo_url,detail_logo_mode,description,bio,instagram,link,level,city,country,keep_color,logo_scale,grid_logo_scale,whatsapp')
    .eq('active', true)
    .lte('starts_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)

  return NextResponse.json({ sponsors: data || [], banner_gap, bg_images })
}
