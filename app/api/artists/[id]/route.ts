import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: artist } = await sb().from('artists').select('id, name, city, country, photo_url, slug').eq('id', id).single()
  if (!artist) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ artist })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { editKey, access_token, photo_url, _verify, ...fields } = body

  // Verificar clave y traer URLs actuales para limpiar storage si cambian
  const { data: artist } = await sb().from('artists')
    .select('edit_key, user_id, photo_url, gallery_photo_1, gallery_photo_2, gallery_photo_3, instagram')
    .eq('id', id).single()

  if (!artist) return NextResponse.json({ error: 'Artista no encontrado' }, { status: 404 })

  if (access_token) {
    const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error } = await sbAnon.auth.getUser(access_token)
    if (error || !user || user.id !== artist.user_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  } else {
    if (artist.edit_key !== editKey) {
      return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })
    }
  }

  // Solo verificar sin modificar
  if (_verify) return NextResponse.json({ ok: true })

  // Cambio de Instagram: verifica unicidad y manda a pendiente con nueva palabra
  if (body._ig_change) {
    const newIG = String(body.instagram || '').trim().replace(/^@/, '').toLowerCase()
    const oldIG = String(artist.instagram || '').trim().replace(/^@/, '').toLowerCase()
    if (!newIG) return NextResponse.json({ error: 'Instagram requerido' }, { status: 400 })
    if (newIG === oldIG) return NextResponse.json({ error: 'El Instagram nuevo es igual al actual' }, { status: 400 })
    // Verificar que no esté en uso por otro artista
    const { data: existing } = await sb().from('artists').select('id')
      .or(`instagram.ilike.${newIG},instagram.ilike.@${newIG}`).neq('id', id).limit(1)
    if (existing?.length) return NextResponse.json({ error: 'Este Instagram ya está en uso' }, { status: 400 })
    const { data: updated, error: upErr } = await sb().from('artists')
      .update({ instagram: newIG, status: 'pending', verification_word: null })
      .eq('id', id).select().single()
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    try { await sb().from('artists').update({ pending_reason: `ig_change:${oldIG}` }).eq('id', id) } catch { /* ignorar */ }
    return NextResponse.json({ artist: updated })
  }

  const allowed = ['name', 'city', 'country', 'styles', 'bio', 'instagram', 'whatsapp', 'email', 'show_email', 'interview', 'visits', 'gallery_photo_1', 'gallery_photo_2', 'gallery_photo_3', 'gallery_photo_1_styles', 'gallery_photo_2_styles', 'gallery_photo_3_styles']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) { if (k in fields) updates[k] = fields[k] }

  if (photo_url) updates.photo_url = photo_url
  if (fields.new_edit_key) updates.edit_key = String(fields.new_edit_key).trim().toUpperCase()

  const { data, error } = await sb().from('artists').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Borrar archivos viejos solo después de confirmar el UPDATE
  if (photo_url && artist.photo_url && artist.photo_url !== photo_url) deleteFile(artist.photo_url).catch(() => {})
  for (const slot of ['gallery_photo_1', 'gallery_photo_2', 'gallery_photo_3'] as const) {
    if (slot in fields) {
      const oldUrl = artist[slot] as string | null
      const newUrl = fields[slot] as string | null
      if (oldUrl && oldUrl !== newUrl) deleteFile(oldUrl).catch(() => {})
    }
  }

  return NextResponse.json({ artist: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { editKey, access_token } = body

  const { data: artist } = await sb().from('artists').select('edit_key, user_id, photo_url').eq('id', id).single()
  if (!artist) return NextResponse.json({ error: 'Artista no encontrado' }, { status: 404 })

  if (access_token) {
    const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error } = await sbAnon.auth.getUser(access_token)
    if (error || !user || user.id !== artist.user_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  } else if (artist.edit_key !== editKey) {
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })
  }

  if (artist.photo_url) deleteFile(artist.photo_url).catch(() => {})

  await sb().from('artists').delete().eq('id', id)

  if (artist.user_id) {
    await sb().auth.admin.deleteUser(artist.user_id)
  }

  return NextResponse.json({ ok: true })
}
