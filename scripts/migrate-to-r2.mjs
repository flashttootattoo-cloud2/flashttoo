// Script de migración: mueve fotos de Supabase Storage a Cloudflare R2
// Uso: node scripts/migrate-to-r2.mjs
// Requiere que .env.local esté en la raíz del proyecto

import { readFileSync } from 'fs'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Cargar .env.local manualmente
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dir, '..', '.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  const k = trimmed.slice(0, idx).trim()
  let v = trimmed.slice(idx + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  process.env[k] = v
}

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ACCOUNT_ID   = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const R2_ACCESS_KEY   = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const R2_SECRET       = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const R2_BUCKET       = process.env.CLOUDFLARE_R2_BUCKET
const R2_PUBLIC_URL   = process.env.CLOUDFLARE_R2_PUBLIC_URL

if (!SUPABASE_URL || !SERVICE_KEY || !R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET || !R2_BUCKET || !R2_PUBLIC_URL) {
  console.error('Faltan variables de entorno. Revisá .env.local')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY)
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET },
})

function isSupabaseUrl(url) {
  return url && url.includes('supabase.co') && url.includes('/storage/')
}

function keyFromSupabaseUrl(url) {
  // Convierte la URL de Supabase al path relativo para usarlo como key en R2
  const match = url.match(/\/storage\/v1\/object\/public\/artist-photos\/(.+)/)
  if (match) return `artist-photos/${match[1]}`
  const matchSponsors = url.match(/\/storage\/v1\/object\/public\/sponsors-v2\/(.+)/)
  if (matchSponsors) return `sponsors-v2/${matchSponsors[1]}`
  return null
}

async function migrateUrl(url) {
  if (!isSupabaseUrl(url)) return url // ya es R2 u otro, no migrar

  const key = keyFromSupabaseUrl(url)
  if (!key) { console.log(`  ⚠ No se pudo extraer path de: ${url}`); return url }

  // Descargar desde Supabase
  const res = await fetch(url)
  if (!res.ok) { console.log(`  ⚠ Error descargando ${url}: ${res.status}`); return url }

  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') || 'image/jpeg'

  // Subir a R2
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))

  const newUrl = `${R2_PUBLIC_URL}/${key}`
  console.log(`  ✓ ${key}`)
  return newUrl
}

async function main() {
  console.log('=== Migración Supabase → R2 ===\n')

  // --- Artistas ---
  console.log('Cargando artistas...')
  const { data: artists } = await sb.from('artists')
    .select('id, photo_url, gallery_photo_1, gallery_photo_2, gallery_photo_3')

  let artistCount = 0
  for (const a of artists ?? []) {
    const updates = {}
    const fields = ['photo_url', 'gallery_photo_1', 'gallery_photo_2', 'gallery_photo_3']
    let changed = false

    for (const field of fields) {
      if (!a[field] || !isSupabaseUrl(a[field])) continue
      console.log(`Artista ${a.id} · ${field}`)
      const newUrl = await migrateUrl(a[field])
      if (newUrl !== a[field]) { updates[field] = newUrl; changed = true }
    }

    if (changed) {
      await sb.from('artists').update(updates).eq('id', a.id)
      artistCount++
    }
  }
  console.log(`\nArtistas migrados: ${artistCount}\n`)

  // --- Sponsors V2 ---
  console.log('Cargando sponsors...')
  const { data: sponsors } = await sb.from('sponsors_v2')
    .select('id, logo_url, bg_image_url, detail_logo_url')

  let sponsorCount = 0
  for (const s of sponsors ?? []) {
    const updates = {}
    const fields = ['logo_url', 'bg_image_url', 'detail_logo_url']
    let changed = false

    for (const field of fields) {
      if (!s[field] || !isSupabaseUrl(s[field])) continue
      console.log(`Sponsor ${s.id} · ${field}`)
      const newUrl = await migrateUrl(s[field])
      if (newUrl !== s[field]) { updates[field] = newUrl; changed = true }
    }

    if (changed) {
      await sb.from('sponsors_v2').update(updates).eq('id', s.id)
      sponsorCount++
    }
  }
  console.log(`\nSponsors migrados: ${sponsorCount}\n`)

  console.log('=== Migración completa ===')
  console.log('Las URLs en la DB ahora apuntan a R2.')
  console.log('Podés borrar el bucket artist-photos de Supabase Storage cuando quieras.')
}

main().catch(err => { console.error(err); process.exit(1) })
