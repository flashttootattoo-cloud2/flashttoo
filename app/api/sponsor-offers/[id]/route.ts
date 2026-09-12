import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function verifySponsor(access_token: string): Promise<{ id: string; user_id: string } | null> {
  const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error } = await sbAnon.auth.getUser(access_token)
  if (error || !user) return null
  const { data: sponsor } = await sb().from('sponsors_v2').select('id, user_id').eq('user_id', user.id).single()
  if (!sponsor || sponsor.user_id !== user.id) return null
  return sponsor
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { access_token } = await req.json().catch(() => ({ access_token: null }))
  const sponsor = await verifySponsor(access_token || '')
  if (!sponsor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: offer } = await sb().from('sponsor_offers').select('sponsor_id').eq('id', id).single()
  if (!offer || offer.sponsor_id !== sponsor.id) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  await sb().from('sponsor_offers').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
