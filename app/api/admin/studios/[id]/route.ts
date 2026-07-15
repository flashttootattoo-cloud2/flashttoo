import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const allowed = ['name', 'slug', 'city', 'country', 'description', 'instagram', 'whatsapp', 'website', 'visible', 'logo_url', 'expires_at']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) { if (k in body) updates[k] = body[k] }
  const { error } = await sb().from('studios').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await sb().from('studios').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
