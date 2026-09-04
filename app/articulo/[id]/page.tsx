import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { isUUID } from '@/lib/slug'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flashttoo.com'

async function getPhrase(idOrSlug: string) {
  if (isUUID(idOrSlug)) {
    const { data } = await sb().from('phrases').select('id, slug, image_url, description').eq('id', idOrSlug).single()
    return data
  }
  const { data } = await sb().from('phrases').select('id, slug, image_url, description').eq('slug', idOrSlug).single()
  return data
}

function extractTitle(desc: string | null): string {
  if (!desc) return 'Flashttoo'
  const h1 = desc.split('\n').find(l => l.startsWith('# '))
  return h1 ? h1.slice(2).trim() : 'Flashttoo'
}

function extractDescription(desc: string | null): string {
  if (!desc) return ''
  const line = desc.split('\n').find(l => {
    const t = l.trim()
    return t && !t.startsWith('#') && !t.startsWith('>') && !t.startsWith('---') && !t.startsWith('[img:')
  })
  if (!line) return ''
  return line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/==(.+?)==/g, '$1').slice(0, 160)
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const data = await getPhrase(id)
  if (!data) return { title: 'Flashttoo' }
  const title = extractTitle(data.description)
  const ogTitle = `${title} — Flashttoo`
  const description = extractDescription(data.description)
  const canonical = `${SITE}/articulo/${data.slug ?? data.id}`
  return {
    title: ogTitle,
    description,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      siteName: 'Flashttoo',
      images: [{ url: data.image_url, width: 1080, height: 1080, alt: title }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [data.image_url],
    },
  }
}

export default async function ArticuloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getPhrase(id)

  // Si se accedió por UUID pero tiene slug → redirect permanente a la URL amigable
  if (data?.slug && isUUID(id)) {
    redirect(`/articulo/${data.slug}`)
  }

  const phraseId = data?.id ?? id

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script dangerouslySetInnerHTML={{ __html: `history.replaceState(null,'','/');window.location.href='/?frase=${phraseId}'` }} />
      <style>{`body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}`}</style>
      <noscript><meta httpEquiv="refresh" content={`0; url=/?frase=${phraseId}`} /></noscript>
      <a href={`/?frase=${phraseId}`} style={{ color: '#efff42', fontSize: 14 }}>Ir a Flashttoo →</a>
    </>
  )
}
