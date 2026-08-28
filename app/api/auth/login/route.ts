import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await sb.auth.signInWithPassword({ email: email.toLowerCase(), password })
  if (error) return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })

  const sbAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const access_token = data.session?.access_token

  // Check artists first
  let { data: artist } = await sbAdmin.from('artists')
    .select('id, name, status, photo_url, edit_key, auth_email, user_id, show_email')
    .eq('user_id', data.user.id)
    .single()

  if (!artist) {
    const { data: byEmail } = await sbAdmin.from('artists')
      .select('id, name, status, photo_url, edit_key, auth_email, user_id, show_email')
      .eq('auth_email', email.toLowerCase())
      .single()
    artist = byEmail
  }

  if (artist) {
    if (artist.status === 'pending') return NextResponse.json({ error: 'Tu perfil está pendiente de aprobación' }, { status: 403 })
    if (artist.status !== 'active') return NextResponse.json({ error: 'Tu perfil no está activo' }, { status: 403 })
    return NextResponse.json({ type: 'artist', artist, access_token, refresh_token: data.session?.refresh_token })
  }

  // Check studios
  let { data: studio } = await sbAdmin.from('studios')
    .select('id, name, slug, auth_email, user_id, visible, logo_url')
    .eq('user_id', data.user.id)
    .single()

  if (!studio) {
    const { data: byEmail } = await sbAdmin.from('studios')
      .select('id, name, slug, auth_email, user_id, visible, logo_url')
      .eq('auth_email', email.toLowerCase())
      .single()
    studio = byEmail
  }

  if (studio) {
    return NextResponse.json({ type: 'studio', studio, access_token, refresh_token: data.session?.refresh_token })
  }

  return NextResponse.json({ error: 'No encontramos un perfil vinculado a este mail' }, { status: 404 })
}
