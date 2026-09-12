import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = randomUUID()
  const { error } = await sb().from('studio_invites').insert({ token })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'}/registrar-estudio?invite=${token}` })
}
