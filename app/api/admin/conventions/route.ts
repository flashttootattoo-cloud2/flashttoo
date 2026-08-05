import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile } from '@/lib/storage'

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('conventions').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ conventions: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const fd = await req.formData()
  const image = fd.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })

  const ext = image.name.split('.').pop() || 'jpg'
  const filename = `${crypto.randomUUID()}.${ext}`
  const image_url = await uploadFile(image, `conventions/${filename}`)

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const expiresAt = (fd.get('expires_at') as string | null)?.trim()
  const { data, error } = await sb.from('conventions').insert({
    name: (fd.get('name') as string | null)?.trim() || null,
    image_url,
    link: (fd.get('link') as string | null)?.trim() || null,
    country: (fd.get('country') as string | null)?.trim() || null,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    active: true,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ convention: data })
}
