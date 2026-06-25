import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { edit_key, verify_only, ...updates } = body

  if (!edit_key) return NextResponse.json({ error: 'Clave requerida' }, { status: 400 })

  const { data: ad } = await sb().from('ads').select('edit_key').eq('id', id).single()
  if (!ad || ad.edit_key !== edit_key) {
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 403 })
  }

  if (verify_only) return NextResponse.json({ ok: true })

  const allowed = ['title', 'city', 'country', 'instagram', 'whatsapp', 'website']
  const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  const { data, error } = await sb().from('ads').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ad: data })
}
