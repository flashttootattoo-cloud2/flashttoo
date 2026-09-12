import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sbAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function sbAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function verifyToken(token: string, userId: string) {
  const { data: { user } } = await sbAnon().auth.getUser(token)
  return user?.id === userId
}

// Nota: pese al nombre de carpeta [id] (para no chocar con /api/sponsors-v2/[id]/click|event,
// que ya usaban ese nombre de segmento), acá el valor recibido es el slug del sponsor.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const sb = sbAdmin()
  const { data: sponsor, error } = await sb.from('sponsors_v2').select('*').eq('slug', slug).single()
  if (error || !sponsor) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Vencido: se bloquea automáticamente al primer acceso, aunque el listado público no haya corrido
  if (sponsor.active && sponsor.expires_at && new Date(sponsor.expires_at) < new Date()) {
    await sb.from('sponsors_v2').update({ active: false }).eq('id', sponsor.id)
    sponsor.active = false
  }

  // Perfiles inactivos solo accesibles para su dueño o el admin
  if (!sponsor.active) {
    const adminPass = req.headers.get('x-admin-pass')
    if (adminPass && adminPass === process.env.ADMIN_PASSWORD) {
      // admin preview — permitido
    } else {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ') || !sponsor.user_id) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      }
      const token = authHeader.slice(7)
      const ok = await verifyToken(token, sponsor.user_id)
      if (!ok) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
  }

  return NextResponse.json({ sponsor })
}
