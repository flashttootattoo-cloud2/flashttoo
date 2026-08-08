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
    .select('edit_key, photo_url, gallery_photo_1, gallery_photo_2, gallery_photo_3, instagram')
    .eq('id', id).single()
  if (!artist || artist.edit_key !== editKey) {
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })
  }

  // Solo verificar sin modificar
  if (_verify) return NextResponse.json({ ok: true })

  // Cambio de Instagram: verifica unicidad y manda a pendiente con nueva palabra
  if (body._ig_change) {
    const newIG = String(fields.instagram || '').trim().replace(/^@/, '').toLowerCase()
    if (!newIG) return NextResponse.json({ error: 'Instagram requerido' }, { status: 400 })
    // Verificar que no esté en uso por otro artista
    const { data: existing } = await sb().from('artists').select('id')
      .or(`instagram.ilike.${newIG},instagram.ilike.@${newIG}`).neq('id', id).limit(1)
    if (existing?.length) return NextResponse.json({ error: 'Este Instagram ya está en uso' }, { status: 400 })
    // Generar palabra única entre pendientes
    const WORDS = ['río','mar','sol','luna','viento','fuego','tierra','nube','piedra','árbol','flor','lago','monte','cielo','arena','ola','roca','brisa','hielo','llama','vapor','niebla','bosque','desierto','isla','volcán','glaciar','selva','pradera','tormenta','estrella','aurora','eclipse','marea','corriente','cima','valle','cueva','manantial','cascada','playa','acantilado','pantano','llanura','delta','bahía','cabo','fiordo','meseta','arrecife']
    const { data: pendingRows } = await sb().from('artists').select('verification_word').eq('status', 'pending').not('verification_word', 'is', null)
    const usedSet = new Set((pendingRows || []).map((r: { verification_word: string }) => r.verification_word))
    const available = WORDS.filter(w => !usedSet.has(w))
    const word = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : WORDS[Math.floor(Math.random() * WORDS.length)]
    const { data: updated, error: upErr } = await sb().from('artists')
      .update({ instagram: newIG, status: 'pending', verification_word: word })
      .eq('id', id).select().single()
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    return NextResponse.json({ artist: updated, verification_word: word })
  }

  const allowed = ['name', 'city', 'country', 'styles', 'bio', 'instagram', 'whatsapp', 'email', 'interview', 'visits', 'gallery_photo_1', 'gallery_photo_2', 'gallery_photo_3']
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
  const { editKey } = body

  const { data: artist } = await sb().from('artists').select('edit_key, photo_url').eq('id', id).single()
  if (!artist || artist.edit_key !== editKey) {
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })
  }

  if (artist.photo_url) deleteFile(artist.photo_url).catch(() => {})

  await sb().from('artists').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
