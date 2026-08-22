import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { token, artist_id, user_id } = await req.json()
  if (!token || !artist_id || !user_id) {
    return NextResponse.json({ error: 'Link inválido' }, { status: 400 })
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Verificar que el token coincide con el artista
  const { data: artist } = await sb.from('artists').select('id, verification_word, auth_email, email').eq('id', artist_id).single()
  if (!artist || artist.verification_word !== token) {
    return NextResponse.json({ error: 'Link inválido o ya usado' }, { status: 400 })
  }
  if (artist.auth_email) {
    return NextResponse.json({ error: 'Este perfil ya está activado' }, { status: 400 })
  }

  // Obtener el email del usuario de Auth
  const { data: { user }, error: userError } = await sb.auth.admin.getUserById(user_id)
  if (userError || !user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 400 })
  }

  // Vincular auth al perfil, reactivar y limpiar clave vieja
  const { error: updateError } = await sb.from('artists').update({
    user_id,
    auth_email: user.email,
    ...(!artist.email ? { email: user.email } : {}),
    edit_key: null,
    verification_word: null,
    status: 'active',
    migrated_at: new Date().toISOString(),
  }).eq('id', artist_id)

  if (updateError) {
    return NextResponse.json({ error: 'Error al activar el perfil' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
