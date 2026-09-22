import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

// Corrige el mail de login de un tatuador ya activado (típico: typo al
// escribirlo en /reclamar). Actualiza tanto Supabase Auth como
// artists.auth_email — no hace falta que rearme el perfil de cero.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const client = sb()
  const { data: artist } = await client.from('artists').select('id, user_id').eq('id', id).single()
  if (!artist) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!artist.user_id) return NextResponse.json({ error: 'Este perfil todavía no tiene cuenta activada' }, { status: 400 })

  const { data: existing } = await client.from('artists').select('id').eq('auth_email', email).neq('id', id).limit(1)
  if (existing?.length) return NextResponse.json({ error: 'Ya existe otra cuenta con ese mail' }, { status: 400 })

  const { error: authError } = await client.auth.admin.updateUserById(artist.user_id, { email, email_confirm: true })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { error } = await client.from('artists').update({ auth_email: email }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
