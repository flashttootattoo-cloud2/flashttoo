import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAccountActivatedEmail } from '@/lib/email'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Activa un perfil de estudio borrador (creado por el admin sin cuenta) — mismo
// patrón que /api/artists/[id]/claim: un solo paso, el link (id, no listado)
// es la prueba de identidad, sin mail intermedio. Vive bajo [slug] por una
// restricción de Next.js, pero el valor sigue siendo el id (uuid) del estudio.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: id } = await params
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const tyc = body?.tyc === true

  if (!email || !password) return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  if (!tyc) return NextResponse.json({ error: 'Tenés que aceptar los términos para continuar' }, { status: 400 })

  const client = sb()
  const { data: studio } = await client.from('studios').select('id, name, slug, logo_url, user_id').eq('id', id).single()
  if (!studio) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (studio.user_id) return NextResponse.json({ error: 'Este perfil ya fue activado' }, { status: 400 })

  const { data: existing } = await client.from('studios').select('id').eq('auth_email', email).limit(1)
  if (existing?.length) return NextResponse.json({ error: 'Ya existe una cuenta con ese mail' }, { status: 400 })

  const authUser = await (async () => {
    const result = await client.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { account_type: 'studio' },
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
      email, password, email_confirm: true, user_metadata: { account_type: 'studio' },
    })
    if (recreated.error) return null
    return recreated.data.user
  })()

  if (!authUser) return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 400 })

  const { data: updated, error } = await client
    .from('studios')
    .update({ user_id: authUser.id, auth_email: email, visible: true, tyc_accepted_at: new Date().toISOString() })
    .eq('id', id)
    .select('slug')
    .single()

  if (error || !updated) {
    await client.auth.admin.deleteUser(authUser.id)
    return NextResponse.json({ error: error?.message || 'No se pudo activar el perfil' }, { status: 500 })
  }

  sendAccountActivatedEmail({ to: email, name: studio.name }).catch(() => {})

  return NextResponse.json({ ok: true })
}
