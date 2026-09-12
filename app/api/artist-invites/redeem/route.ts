import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { token, artist_id } = await req.json()
  if (!token || !artist_id) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const client = sb()
  const { data: invite } = await client.from('artist_invites')
    .select('id, created_by_artist_id, created_by_admin, used_by_artist_id')
    .eq('token', token).single()

  if (!invite || invite.used_by_artist_id) {
    return NextResponse.json({ error: 'Invitación inválida o ya usada' }, { status: 400 })
  }

  await client.from('artist_invites').update({ used_by_artist_id: artist_id, used_at: new Date().toISOString() }).eq('id', invite.id)

  let invitedByName = 'Flashttoo'
  if (!invite.created_by_admin && invite.created_by_artist_id) {
    const { data: inviter } = await client.from('artists').select('name').eq('id', invite.created_by_artist_id).single()
    invitedByName = inviter?.name || 'un tatuador de Flashttoo'
  }

  await client.from('artists').update({
    invited_by: invite.created_by_admin ? null : invite.created_by_artist_id,
    invited_by_admin: invite.created_by_admin,
    invited_by_name: invitedByName,
  }).eq('id', artist_id)

  return NextResponse.json({ ok: true })
}
