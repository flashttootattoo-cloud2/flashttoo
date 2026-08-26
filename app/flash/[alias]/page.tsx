'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

type Design = { id: string; photo_url: string; medidas: string | null; position: number }
type ArtistInfo = {
  id: string; name: string; photo_url: string | null
  city: string | null; country: string | null
  flashbook_alias: string; flashbook_whatsapp: string | null
  gallery_photo_1?: string | null
  gallery_photo_2?: string | null
  gallery_photo_3?: string | null
}

const SWIPE_THRESHOLD = 55
const GAP = 14

export default function FlashbookPage() {
  const { alias } = useParams<{ alias: string }>()
  const [artist, setArtist]   = useState<ArtistInfo | null>(null)
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [idx, setIdx]           = useState(0)
  const [dragX, setDragX]       = useState(0)
  const [dragging, setDragging] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const heroRef    = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(360)
  const [bgIdx, setBgIdx] = useState(0)
  const startX     = useRef(0)
  const isDragging = useRef(false)
  const wasDrag    = useRef(false)

  useEffect(() => {
    fetch(`/api/flash/${alias}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setArtist(d.artist); setDesigns(d.designs) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [alias])

  useEffect(() => {
    if (heroRef.current) setContainerW(heroRef.current.offsetWidth)
  }, [artist])

  // Fondo rotativo con fotos de galería
  useEffect(() => {
    if (!artist) return
    const bgPhotos = [artist.gallery_photo_1, artist.gallery_photo_2, artist.gallery_photo_3].filter(Boolean)
    if (bgPhotos.length <= 1) return
    const iv = setInterval(() => setBgIdx(prev => (prev + 1) % bgPhotos.length), 30000)
    return () => clearInterval(iv)
  }, [artist])

  // Peek layout values
  const cardW     = Math.min(Math.round(containerW * 0.86), 340)
  const cardH     = Math.round(cardW * 4 / 3)
  const sideOff   = (containerW - cardW) / 2
  const trackX    = -(idx * (cardW + GAP)) + dragX
  const dotsTopPx = 18 + Math.round(cardH / 2) + 18

  function advance(dir: 'left' | 'right') {
    setIdx(prev => dir === 'left'
      ? (prev + 1) % designs.length
      : (prev - 1 + designs.length) % designs.length)
    setDragX(0)
  }

  function onStart(x: number) {
    startX.current = x; wasDrag.current = false
    isDragging.current = true; setDragging(true)
  }
  function onMove(x: number) {
    if (!isDragging.current) return
    const dx = x - startX.current
    if (Math.abs(dx) >= 8) wasDrag.current = true
    setDragX(dx)
  }
  function onEnd() {
    if (!isDragging.current) return
    isDragging.current = false; setDragging(false)
    if (!wasDrag.current) { setDragX(0); return }
    if (designs.length <= 1) { setDragX(0); return }
    if (dragX < -SWIPE_THRESHOLD) advance('left')
    else if (dragX > SWIPE_THRESHOLD) advance('right')
    else setDragX(0)
  }

  if (loading) return (
    <main style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#efff42', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes bgFade { from { opacity:0 } to { opacity:1 } }`}</style>
    </main>
  )

  if (notFound || !artist) return (
    <main style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="30" fill="#efff42" />
        <circle cx="22" cy="26" r="3.5" fill="#000" />
        <circle cx="42" cy="26" r="3.5" fill="#000" />
        <path d="M20 44 Q32 34 44 44" stroke="#000" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, textAlign: 'center' }}>Este Flashbook no existe</p>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>El link puede haber cambiado.<br />Pedíselo al tatuador.</p>
      <a href="/" style={{ color: '#efff42', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>Ir a Flashttoo →</a>
      <div style={{ position: 'absolute', bottom: 28, display: 'flex', justifyContent: 'center', width: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 22, opacity: 0.25 }} />
      </div>
    </main>
  )

  const location = [artist.city, artist.country].filter(Boolean).join(', ')
  const total    = designs.length
  const cur      = designs[idx]

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

      {/* ── HERO ── */}
      <div
        ref={heroRef}
        onMouseDown={e => onStart(e.clientX)}
        onMouseMove={e => onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={e => onStart(e.touches[0].clientX)}
        onTouchMove={e => { e.preventDefault(); onMove(e.touches[0].clientX) }}
        onTouchEnd={onEnd}
        style={{ position: 'relative', width: '100%', maxWidth: 540, margin: '0 auto', minHeight: '100vh', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'default', userSelect: 'none' }}>

        {/* Fondos rotativos — fotos de galería */}
        {(() => {
          const bgPhotos = [artist.gallery_photo_1, artist.gallery_photo_2, artist.gallery_photo_3].filter(Boolean) as string[]
          const bg = bgPhotos.length > 0 ? bgPhotos[bgIdx % bgPhotos.length] : artist.photo_url
          return bg ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={bg} src={bg} alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', pointerEvents: 'none', animation: 'bgFade 2.5s ease' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: '#111' }} />
          )
        })()}

        {/* Overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.28)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 42%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 48%)', pointerEvents: 'none' }} />

        {/* Logo + × — fila superior */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 18px 0' }}>
          <a href="/" style={{ pointerEvents: 'auto' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 20, opacity: 0.5 }} />
          </a>
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = '/')}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto' }}>
            ×
          </button>
        </div>

        {/* Flashbook + nombre + ciudad */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 56, pointerEvents: 'none' }}>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#efff42', letterSpacing: '-0.01em', lineHeight: 1 }}>Flashbook</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>{artist.name}</p>
          {location && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{location}</p>}
        </div>

        {/* ── PEEK TRACK ── */}
        {total === 0 ? (
          <p style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, zIndex: 10, pointerEvents: 'none' }}>Próximamente</p>
        ) : (
          <>
            {/* Cartas */}
            <div style={{
              position: 'absolute',
              left: sideOff,
              top: `calc(50% + 18px)`,
              transform: `translateY(-50%) translateX(${trackX}px)`,
              transition: dragging ? 'none' : 'transform 0.38s cubic-bezier(0.22,1,0.36,1)',
              display: 'flex',
              gap: GAP,
              alignItems: 'center',
              zIndex: 10,
              willChange: 'transform',
            }}>
              {designs.map((d, i) => {
                const isActive = i === idx
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      if (wasDrag.current) return
                      if (i === idx) setExpanded(true)
                      else setIdx(i)
                    }}
                    style={{
                      width: cardW,
                      height: cardH,
                      flexShrink: 0,
                      borderRadius: 20,
                      overflow: 'hidden',
                      position: 'relative',
                      transform: isActive ? 'scale(1)' : 'scale(0.87)',
                      opacity: isActive ? 1 : 0.4,
                      filter: isActive ? 'none' : 'blur(1.5px)',
                      transition: dragging ? 'none' : 'transform 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.38s, filter 0.38s',
                      boxShadow: isActive ? '0 24px 64px rgba(0,0,0,0.85)' : '0 6px 18px rgba(0,0,0,0.5)',
                      cursor: 'pointer',
                    }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                    {/* Número + medidas */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)', padding: '28px 16px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>#{i + 1}</p>
                      {d.medidas && <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{d.medidas}</p>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dots + hint */}
            {total > 1 && (
              <div style={{ position: 'absolute', top: `calc(50% + ${dotsTopPx}px)`, left: 0, right: 0, zIndex: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {designs.map((_, i) => (
                    <div key={i} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, background: i === idx ? '#efff42' : 'rgba(255,255,255,0.3)', transition: 'all 0.25s' }} />
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>deslizá para ver más · tocá para ampliar</p>
              </div>
            )}
          </>
        )}

        {/* Reservar — fijado abajo */}
        {total > 0 && artist.flashbook_whatsapp && cur && (
          <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', pointerEvents: 'none' }}>{total} diseño{total !== 1 ? 's' : ''} disponible{total !== 1 ? 's' : ''}</p>
            <a
              href={`https://wa.me/${artist.flashbook_whatsapp}?text=${encodeURIComponent(`Hola ${artist.name}! Me interesa reservar el diseño #${idx + 1} de tu Flashbook.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => { if (wasDrag.current) e.preventDefault() }}
              style={{ padding: '13px 40px', background: '#efff42', borderRadius: 12, color: '#000', fontSize: 14, fontWeight: 800, textDecoration: 'none', display: 'inline-block' }}>
              Pedir reserva del #{idx + 1}
            </a>
          </div>
        )}
      </div>

      {/* Modal fullscreen */}
      {expanded && cur && (
        <div
          onClick={() => setExpanded(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.photo_url} alt="" style={{ maxWidth: '100%', maxHeight: '88vh', objectFit: 'contain', borderRadius: 16, display: 'block' }} />
          {cur.medidas && <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 16 }}>{cur.medidas}</p>}
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 }}>Tocá para cerrar</p>
          <button onClick={() => setExpanded(false)}
            style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes bgFade { from { opacity:0 } to { opacity:1 } }`}</style>
    </main>
  )
}
