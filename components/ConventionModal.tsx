'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

type Convention = { id: string; name: string | null; image_url: string; link: string | null }
type FlashDay   = { id: string; studio_slug: string; studio_name: string; flyer_url: string; date: string }
type Item =
  | { kind: 'conv';  data: Convention }
  | { kind: 'flash'; data: FlashDay }

export default function ConventionModal({ conventions, flashDays = [], onOpenStudio }: {
  conventions: Convention[]
  flashDays?: FlashDay[]
  onOpenStudio?: (slug: string) => void
}) {
  const { t, language } = useTranslation()
  const [visible, setVisible] = useState(false)
  const item = useRef<Item | null>(null)

  useEffect(() => {
    const pool: Item[] = [
      ...conventions.map(c => ({ kind: 'conv'  as const, data: c })),
      ...flashDays.map(f =>   ({ kind: 'flash' as const, data: f })),
    ]
    if (!pool.length) return
    try { if (sessionStorage.getItem('conv_closed')) return } catch {}
    const picked = pool[Math.floor(Math.random() * pool.length)]
    item.current = picked
    const src = picked.kind === 'conv' ? picked.data.image_url : picked.data.flyer_url
    const img = new window.Image()
    img.onload = () => setVisible(true)
    img.onerror = () => setVisible(true)
    img.src = src
  }, [conventions, flashDays])

  const dismiss = () => {
    setVisible(false)
    try { sessionStorage.setItem('conv_closed', '1') } catch {}
  }

  if (!visible || !item.current) return null
  const it = item.current

  const imageSrc  = it.kind === 'conv' ? it.data.image_url : it.data.flyer_url
  const imageAlt  = it.kind === 'conv' ? (it.data.name || t('eventos', 'convention', 'Convención')) : `Flash Day ${it.data.studio_name}`

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}>
      <style>{`@keyframes convIn { from { opacity:0; transform:scale(0.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 400,
          borderRadius: 20, overflow: 'hidden',
          background: '#111',
          animation: 'convIn 0.25s ease',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={imageAlt}
          style={{ display: 'block', width: '100%', maxHeight: '65vh', objectFit: 'contain', background: '#000' }} />

        <div style={{ padding: '16px 18px 20px' }}>
          {it.kind === 'flash' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'rgba(239,255,66,0.1)', border: '1px solid rgba(239,255,66,0.25)', borderRadius: 20, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#efff42' }}>Flash Day</span>
            </div>
          )}
          {it.kind === 'conv' && it.data.name && (
            <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 14px', lineHeight: 1.25 }}>{it.data.name}</p>
          )}
          {it.kind === 'flash' && (
            <>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.25 }}>{it.data.studio_name}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 14px' }}>
                {new Date(it.data.date + 'T12:00:00').toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            {it.kind === 'conv' && it.data.link && (
              <a href={it.data.link} target="_blank" rel="noopener noreferrer"
                onClick={() => { dismiss(); fetch(`/api/conventions/${it.data.id}/click`, { method: 'POST' }).catch(() => {}) }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 18px', background: '#efff42', color: '#000', borderRadius: 20, fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
                {t('eventos', 'see_more', 'Ver más →')}
              </a>
            )}
            {it.kind === 'flash' && (
              <button onClick={() => { dismiss(); onOpenStudio?.(it.data.studio_slug) }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 18px', background: '#efff42', color: '#000', borderRadius: 12, fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                {t('eventos', 'see_studio', 'Ver estudio →')}
              </button>
            )}
            <button onClick={dismiss} style={{
              flex: (it.kind === 'conv' && it.data.link) || it.kind === 'flash' ? '0 0 auto' : 1,
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              {t('eventos', 'close', 'Cerrar')}
            </button>
          </div>
        </div>

        <button onClick={dismiss} style={{
          position: 'absolute', top: 10, right: 10,
          width: 30, height: 30, borderRadius: '50%',
          background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.8)', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>✕</button>
      </div>
    </div>
  )
}
