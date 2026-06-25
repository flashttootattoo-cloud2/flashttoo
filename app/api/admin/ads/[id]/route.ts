import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}
function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const client = sb()
  const { data: ad } = await client.from('ads').select('image_url').eq('id', id).single()
  if (ad?.image_url) {
    const path = ad.image_url.split('/artist-photos/')[1]
    if (path) await client.storage.from('artist-photos').remove([path])
  }
  await client.from('ads').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const patch: Record<string, unknown> = {}
  const allowed = ['active', 'title', 'city', 'country', 'instagram', 'whatsapp', 'website', 'link']
  for (const k of allowed) if (k in body) patch[k] = body[k]
  if (body.regen_key) patch.edit_key = genKey()

  const { data, error } = await sb().from('ads').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ad: data })
}
