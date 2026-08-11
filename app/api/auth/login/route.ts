import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await sb.auth.signInWithPassword({ email: email.toLowerCase(), password })
  if (error) return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })

  // Buscar el artista vinculado a este usuario (por user_id o auth_email)
  const sbAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  console.log('[login] auth user id:', data.user.id, '| email:', email.toLowerCase())

  let { data: artist, error: e1 } = await sbAdmin.from('artists')
    .select('id, name, status, photo_url, edit_key, auth_email, user_id, show_email')
    .eq('user_id', data.user.id)
    .single()
  console.log('[login] by user_id:', artist?.id ?? null, '| error:', e1?.message)

  if (!artist) {
    const { data: byEmail, error: e2 } = await sbAdmin.from('artists')
      .select('id, name, status, photo_url, edit_key, auth_email, user_id, show_email')
      .eq('auth_email', email.toLowerCase())
      .single()
    console.log('[login] by auth_email:', byEmail?.id ?? null, '| user_id in db:', byEmail?.user_id, '| auth_email in db:', byEmail?.auth_email, '| error:', e2?.message)
    artist = byEmail
  }

  if (!artist) return NextResponse.json({ error: 'No encontramos un perfil vinculado a este mail' }, { status: 404 })
  if (artist.status === 'pending') return NextResponse.json({ error: 'Tu perfil está pendiente de aprobación' }, { status: 403 })
  if (artist.status !== 'active') return NextResponse.json({ error: 'Tu perfil no está activo' }, { status: 403 })

  return NextResponse.json({ artist, access_token: data.session?.access_token })
}
