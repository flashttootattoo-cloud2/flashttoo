import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { instagram, user_id, auth_email } = await req.json()
  if (!instagram || !user_id || !auth_email) return NextResponse.json({ ok: false })

  await sb().from('artists')
    .update({ user_id, auth_email })
    .ilike('instagram', instagram)

  return NextResponse.json({ ok: true })
}
