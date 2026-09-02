import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await sb()
    .from('phrases')
    .select('id, image_url, description, language_code, created_at, tags')
    .eq('id', id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: commenters } = await sb()
    .from('phrase_comments')
    .select('id, guest_emoji, artist_id')
    .eq('phrase_id', id)
    .order('created_at', { ascending: false })
    .limit(3)
  return NextResponse.json({ phrase: { ...data, recent_commenters: (commenters ?? []).map(c => ({ id: c.id, emoji: c.guest_emoji, photo_url: null })), comment_count: commenters?.length ?? 0 } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const k of ['description', 'language_code', 'active', 'tags']) if (k in body) patch[k] = body[k]
  const { data, error } = await sb().from('phrases').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ phrase: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { data: phrase } = await sb().from('phrases').select('image_url').eq('id', id).single()
  await sb().from('phrases').delete().eq('id', id)
  if (phrase?.image_url) await deleteFile(phrase.image_url).catch(() => {})
  return NextResponse.json({ ok: true })
}
