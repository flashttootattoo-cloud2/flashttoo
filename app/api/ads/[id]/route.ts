import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ct = req.headers.get('content-type') || ''

  let edit_key: string, verify_only: boolean, updates: Record<string, string>, photo: File | null = null

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    edit_key    = (form.get('edit_key') as string) || ''
    verify_only = false
    photo       = (form.get('photo') as File | null)
    updates = {
      title:     (form.get('title')     as string) ?? '',
      city:      (form.get('city')      as string) ?? '',
      country:   (form.get('country')   as string) ?? '',
      instagram: (form.get('instagram') as string) ?? '',
      whatsapp:  (form.get('whatsapp')  as string) ?? '',
      website:   (form.get('website')   as string) ?? '',
    }
  } else {
    const body  = await req.json()
    edit_key    = body.edit_key || ''
    verify_only = !!body.verify_only
    updates     = body
  }

  if (!edit_key) return NextResponse.json({ error: 'Clave requerida' }, { status: 400 })

  const { data: ad } = await sb().from('ads').select('edit_key').eq('id', id).single()
  if (!ad || ad.edit_key !== edit_key) {
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 403 })
  }

  if (verify_only) return NextResponse.json({ ok: true })

  const patch: Record<string, string | null> = {}

  if (photo && photo.size > 0) {
    const ext  = photo.name.split('.').pop() || 'webp'
    const path = `ads/${Date.now()}.${ext}`
    const { error: upErr } = await sb().storage.from('artist-photos').upload(path, photo, { contentType: photo.type })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    patch.image_url = sb().storage.from('artist-photos').getPublicUrl(path).data.publicUrl
  }

  const allowed = ['title', 'city', 'country', 'instagram', 'whatsapp', 'website']
  for (const k of allowed) {
    if (k in updates) patch[k] = updates[k] || null
  }

  const { data, error } = await sb().from('ads').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ad: data })
}
