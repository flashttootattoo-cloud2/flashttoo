import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/storage'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function auth(req: NextRequest) {
  if (req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD) return true
  const token = req.headers.get('x-cultura-token')
  if (!token) return false
  const { data } = await sb().from('cultura_editors').select('id').eq('session_token', token).gt('session_expires_at', new Date().toISOString()).single()
  return !!data
}

export async function POST(req: NextRequest) {
  if (!await auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file?.size) return NextResponse.json({ error: 'No file' }, { status: 400 })
  const ext = file.name.split('.').pop() || 'jpg'
  const url = await uploadFile(file, `phrases/content-${Date.now()}.${ext}`)
  return NextResponse.json({ url })
}
