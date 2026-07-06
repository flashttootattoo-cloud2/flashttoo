import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

function r2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  })
}

function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function uploadFile(file: File, path: string): Promise<string> {
  if (process.env.STORAGE_PROVIDER === 'r2') {
    const buffer = Buffer.from(await file.arrayBuffer())
    await r2Client().send(new PutObjectCommand({
      Bucket:      process.env.CLOUDFLARE_R2_BUCKET!,
      Key:         path,
      Body:        buffer,
      ContentType: file.type,
    }))
    return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${path}`
  }

  const sb = sbAdmin()
  const { error } = await sb.storage.from('artist-photos').upload(path, file, { contentType: file.type })
  if (error) throw error
  return sb.storage.from('artist-photos').getPublicUrl(path).data.publicUrl
}

export async function deleteFile(url: string): Promise<void> {
  if (!url) return
  if (process.env.STORAGE_PROVIDER === 'r2') {
    const base = process.env.CLOUDFLARE_R2_PUBLIC_URL!
    const key = url.startsWith(base) ? url.slice(base.length + 1) : null
    if (!key) return
    await r2Client().send(new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key:    key,
    }))
  } else {
    const path = url.split('/artist-photos/')[1]
    if (!path) return
    await sbAdmin().storage.from('artist-photos').remove([path])
  }
}
