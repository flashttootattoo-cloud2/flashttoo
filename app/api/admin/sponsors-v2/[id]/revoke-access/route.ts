import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

// Borra solo el acceso (login) de una marca, sin tocar su perfil (logo, bio,
// imágenes, etc.) — borra de verdad el usuario de Supabase Auth (no solo
// desvincula) para que ese mail quede libre y puedan volver a registrarse
// con uno nuevo más adelante, reusando el mismo perfil.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const client = sb()
  const { data: sponsor } = await client.from('sponsors_v2').select('id, user_id').eq('id', id).single()
  if (!sponsor) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (sponsor.user_id) {
    await client.auth.admin.deleteUser(sponsor.user_id).catch(() => {})
  }

  const { data, error } = await client.from('sponsors_v2').update({ user_id: null, auth_email: null }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sponsor: data })
}
