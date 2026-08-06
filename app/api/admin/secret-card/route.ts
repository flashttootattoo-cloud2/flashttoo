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
    image_url = await uploadFile(image, `secret-card/${crypto.randomUUID()}.${ext}`)
  }

  const backImage = fd.get('back_image') as File | null
  let back_image_url: string | null = (fd.get('current_back_image_url') as string | null) || null
  if (backImage && backImage.size > 0) {
    const ext = backImage.name.split('.').pop() || 'jpg'
    back_image_url = await uploadFile(backImage, `secret-card/${crypto.randomUUID()}.${ext}`)
  }

  const value = {
    active: fd.get('active') === 'true',
    image_url,
    back_image_url,
    artist_name: (fd.get('artist_name') as string | null)?.trim() || '',
    city: (fd.get('city') as string | null)?.trim() || '',
    link: (fd.get('link') as string | null)?.trim() || '',
    caption: (fd.get('caption') as string | null)?.trim() || '',
    number: (fd.get('number') as string | null)?.trim() || '',
  }

  await sb.from('settings').upsert({ key: 'secret_card', value }, { onConflict: 'key' })
  return NextResponse.json({ ok: true, card: value })
}
