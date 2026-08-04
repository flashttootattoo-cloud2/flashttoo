import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const body = await req.json()
  const { error } = await sb().from('languages').update(body).eq('code', code)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  if (code === 'es')
    return NextResponse.json({ error: 'No se puede eliminar el idioma madre' }, { status: 400 })
  const { error } = await sb().from('languages').delete().eq('code', code)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
