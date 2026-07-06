import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const fd   = await req.formData()
    const file = fd.get('file') as File | null
    const path = fd.get('path') as string | null
    if (!file || !path) return NextResponse.json({ error: 'Missing file or path' }, { status: 400 })
    const url = await uploadFile(file, path)
    return NextResponse.json({ url })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload error' }, { status: 500 })
  }
}
