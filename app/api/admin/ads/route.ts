import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile } from '@/lib/storage'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}
function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
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
  const title     = (form.get('title') as string)?.trim()
  const city      = (form.get('city') as string)?.trim() || null
  const country   = (form.get('country') as string)?.trim() || null
  const instagram = (form.get('instagram') as string)?.trim() || null
  const whatsapp  = (form.get('whatsapp') as string)?.trim() || null
  const website   = (form.get('website') as string)?.trim() || null
  const link       = (form.get('link') as string)?.trim() || null
  const expiresRaw = (form.get('expires_at') as string)?.trim() || null
  const expires_at = expiresRaw ? new Date(expiresRaw).toISOString() : null

  if (!city || !country) {
    return NextResponse.json({ error: 'Ciudad y país son obligatorios' }, { status: 400 })
  }

  const ext  = photo.name.split('.').pop() || 'jpg'
  const path = `ads/${Date.now()}.${ext}`
  let image_url: string
  try {
    image_url = await uploadFile(photo, path)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload error' }, { status: 500 })
  }
  const edit_key = genKey()

  const { data, error } = await sb().from('ads').insert({
    title, link, city, country, instagram, whatsapp, website, expires_at,
    image_url, edit_key,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ad: data })
}
