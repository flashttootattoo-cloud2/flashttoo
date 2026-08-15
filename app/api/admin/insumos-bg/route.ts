import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile, deleteFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

const KEY = 'insumos_bg_images'

async function getUrls(client: ReturnType<typeof sb>): Promise<string[]> {
  const { data } = await client.from('settings').select('value').eq('key', KEY).single()
  return Array.isArray(data?.value) ? (data.value as string[]) : []
}

async function saveUrls(client: ReturnType<typeof sb>, urls: string[]) {
  await client.from('settings').upsert({ key: KEY, value: urls }, { onConflict: 'key' })
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const client = sb()
  const urls = await getUrls(client)
  return NextResponse.json({ urls })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('image') as File | null
  if (!file?.size) return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })
  const ext = file.name.split('.').pop() || 'jpg'
  const url = await uploadFile(file, `insumos-bg/bg-${Date.now()}.${ext}`)
  const client = sb()
  const urls = await getUrls(client)
  await saveUrls(client, [...urls, url])
  return NextResponse.json({ url, urls: [...urls, url] })
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })
  const client = sb()
  const urls = await getUrls(client)
  const next = urls.filter(u => u !== url)
  await saveUrls(client, next)
  deleteFile(url).catch(() => {})
  return NextResponse.json({ urls: next })
}
