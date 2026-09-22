import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAccountActivatedEmail } from '@/lib/email'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Activa un perfil borrador (creado por el admin sin cuenta) — crea el
// usuario de auth, lo linkea a la fila ya existente y lo publica.
// A diferencia de la migración vieja (edit_key + doble mail), esto es un
// solo paso: el link en sí (id del artista, no listado en ningún lado) es
// la prueba de identidad, como ya se hace con las invitaciones de marcas.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const tyc = body?.tyc === true

  if (!email || !password) return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  if (!tyc) return NextResponse.json({ error: 'Tenés que aceptar los términos para continuar' }, { status: 400 })

  const client = sb()
  const { data: artist } = await client.from('artists').select('id, name, user_id').eq('id', id).single()
  if (!artist) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (artist.user_id) return NextResponse.json({ error: 'Este perfil ya fue activado' }, { status: 400 })

  const { data: existing } = await client.from('artists').select('id').eq('auth_email', email).limit(1)
  if (existing?.length) return NextResponse.json({ error: 'Ya existe una cuenta con ese mail' }, { status: 400 })

  const authUser = await (async () => {
    const result = await client.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { account_type: 'artist' },
    })
    if (!result.error) return result.data.user

    const isEmailTaken =
      result.error.message.toLowerCase().includes('already registered') ||
      result.error.message.toLowerCase().includes('already been registered') ||
      result.error.status === 422
    if (!isEmailTaken) return null

    const { data: { users } } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const orphan = users.find(u => u.email === email)
    if (!orphan) return null

    await client.auth.admin.deleteUser(orphan.id)
    const recreated = await client.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { account_type: 'artist' },
    })
    if (recreated.error) return null
    return recreated.data.user
  })()

  if (!authUser) return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 400 })

  const { data: updated, error } = await client
    .from('artists')
    .update({ user_id: authUser.id, auth_email: email, status: 'active', visible: true, tyc_accepted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .single()

  if (error || !updated) {
    await client.auth.admin.deleteUser(authUser.id)
    return NextResponse.json({ error: error?.message || 'No se pudo activar el perfil' }, { status: 500 })
  }

  sendAccountActivatedEmail({ to: email, name: artist.name }).catch(() => {})

  return NextResponse.json({ ok: true })
}
