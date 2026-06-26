'use client'

import { useEffect, useRef, useState } from 'react'

type Sponsor = { id: string; name: string; logo_url: string; link: string | null; country: string | null; keep_color: boolean | null }

function norm(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export default function SponsorsBanner({ country }: { country?: string }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [expanded, setExpanded] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLDivElement>(null)
  const posRef   = useRef(0)
  const loopRef  = useRef(0)
  const dragRef  = useRef({ on: false, startX: 0, startPos: 0, moved: false })

  useEffect(() => {
    fetch('/api/sponsors')
      .then(r => r.json())
      .then(d => {
        if (!d.sponsors?.length) return
        const all = d.sponsors as Sponsor[]
        const filtered = country
          ? all.filter(s => !s.country || norm(s.country).includes(norm(country)))
          : all
        if (!filtered.length) return
        setSponsors([...filtered].sort(() => Math.random() - 0.5))
      })
      .catch(() => {})
  }, [country])

  useEffect(() => {
    if (!sponsors.length) return
    let rafId: number
    let ready = false
    const tick = () => {
      if (!ready) {
        loopRef.current = firstRef.current?.getBoundingClientRect().width ?? 0
        if (loopRef.current > 0) {
          posRef.current = Math.random() * loopRef.current
          ready = true
        }
      }
      if (ready && !dragRef.current.on) {
        posRef.current = (posRef.current + 0.2) % loopRef.current
        if (trackRef.current) trackRef.current.style.transform = `translateX(-${posRef.current}px)`
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [sponsors])

  // Bloquear scroll del body cuando el overlay está abierto
  useEffect(() => {
    document.body.style.overflow = expanded ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [expanded])

  const startDrag = (clientX: number) => {
    dragRef.current = { on: true, startX: clientX, startPos: posRef.current, moved: false }
  }
  const moveDrag = (clientX: number) => {
    if (!dragRef.current.on || loopRef.current <= 0) return
    const dx = clientX - dragRef.current.startX
    if (Math.abs(dx) > 5) dragRef.current.moved = true
    posRef.current = ((dragRef.current.startPos - dx) % loopRef.current + loopRef.current) % loopRef.current
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${posRef.current}px)`
  }
  const endDrag = () => { dragRef.current.on = false }

  if (!sponsors.length) return null

  return (
    <>
      {/* Overlay pantalla completa */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: '#efff42',
          transform: expanded ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '24px 20px 40px' }}>
          {/* Cabecera */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Sponsors
            </p>
            <button
              onClick={() => setExpanded(false)}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.08)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 18, color: '#000',
              }}>
              ✕
            </button>
          </div>

          {/* Grilla de logos */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '24px 16px',
          }}>
            {sponsors.map(s => {
              const inner = (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.logo_url}
                  alt={s.name ?? ''}
                  draggable={false}
                  style={{ maxHeight: 28, maxWidth: '100%', objectFit: 'contain', filter: s.keep_color ? 'none' : 'brightness(0)' }}
                />
              )
              const cell = (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48 }}>
                  {inner}
                </div>
              )
              if (s.link) {
                return (
                  <a key={s.id} href={s.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    {cell}
                  </a>
                )
              }
              return <div key={s.id}>{cell}</div>
            })}
          </div>
        </div>
      </div>

      {/* Banner fijo */}
      <div
        onTouchStart={e => startDrag(e.touches[0].clientX)}
        onTouchMove={e => moveDrag(e.touches[0].clientX)}
        onTouchEnd={endDrag}
        onMouseDown={e => startDrag(e.clientX)}
        onMouseMove={e => moveDrag(e.clientX)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          padding: '0 20px',
          userSelect: 'none',
          touchAction: 'pan-x',
          cursor: 'grab',
        }}>
        <div style={{
          maxWidth: '80rem',
          margin: '0 auto',
          background: '#efff42',
          borderRadius: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingRight: 8,
        }}>
          {/* Track con logos */}
          <div style={{ flex: 1, overflow: 'hidden', padding: '8px 0' }}>
            <div ref={trackRef} style={{ display: 'flex', willChange: 'transform' }}>
              <div ref={firstRef} style={{ display: 'flex', gap: 40, paddingRight: 40, flexShrink: 0 }}>
                {sponsors.map(s => <Logo key={s.id} s={s} dragRef={dragRef} />)}
              </div>
              {Array.from({ length: 3 }, (_, ci) => (
                <div key={ci} style={{ display: 'flex', gap: 40, paddingRight: 40, flexShrink: 0 }}>
                  {sponsors.map(s => <Logo key={`${ci}-${s.id}`} s={s} dragRef={dragRef} />)}
                </div>
              ))}
            </div>
          </div>

          {/* Botón expandir */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setExpanded(true) }}
            style={{
              flexShrink: 0,
              width: 20, height: 20,
              borderRadius: '50%',
              background: '#000',
              border: 'none',
              cursor: 'pointer',
            }}></button>
        </div>
      </div>
    </>
  )
}

function Logo({ s, dragRef }: { s: Sponsor; dragRef: React.RefObject<{ moved: boolean }> }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={s.logo_url}
      alt={s.name ?? ''}
      draggable={false}
      style={{ height: 20, maxWidth: 90, objectFit: 'contain', filter: s.keep_color ? 'none' : 'brightness(0)', display: 'block' }}
    />
  )
  if (s.link) {
    return (
      <a href={s.link} target="_blank" rel="noopener noreferrer"
        style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}
        onClick={e => { if (dragRef.current?.moved) e.preventDefault() }}>
        {img}
      </a>
    )
  }
  return <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{img}</span>
}
