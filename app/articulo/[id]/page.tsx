import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
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
  const { data } = await sb().from('phrases').select('image_url, description').eq('id', id).single()
  if (!data) return { title: 'Flashttoo' }
  const title = extractTitle(data.description)
  const ogTitle = `${title} — Flashttoo`
  const description = extractDescription(data.description)
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flashttoo.com'}/articulo/${id}`
  return {
    title: ogTitle,
    description,
    openGraph: {
      title: ogTitle,
      description,
      url,
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
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script dangerouslySetInnerHTML={{ __html: `history.replaceState(null,'','/');window.location.href='/?frase=${id}'` }} />
      <style>{`body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}`}</style>
      <noscript><meta httpEquiv="refresh" content={`0; url=/?frase=${id}`} /></noscript>
      <a href={`/?frase=${id}`} style={{ color: '#efff42', fontSize: 14 }}>Ir a Flashttoo →</a>
    </>
  )
}
