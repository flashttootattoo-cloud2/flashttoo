import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Verificar que existe un artista con ese mail
  const { data: artist } = await sb.from('artists').select('id').eq('auth_email', email.toLowerCase()).limit(1)
  // Siempre respondemos ok para no revelar si el mail existe
  if (!artist?.length) return NextResponse.json({ ok: true })

  const { data } = await sb.auth.admin.generateLink({
    type: 'recovery',
    email: email.toLowerCase(),
    options: { redirectTo: `${process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'}/auth/nueva-contrasena` },
  })

  if (data?.properties?.action_link) {
    console.log('[reset] action_link:', data.properties.action_link)
    await sendPasswordResetEmail({ to: email.toLowerCase(), resetUrl: data.properties.action_link })
  }

  return NextResponse.json({ ok: true })
}
