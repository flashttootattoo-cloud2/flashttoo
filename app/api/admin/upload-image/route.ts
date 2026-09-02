import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/storage'

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file?.size) return NextResponse.json({ error: 'No file' }, { status: 400 })
  const ext = file.name.split('.').pop() || 'jpg'
  const url = await uploadFile(file, `phrases/content-${Date.now()}.${ext}`)
  return NextResponse.json({ url })
}
