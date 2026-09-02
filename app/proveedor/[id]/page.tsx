import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data } = await sb().from('sponsors_v2').select('name, logo_url').eq('id', id).single()
  if (!data) return { title: 'Flashttoo' }
  const title = `${data.name} — Flashttoo`
  return {
    title,
    openGraph: {
      title,
      siteName: 'Flashttoo',
      images: data.logo_url ? [{ url: data.logo_url }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: data.logo_url ? [data.logo_url] : [],
    },
  }
}

export default async function ProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script dangerouslySetInnerHTML={{ __html: `history.replaceState(null,'','/');window.location.href='/?insumo=${id}'` }} />
      <style>{`body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}`}</style>
      <noscript><meta httpEquiv="refresh" content={`0; url=/?insumo=${id}`} /></noscript>
      <a href={`/?insumo=${id}`} style={{ color: '#efff42', fontSize: 14 }}>Ir a Flashttoo →</a>
    </>
  )
}
