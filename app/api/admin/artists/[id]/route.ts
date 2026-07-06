import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteFile } from '@/lib/storage'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if ('visible'   in body) updates.visible  = body.visible
  if ('status'   in body) updates.status   = body.status
  if ('edit_key' in body) updates.edit_key = String(body.edit_key).trim().toUpperCase()
  const { error } = await getAdminClient().from('artists').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const sb = getAdminClient()

  const { data: artist } = await sb.from('artists').select('photo_url').eq('id', id).single()
  if (artist?.photo_url) deleteFile(artist.photo_url).catch(() => {})

  await sb.from('artists').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
