import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { renderPhraseContent } from '@/components/PhraseContent'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function extractTitle(description: string | null): string {
  if (!description) return 'Cultura'
  const line = description.split('\n').find(l => l.startsWith('# '))
  return line ? line.slice(2).trim() : 'Cultura'
}

function readingTime(text: string): number {
  const stripped = text.replace(/^\[img:[^\]]+\]/gm, '').replace(/^#+\s*/gm, '')
  const words = stripped.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 180))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data } = await sb()
    .from('phrases')
    .select('description, image_url')
    .eq('slug', slug)
    .single()
  const title = extractTitle(data?.description ?? null)
  const desc = (data?.description ?? '').replace(/^[#>[\-*!].*/gm, '').replace(/\s+/g, ' ').trim().slice(0, 160)
  return {
    title: `${title} — Flashttoo Cultura`,
    description: desc,
    openGraph: {
      title: `${title} — Flashttoo`,
      description: desc,
      images: data?.image_url ? [{ url: data.image_url }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — Flashttoo`,
      description: desc,
      images: data?.image_url ? [data.image_url] : [],
    },
  }
}

export default async function CulturaArticlePage({ params }: Props) {
  const { slug } = await params
  const { data: phrase } = await sb()
    .from('phrases')
    .select('id, image_url, description, language_code, created_at, tags')
    .eq('slug', slug)
    .single()

  if (!phrase) notFound()

  const title = extractTitle(phrase.description)
  const mins = readingTime(phrase.description ?? '')
  const date = formatDate(phrase.created_at)
  const tags: string[] = phrase.tags ?? []

  // Strip first # heading from body since it's shown as the article title
  const bodyLines = (phrase.description ?? '').split('\n')
  const firstTitleIdx = bodyLines.findIndex((l: string) => l.startsWith('# '))
  const bodyText = firstTitleIdx !== -1
    ? bodyLines.filter((_: string, i: number) => i !== firstTitleIdx).join('\n')
    : phrase.description ?? ''

  return (
    <div style={{ minHeight: '100dvh', background: '#090909', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0 }
        body { background: #090909 }
        @media (max-width: 600px) { .article-title { font-size: 24px !important } }
      `}</style>

      {/* Nav */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 22 }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#efff42', background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', padding: '4px 10px', borderRadius: 6 }}>
            Cultura
          </span>
        </div>
      </div>

      {/* Cover image */}
      {phrase.image_url && (
        <div style={{ position: 'relative', width: '100%', maxWidth: 680, margin: '0 auto', paddingTop: 'min(66.5%, 440px)', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={phrase.image_url}
            alt={title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, #090909 100%)' }} />
        </div>
      )}

      {/* Article body */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Yellow accent bar */}
        <div style={{ height: 3, background: '#efff42', borderRadius: 2, marginTop: phrase.image_url ? 0 : 32, marginBottom: 24 }} />

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {tags.map(tag => (
              <span key={tag} style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '4px 10px', borderRadius: 6,
                background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', color: '#efff42',
              }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="article-title" style={{
          fontSize: 28, fontWeight: 800, color: '#f4f4f5', lineHeight: 1.2,
          letterSpacing: '-0.02em', marginBottom: 12,
        }}>
          {title}
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{date}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{mins} min de lectura</span>
        </div>

        {/* Body */}
        <div style={{ color: '#e4e4e7' }}>
          {renderPhraseContent(bodyText)}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '48px 0 32px' }} />

        {/* Footer CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            flashttoo.com — el buscador de tatuadores
          </p>
          <a
            href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', background: '#efff42', color: '#000',
              borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: 'none',
            }}
          >
            ← Explorar tatuadores
          </a>
        </div>
      </div>
    </div>
  )
}
