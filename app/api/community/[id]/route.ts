import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body?.owner_id) return NextResponse.json({ error: 'owner_id requerido' }, { status: 400 })

  const { data: post } = await sb()
    .from('community_posts')
    .select('artist_id, studio_slug, sponsor_slug, type, photo_url')
    .eq('id', id)
    .single()

  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const authorized =
    (post.type === 'artist' && post.artist_id === body.owner_id) ||
    (post.type === 'studio' && post.studio_slug === body.owner_id) ||
    (post.type === 'sponsor' && post.sponsor_slug === body.owner_id)

  if (!authorized) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await sb().from('community_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // No dejar la foto huérfana en R2 cuando se borra el post que la usaba
  if (post.photo_url) deleteFile(post.photo_url).catch(() => {})

  return NextResponse.json({ ok: true })
}
