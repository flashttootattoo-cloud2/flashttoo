import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const password = body.password
  const invite_token = body.invite_token
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const tyc = body.tyc === true
  if (!email || !password) return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  if (!tyc) return NextResponse.json({ error: 'Tenés que aceptar los términos para continuar' }, { status: 400 })

  // El registro es solo por invitación
  if (!invite_token) return NextResponse.json({ error: 'Necesitás un link de invitación para registrarte' }, { status: 400 })
  const { data: invite } = await sb().from('sponsor_invites').select('id, used_by_sponsor_id').eq('token', invite_token).single()
  if (!invite || invite.used_by_sponsor_id) return NextResponse.json({ error: 'La invitación no es válida o ya fue usada' }, { status: 400 })

  const { data: existing } = await sb().from('sponsors_v2').select('id').eq('auth_email', email.toLowerCase()).limit(1)
  if (existing?.length) return NextResponse.json({ error: 'Ya existe una marca con ese mail' }, { status: 400 })

  const authUser = await (async () => {
    const result = await sb().auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { account_type: 'sponsor' },
    })
    if (!result.error) return result.data.user

    const isEmailTaken =
      result.error.message.toLowerCase().includes('already registered') ||
      result.error.message.toLowerCase().includes('already been registered') ||
      result.error.status === 422
    if (!isEmailTaken) return null

    const { data: { users } } = await sb().auth.admin.listUsers({ page: 1, perPage: 1000 })
    const orphan = users.find(u => u.email === email.toLowerCase())
    if (!orphan) return null

    await sb().auth.admin.deleteUser(orphan.id)
    const recreated = await sb().auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { account_type: 'sponsor' },
    })
    if (recreated.error) return null
    return recreated.data.user
  })()

  if (!authUser) return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 400 })

  return NextResponse.json({ user_id: authUser.id })
}
