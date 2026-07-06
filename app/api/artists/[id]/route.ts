import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { editKey, photo_url, _verify, ...fields } = body

  // Verificar clave y traer URLs actuales para limpiar storage si cambian
  const { data: artist } = await sb().from('artists')
    .select('edit_key, photo_url, gallery_photo_1, gallery_photo_2, gallery_photo_3')
    .eq('id', id).single()
  if (!artist || artist.edit_key !== editKey) {
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })
  }

  // Solo verificar sin modificar
  if (_verify) return NextResponse.json({ ok: true })

  const allowed = ['name', 'city', 'country', 'styles', 'bio', 'instagram', 'whatsapp', 'email', 'interview', 'visits', 'gallery_photo_1', 'gallery_photo_2', 'gallery_photo_3']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) { if (k in fields) updates[k] = fields[k] }

  // Foto de perfil: borrar la vieja solo si cambia
  if (photo_url) {
    if (artist.photo_url && artist.photo_url !== photo_url) deleteFile(artist.photo_url).catch(() => {})
    updates.photo_url = photo_url
  }

  // Galería: borrar archivos que se eliminan o reemplazan
  for (const slot of ['gallery_photo_1', 'gallery_photo_2', 'gallery_photo_3'] as const) {
    if (slot in fields) {
      const oldUrl = artist[slot] as string | null
      const newUrl = fields[slot] as string | null
      if (oldUrl && oldUrl !== newUrl) deleteFile(oldUrl).catch(() => {})
    }
  }

  if (fields.new_edit_key) updates.edit_key = String(fields.new_edit_key).trim().toUpperCase()

  const { data, error } = await sb().from('artists').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ artist: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { editKey } = body

  const { data: artist } = await sb().from('artists').select('edit_key, photo_url').eq('id', id).single()
  if (!artist || artist.edit_key !== editKey) {
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })
  }

  if (artist.photo_url) deleteFile(artist.photo_url).catch(() => {})

  await sb().from('artists').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
