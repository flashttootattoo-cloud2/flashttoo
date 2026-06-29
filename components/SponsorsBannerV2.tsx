'use client'

import { useEffect, useRef, useState } from 'react'

type Sponsor = {
  id: string; name: string; logo_url: string; bg_image_url: string | null
  detail_logo_url: string | null; detail_logo_mode: string | null
  description: string | null; link: string | null; level: string
  city: string | null; country: string | null; keep_color: boolean | null
}

function norm(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function matchesAny(stored: string | null, target: string): boolean {
  if (!stored || !target) return false
  const targets = stored.split(',').map(v => norm(v)).filter(Boolean)
  const t = norm(target)
  return targets.some(v => v === t || t.includes(v) || v.includes(t))
}

function filterSponsors(all: Sponsor[], city?: string, country?: string): Sponsor[] {
  return all.filter(s => {
    if (s.level === 'global') return true
    if (s.level === 'country' && country) return matchesAny(s.country, country)
    if (s.level === 'city' && city) return matchesAny(s.city, city)
    return false
  })
}

export default function SponsorsBannerV2({ city, country }: { city?: string; country?: string }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const allRef        = useRef<Sponsor[]>([])
  const trackRef      = useRef<HTMLDivElement>(null)
  const firstRef      = useRef<HTMLDivElement>(null)
  const posRef        = useRef(0)
  const loopRef       = useRef(0)
  const dragRef       = useRef({ on: false, startX: 0, startPos: 0, moved: false })
  const histDepthRef  = useRef(0)  // cuántos estados pushState tiene el overlay
  const skipPopsRef   = useRef(0)  // popstate a ignorar tras history.go(-n)

  // Fetch una sola vez — mezcla aleatoria fija en este montaje
  useEffect(() => {
    setLoading(true)
    fetch('/api/sponsors-v2')
      .then(r => r.json())
      .then(d => {
        const all = (d.sponsors ?? []) as Sponsor[]
        allRef.current = [...all].sort(() => Math.random() - 0.5)
        const filtered = filterSponsors(allRef.current, city, country)
        setSponsors(filtered)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-filtrar con debounce cuando cambia la búsqueda, sin re-mezclar
  useEffect(() => {
    if (!allRef.current.length) return
    const t = setTimeout(() => {
      setSponsors(filterSponsors(allRef.current, city, country))
    }, 400)
    return () => clearTimeout(t)
  }, [city, country])

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

  useEffect(() => {
    document.body.style.overflow = expanded ? 'hidden' : ''
    if (expanded && sponsors.length) {
      // grid (1) + detalle del primer sponsor (2)
      history.pushState({ sv2: 'grid' }, '')
      history.pushState({ sv2: 'detail' }, '')
      histDepthRef.current = 2
      setSelectedId(sponsors[0].id)
    }
    if (!expanded) {
      setSelectedId(null)
      histDepthRef.current = 0
    }
    return () => { document.body.style.overflow = '' }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  // Botón físico atrás del celular
  useEffect(() => {
    const onPop = () => {
      if (skipPopsRef.current > 0) { skipPopsRef.current--; return }
      histDepthRef.current = Math.max(0, histDepthRef.current - 1)
      if (selectedId) setSelectedId(null)
      else if (expanded) setExpanded(false)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [selectedId, expanded])

  const openSponsor = (id: string) => {
    history.pushState({ sv2: 'detail' }, '')
    histDepthRef.current++
    setSelectedId(id)
  }

  const closeDetail = () => history.back()  // consume el estado → popstate → setSelectedId(null)

  const closeAll = () => {
    const depth = histDepthRef.current
    histDepthRef.current = 0
    setExpanded(false)
    setSelectedId(null)
    if (depth > 0) {
      skipPopsRef.current = depth
      history.go(-depth)
    }
  }

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

  if (loading) return (
    <>
      <style>{`
        @keyframes sv2-dot { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }
      `}</style>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, padding: '0 20px', pointerEvents: 'none' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', background: '#efff42', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, gap: 5 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#000', display: 'inline-block', animation: `sv2-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </>
  )

  if (!sponsors.length) return null

  return (
    <>
      {/* Grilla de logos — fondo oscuro */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: '#0d0d0d',
        transform: expanded ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}>
        <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '28px 20px 100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.22em', textTransform: 'uppercase', margin: 0 }}>
                Sponsors
              </p>
              <button onClick={closeAll} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 14, color: 'rgba(255,255,255,0.45)',
              }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
              {sponsors.map(s => (
                <button key={s.id} onClick={() => openSponsor(s.id)} style={{
                  position: 'relative', overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', aspectRatio: '3/2',
                  background: '#111',
                }}>
                  {/* Imagen de fondo desenfocada */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.bg_image_url || s.logo_url} alt="" aria-hidden style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transform: 'scale(1.04)',
                    opacity: 0.55,
                    pointerEvents: 'none',
                  }} />
                  {/* Velo oscuro */}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
                  {/* Logo nítido */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.logo_url} alt={s.name} style={{
                    position: 'relative', zIndex: 1,
                    maxHeight: 30, maxWidth: '70%', objectFit: 'contain',
                    filter: s.keep_color ? 'none' : 'brightness(0) invert(1)',
                    opacity: s.keep_color ? 1 : 0.88,
                  }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal full-screen de detalle */}
      {(() => {
        const sel = sponsors.find(s => s.id === selectedId) ?? null
        const visible = expanded && !!selectedId
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 61,
            background: '#000',
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
            overflow: 'hidden',
          }}>
            {sel && (
              <>
                {/* Imagen de fondo desenfocada */}
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sel.bg_image_url || sel.logo_url} alt="" aria-hidden style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transform: 'scale(1.04)',
                    opacity: 0.6,
                  }} />
                </div>

                {/* Gradiente oscuro — legibilidad del texto abajo */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.93) 68%, rgba(0,0,0,1) 100%)',
                }} />

                {/* Botones de navegación */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3 }}>
                  <button onClick={closeDetail} style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 16,
                  }}>←</button>
                  <button onClick={closeAll} style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14,
                  }}>✕</button>
                </div>

                {/* Contenido centrado — logo arriba */}
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 2,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '80px 36px 32px',
                }}>
                  {/* Logo */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sel.detail_logo_url || sel.logo_url} alt={sel.name} style={{
                      maxHeight: 80, maxWidth: '65%', objectFit: 'contain',
                      filter: sel.detail_logo_mode === 'color' ? 'none'
                        : sel.detail_logo_mode === 'shadow' ? 'drop-shadow(0 0 10px rgba(255,255,255,0.95)) drop-shadow(0 0 4px rgba(255,255,255,0.8))'
                        : 'brightness(0) invert(1)',
                      opacity: 1,
                    } as React.CSSProperties} />
                  </div>

                  {/* Texto y botón */}
                  <div style={{ width: '100%', maxWidth: 480 }}>
                    <p style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 10px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                      {sel.name}
                    </p>
                    {sel.description && (
                      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.52)', lineHeight: 1.75, margin: '0 0 28px' }}>
                        {sel.description}
                      </p>
                    )}
                    {sel.link ? (
                      <a href={sel.link} target="_blank" rel="noopener noreferrer"
                        onClick={() => { fetch(`/api/sponsors-v2/${sel.id}/click`, { method: 'POST' }).catch(() => {}) }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '13px 26px', background: '#efff42', color: '#000',
                          borderRadius: 14, fontSize: 14, fontWeight: 800, textDecoration: 'none',
                        }}>Ver más →</a>
                    ) : (
                      <div style={{ height: 12 }} />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )
      })()}

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
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          padding: '0 20px',
          userSelect: 'none', touchAction: 'pan-x', cursor: 'grab',
        }}>
        <div style={{
          maxWidth: '80rem', margin: '0 auto',
          background: '#efff42', borderRadius: 0,
          display: 'flex', alignItems: 'center',
          gap: 8, paddingRight: 8,
        }}>
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

          {/* Botón punto negro */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setExpanded(true) }}
            style={{
              flexShrink: 0, width: 20, height: 20,
              borderRadius: '50%', background: '#000',
              border: 'none', cursor: 'pointer',
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
      src={s.logo_url} alt={s.name ?? ''} draggable={false}
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
