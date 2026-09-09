import { NextRequest, NextResponse } from 'next/server'
import { getPresignedUploadUrl } from '@/lib/storage'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { path, contentType } = await req.json() as { path: string; contentType: string }
  if (!path || !contentType) return NextResponse.json({ error: 'path y contentType requeridos' }, { status: 400 })

  const result = await getPresignedUploadUrl(path, contentType)
  return NextResponse.json(result)
}
