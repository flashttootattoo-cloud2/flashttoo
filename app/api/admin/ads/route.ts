import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await sb().from('ads').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ ads: data || [] })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const photo = form.get('photo') as File
  const title = form.get('title') as string
  const link  = form.get('link')  as string
  const city  = (form.get('city') as string)?.trim() || null

  // Subir imagen
  const ext  = photo.name.split('.').pop() || 'jpg'
  const path = `ads/${Date.now()}.${ext}`
  const { error: upErr } = await sb().storage.from('artist-photos').upload(path, photo, { contentType: photo.type })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: urlData } = sb().storage.from('artist-photos').getPublicUrl(path)

  const { data, error } = await sb().from('ads').insert({ title, link, city, image_url: urlData.publicUrl }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ad: data })
}
