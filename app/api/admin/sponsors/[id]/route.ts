import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const patch: Record<string, unknown> = {}
  const allowed = ['active', 'name', 'link', 'country', 'starts_at', 'expires_at', 'keep_color']
  for (const k of allowed) if (k in body) patch[k] = body[k]
  const { data, error } = await sb().from('sponsors').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sponsor: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const client = sb()
  const { data: sp } = await client.from('sponsors').select('logo_url').eq('id', id).single()
  if (sp?.logo_url) {
    const path = sp.logo_url.split('/artist-photos/')[1]
    if (path) await client.storage.from('artist-photos').remove([path])
  }
  await client.from('sponsors').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
