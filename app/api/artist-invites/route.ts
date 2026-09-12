import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function verifyArtist(access_token: string): Promise<{ id: string; user_id: string; invite_starter_remaining: number; invite_monthly_used: boolean; invite_monthly_month: string | null; invites_disabled: boolean } | null> {
  const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error } = await sbAnon.auth.getUser(access_token)
  if (error || !user) return null
  const { data: artist } = await sb().from('artists')
    .select('id, user_id, invite_starter_remaining, invite_monthly_used, invite_monthly_month, invites_disabled')
    .eq('user_id', user.id).single()
  if (!artist || artist.user_id !== user.id) return null
  return artist
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const access_token = req.nextUrl.searchParams.get('access_token') || ''
  const artist = await verifyArtist(access_token)
  if (!artist) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const monthlyAvailable = artist.invite_monthly_month !== currentMonth() || !artist.invite_monthly_used

  const { data: invites } = await sb().from('artist_invites')
    .select('id, token, used_by_artist_id, used_at, created_at')
    .eq('created_by_artist_id', artist.id)
    .order('created_at', { ascending: false })

  const usedIds = (invites ?? []).map(i => i.used_by_artist_id).filter(Boolean) as string[]
  let names: Record<string, string> = {}
  if (usedIds.length) {
    const { data: usedArtists } = await sb().from('artists').select('id, name').in('id', usedIds)
    names = Object.fromEntries((usedArtists ?? []).map(a => [a.id, a.name]))
  }

  const list = (invites ?? []).map(i => ({
    id: i.id,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'}/?invite=${i.token}`,
    used: !!i.used_by_artist_id,
    used_by_name: i.used_by_artist_id ? (names[i.used_by_artist_id] ?? null) : null,
    created_at: i.created_at,
  }))

  return NextResponse.json({
    starter_remaining: artist.invite_starter_remaining,
    monthly_available: monthlyAvailable,
    invites_disabled: artist.invites_disabled,
    invites: list,
  })
}

export async function POST(req: NextRequest) {
  const { access_token } = await req.json()
  const artist = await verifyArtist(access_token || '')
  if (!artist) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (artist.invites_disabled) return NextResponse.json({ error: 'Tenés las invitaciones desactivadas' }, { status: 403 })

  const month = currentMonth()
  const monthlyReset = artist.invite_monthly_month !== month
  const monthlyAvailable = monthlyReset || !artist.invite_monthly_used

  const update: Record<string, unknown> = {}
  if (artist.invite_starter_remaining > 0) {
    update.invite_starter_remaining = artist.invite_starter_remaining - 1
  } else if (monthlyAvailable) {
    update.invite_monthly_month = month
    update.invite_monthly_used = true
  } else {
    return NextResponse.json({ error: 'No tenés invitaciones disponibles este mes' }, { status: 403 })
  }

  const client = sb()
  const { error: updErr } = await client.from('artists').update(update).eq('id', artist.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  const token = randomUUID()
  const { error: insErr } = await client.from('artist_invites').insert({
    token, created_by_artist_id: artist.id,
  })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'}/?invite=${token}` })
}
