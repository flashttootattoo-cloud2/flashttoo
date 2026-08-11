import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })

  // Verificar que no haya ya un artista con ese mail
  const { data: existing } = await sb().from('artists').select('id').eq('auth_email', email.toLowerCase()).limit(1)
  if (existing?.length) return NextResponse.json({ error: 'Ya existe un perfil con ese mail' }, { status: 400 })

  // Crear usuario en Supabase Auth
  let { data, error } = await sb().auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
  })

  // Si el mail ya existe en Auth pero no tiene perfil → registro huérfano: limpiar y recrear
  if (error) {
    const isEmailTaken = error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already been registered') || error.status === 422
    if (isEmailTaken) {
      const { data: { users } } = await sb().auth.admin.listUsers({ page: 1, perPage: 1000 })
      const orphan = users.find(u => u.email === email.toLowerCase())
      if (orphan) {
        await sb().auth.admin.deleteUser(orphan.id)
        const recreated = await sb().auth.admin.createUser({ email: email.toLowerCase(), password, email_confirm: true })
        if (recreated.error) return NextResponse.json({ error: recreated.error.message }, { status: 400 })
        data = recreated.data
        error = null
      }
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const profileUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'}/agregar?user_id=${data.user.id}&email=${encodeURIComponent(email.toLowerCase())}`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const emailResult = await resend.emails.send({
    from: `Flashttoo <${process.env.RESEND_FROM || 'info@flashttoo.com'}>`,
    to: email.toLowerCase(),
    subject: 'Completá tu perfil en Flashttoo',
    html: `
      <div style="background:#000;padding:40px 24px;font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="https://flashttoo.com/Logoprincipal.svg" alt="Flashttoo" style="height:28px;margin-bottom:32px" />
        <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;margin:0 0 16px">
          ¡Tu cuenta fue creada!
        </p>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin:0 0 32px">
          Completá tu perfil para que tu trabajo sea visible en Flashttoo.
        </p>
        <a href="${profileUrl}"
          style="display:inline-block;background:#efff42;color:#000;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;text-decoration:none">
          Completar mi perfil
        </a>
        <p style="color:rgba(255,255,255,0.25);font-size:12px;margin-top:32px;line-height:1.6">
          Si no creaste esta cuenta podés ignorar este mail.
        </p>
      </div>
    `,
  })
  console.log('Resend result:', JSON.stringify(emailResult))

  return NextResponse.json({ user_id: data.user.id })
}
