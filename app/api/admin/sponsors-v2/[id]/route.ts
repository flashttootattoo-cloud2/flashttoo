import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile, deleteFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

const JSON_ALLOWED = ['active', 'name', 'description', 'bio', 'instagram', 'link', 'whatsapp', 'level', 'city', 'country', 'keep_color', 'starts_at', 'expires_at', 'logo_url', 'bg_image_url', 'bg_image_dark', 'logo_bg_color', 'detail_logo_url', 'detail_logo_mode', 'notes', 'logo_scale', 'grid_logo_scale', 'linked_from']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const contentType = req.headers.get('content-type') || ''
  const client = sb()
  const patch: Record<string, unknown> = {}
  let oldBgUrl: string | null = null
  let oldDetailLogoUrl: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const bgFile         = form.get('bg_image') as File | null
    const detailLogoFile = form.get('detail_logo') as File | null
    if (bgFile?.size || detailLogoFile?.size) {
      const { data: cur } = await client.from('sponsors_v2').select('bg_image_url, detail_logo_url').eq('id', id).single()
      oldBgUrl        = cur?.bg_image_url ?? null
      oldDetailLogoUrl = cur?.detail_logo_url ?? null
    }
    if (bgFile?.size) {
      const ext  = bgFile.name.split('.').pop() || 'jpg'
      patch.bg_image_url = await uploadFile(bgFile, `sponsors-v2/bg-${Date.now()}.${ext}`)
    }
    if (detailLogoFile?.size) {
      const ext  = detailLogoFile.name.split('.').pop() || 'png'
      patch.detail_logo_url = await uploadFile(detailLogoFile, `sponsors-v2/detail-${Date.now()}.${ext}`)
    }
    const textFields = ['name', 'description', 'bio', 'instagram', 'link', 'whatsapp', 'level', 'city', 'country', 'starts_at', 'expires_at', 'notes', 'detail_logo_mode']
    for (const k of textFields) {
      const v = form.get(k) as string | null
      if (v !== null) patch[k] = v.trim() || null
    }
    const kc = form.get('keep_color')
    if (kc !== null) patch.keep_color = kc === 'true'
    const ls = form.get('logo_scale')
    if (ls !== null) {
      const parsed = parseInt(ls as string, 10)
      patch.logo_scale = Number.isFinite(parsed) && parsed > 0 ? parsed : 100
    }
    const gs = form.get('grid_logo_scale')
    if (gs !== null) {
      const parsed = parseInt(gs as string, 10)
      patch.grid_logo_scale = Number.isFinite(parsed) && parsed > 0 ? parsed : 100
    }
  } else {
    const body = await req.json()
    for (const k of JSON_ALLOWED) if (k in body) patch[k] = body[k]
  }

  const { data, error } = await client.from('sponsors_v2').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Borrar archivos viejos solo después de confirmar el UPDATE
  if (patch.bg_image_url && oldBgUrl) deleteFile(oldBgUrl).catch(() => {})
  if (patch.detail_logo_url && oldDetailLogoUrl) deleteFile(oldDetailLogoUrl).catch(() => {})

  return NextResponse.json({ sponsor: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const client = sb()
  const { data: sp } = await client.from('sponsors_v2').select('logo_url,bg_image_url,detail_logo_url').eq('id', id).single()
  for (const url of [sp?.logo_url, sp?.bg_image_url, sp?.detail_logo_url]) {
    if (url) deleteFile(url).catch(() => {})
  }
  await client.from('sponsors_v2').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
