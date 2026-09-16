import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Cierres extra que el admin va agregando desde tintatxm, sin tocar código —
// se combinan con los 4 fijos (que sí tienen traducción ES/EN/PT) en el chip
// "Cierre" del pedido de cliente en comunidad.
export async function GET() {
  const { data } = await sb().from('settings').select('value').eq('key', 'client_request_closings').single()
  const closings = Array.isArray(data?.value) ? data.value : []
  const res = NextResponse.json({ closings })
  res.headers.set('Cache-Control', 'no-store')
  return res
}
