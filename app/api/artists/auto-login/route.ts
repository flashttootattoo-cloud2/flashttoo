import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Después de completar /agregar el artista ya está autenticado (llegó desde el
// link que le mandamos a su mail), pero no tiene una sesión real en el navegador
// (nunca puso contraseña ahí, solo user_id/email por URL). Generamos un magic
// link server-side y el cliente lo canjea con verifyOtp para tener una sesión
// de verdad, sin pedirle que inicie sesión de nuevo.
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))
  if (!email || typeof email !== 'string') return NextResponse.json({ error: 'email requerido' }, { status: 400 })

  const { data, error } = await sb().auth.admin.generateLink({ type: 'magiclink', email: email.toLowerCase() })
  if (error || !data?.properties?.hashed_token) {
    return NextResponse.json({ error: error?.message || 'No se pudo generar la sesión' }, { status: 500 })
  }

  return NextResponse.json({ hashed_token: data.properties.hashed_token })
}
