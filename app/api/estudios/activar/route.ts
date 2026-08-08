import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')?.trim().toUpperCase()
  if (!key) return NextResponse.json({ error: 'Clave requerida' }, { status: 400 })
  const { data } = await sb().from('studios').select('id, name, city, country, description, instagram, whatsapp, website, logo_url, visible').eq('edit_key', key).single()
  if (!data) return NextResponse.json({ error: 'Clave incorrecta' }, { status: 404 })
  return NextResponse.json({ studio: data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { key, name, city, country, description, whatsapp, website, logo_url, terms } = body
  if (!key) return NextResponse.json({ error: 'Clave requerida' }, { status: 400 })
  if (!terms) return NextResponse.json({ error: 'Debés aceptar los términos' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  const { data: studio } = await sb().from('studios').select('id').eq('edit_key', key.trim().toUpperCase()).single()
  if (!studio) return NextResponse.json({ error: 'Clave incorrecta' }, { status: 404 })

  const updates: Record<string, unknown> = {
    name: name.trim(),
    city: city?.trim() || null,
    country: country?.trim() || null,
    description: description?.trim() || null,
    whatsapp: whatsapp?.trim() || null,
    website: website?.trim() || null,
    visible: true,
  }
  if (logo_url) updates.logo_url = logo_url

  const { data: updated, error } = await sb().from('studios').update(updates).eq('id', studio.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ studio: updated })
}
