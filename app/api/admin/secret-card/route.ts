import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile } from '@/lib/storage'

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const fd = await req.formData()
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const image = fd.get('image') as File | null
  let image_url: string | null = (fd.get('current_image_url') as string | null) || null

  if (image && image.size > 0) {
    const ext = image.name.split('.').pop() || 'jpg'
    const filename = `${crypto.randomUUID()}.${ext}`
    image_url = await uploadFile(image, `secret-card/${filename}`)
  }

  const value = {
    active: fd.get('active') === 'true',
    image_url,
    artist_name: (fd.get('artist_name') as string | null)?.trim() || '',
    city: (fd.get('city') as string | null)?.trim() || '',
    link: (fd.get('link') as string | null)?.trim() || '',
    caption: (fd.get('caption') as string | null)?.trim() || '',
  }

  await sb.from('settings').upsert({ key: 'secret_card', value }, { onConflict: 'key' })
  return NextResponse.json({ ok: true, card: value })
}
