import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMigrateEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const { email, password, artist_id, edit_key } = await req.json()
  if (!email || !password || !artist_id || !edit_key) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Verificar que la clave coincide con el artista
  const { data: artist } = await sb.from('artists').select('id, edit_key, auth_email').eq('id', artist_id).single()
  if (!artist || artist.edit_key !== edit_key) {
    return NextResponse.json({ error: 'Clave inválida' }, { status: 401 })
  }
  if (artist.auth_email) {
    return NextResponse.json({ error: 'Este perfil ya está migrado al nuevo sistema' }, { status: 400 })
  }

  // Crear usuario en Supabase Auth
  const { data, error } = await sb.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
  })
  if (error) {
    const msg = error.message.includes('already') ? 'Este mail ya está registrado' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const user_id = data.user.id
  const token = randomUUID()

  // Desactivar perfil hasta que confirme por mail
  await sb.from('artists').update({ verification_word: token, status: 'pending' }).eq('id', artist_id)

  // Enviar mail de activación
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'
  const activateUrl = `${siteUrl}/auth/activar-perfil?token=${token}&artist_id=${artist_id}&user_id=${user_id}`

  await sendMigrateEmail({ to: email.toLowerCase(), activateUrl })

  return NextResponse.json({ ok: true })
}
