import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, deleteFile } from '@/lib/storage'

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

// Limpieza de fotos que se subieron para un post de comunidad que después no
// se llegó a publicar (ej. falló el POST) — restringido a esa carpeta para no
// convertir esto en un borrador genérico de cualquier archivo por URL.
export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json().catch(() => ({}))
    if (!url || typeof url !== 'string' || !url.includes('/community/')) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }
    await deleteFile(url)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Delete error' }, { status: 500 })
  }
}
