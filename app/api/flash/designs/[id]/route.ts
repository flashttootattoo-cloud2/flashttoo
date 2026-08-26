import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function verifyDesign(access_token: string, design_id: string): Promise<boolean> {
  const { data: design } = await sb().from('flash_designs').select('artist_id').eq('id', design_id).single()
  if (!design) return false
  const { data: artist } = await sb().from('artists').select('user_id').eq('id', design.artist_id).single()
  if (!artist) return false
  const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error } = await sbAnon.auth.getUser(access_token)
  return !error && !!user && user.id === artist.user_id
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { access_token, medidas } = await req.json()
  if (!await verifyDesign(access_token, id)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { error } = await sb().from('flash_designs').update({ medidas: medidas || null }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { access_token } = await req.json()
  if (!await verifyDesign(access_token, id)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { data: design } = await sb().from('flash_designs').select('photo_url').eq('id', id).single()
  await sb().from('flash_designs').delete().eq('id', id)
  if (design?.photo_url) await deleteFile(design.photo_url).catch(() => {})
  return NextResponse.json({ ok: true })
}
