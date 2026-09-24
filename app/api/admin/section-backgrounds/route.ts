import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile, deleteFile } from '@/lib/storage'
import { SECTION_BG_KEYS, DEFAULT_DIM, type SectionBg, type SectionBgs, type SectionBgKey } from '@/lib/sectionBg'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function auth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

const KEY = 'section_backgrounds'

async function getBgs(client: ReturnType<typeof sb>): Promise<SectionBgs> {
  const { data } = await client.from('settings').select('value').eq('key', KEY).single()
  return data?.value && typeof data.value === 'object' ? (data.value as SectionBgs) : {}
}

async function saveBgs(client: ReturnType<typeof sb>, bgs: SectionBgs) {
  await client.from('settings').upsert({ key: KEY, value: bgs }, { onConflict: 'key' })
}

function isSection(s: unknown): s is SectionBgKey {
  return typeof s === 'string' && (SECTION_BG_KEYS as string[]).includes(s)
}

function clampDim(v: unknown, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(0.97, Math.max(0, n)) : fallback
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ backgrounds: await getBgs(sb()) })
}

// Sube (o reemplaza) la imagen de una sección; conserva oscurecimiento y modo si ya tenía
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const section = form.get('section')
  const file = form.get('image') as File | null
  if (!isSection(section)) return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })
  if (!file?.size) return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })

  const client = sb()
  const bgs = await getBgs(client)
  const prev = bgs[section]
  const ext = file.name.split('.').pop() || 'jpg'
  const url = await uploadFile(file, `section-bg/${section}-${Date.now()}.${ext}`)
  const next: SectionBg = { url, dim: prev?.dim ?? DEFAULT_DIM, mode: prev?.mode ?? 'cover', bytes: file.size }
  const updated = { ...bgs, [section]: next }
  await saveBgs(client, updated)
  if (prev?.url) deleteFile(prev.url).catch(() => {})
  return NextResponse.json({ backgrounds: updated })
}

// Cambia oscurecimiento y/o modo sin tocar la imagen
export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const section: unknown = body.section
  if (!isSection(section)) return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })
  const client = sb()
  const bgs = await getBgs(client)
  const cur = bgs[section]
  if (!cur) return NextResponse.json({ error: 'Esa sección no tiene imagen' }, { status: 400 })
  const next: SectionBg = {
    ...cur,
    dim: body.dim !== undefined ? clampDim(body.dim, cur.dim) : cur.dim,
    mode: body.mode === 'tile' || body.mode === 'cover' ? body.mode : cur.mode,
  }
  const updated = { ...bgs, [section]: next }
  await saveBgs(client, updated)
  return NextResponse.json({ backgrounds: updated })
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const section: unknown = body.section
  if (!isSection(section)) return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })
  const client = sb()
  const bgs = await getBgs(client)
  const prev = bgs[section]
  const rest: SectionBgs = { ...bgs }
  delete rest[section]
  await saveBgs(client, rest)
  if (prev?.url) deleteFile(prev.url).catch(() => {})
  return NextResponse.json({ backgrounds: rest })
}
