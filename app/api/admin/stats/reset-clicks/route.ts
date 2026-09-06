import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const ALLOWED = ['instagram_clicks', 'whatsapp_clicks'] as const
type Field = typeof ALLOWED[number]

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('x-admin-pass')
  if (auth !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { field } = await req.json()
  if (!ALLOWED.includes(field as Field)) return NextResponse.json({ error: 'field inválido' }, { status: 400 })

  const { error } = await sb().from('artists').update({ [field]: 0 }).neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
