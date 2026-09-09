import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
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

async function shouldUseR2(): Promise<boolean> {
  if (!process.env.CLOUDFLARE_R2_PUBLIC_URL) return false
  const { data } = await sbAdmin().from('settings').select('value').eq('key', 'storage_provider').single()
  return data?.value === 'r2'
}

export async function uploadFile(file: File, path: string): Promise<string> {
  if (await shouldUseR2()) {
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

export async function getPresignedUploadUrl(path: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket:      process.env.CLOUDFLARE_R2_BUCKET!,
    Key:         path,
    ContentType: contentType,
  })
  const uploadUrl = await getSignedUrl(r2Client(), command, { expiresIn: 300 })
  const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${path}`
  return { uploadUrl, publicUrl }
}

export async function deleteFile(url: string): Promise<void> {
  if (!url) return
  const r2Base = process.env.CLOUDFLARE_R2_PUBLIC_URL
  if (r2Base && url.startsWith(r2Base)) {
    const key = url.slice(r2Base.length + 1)
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
