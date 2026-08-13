'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

type Sponsor = {
  id: string; name: string; logo_url: string; bg_image_url: string | null
  detail_logo_url: string | null; detail_logo_mode: string | null
  description: string | null; link: string | null; level: string
  city: string | null; country: string | null; keep_color: boolean | null
  logo_scale: number | null; whatsapp: string | null
}

type Convention = { id: string; name: string | null; image_url: string; link: string | null; expires_at: string | null; country: string | null }
type FlashDay = { id: string; studio_slug: string; studio_name: string; flyer_url: string; date: string }

function norm(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const COUNTRY_FLAGS: Record<string, string> = {
  argentina: '🇦🇷', brasil: '🇧🇷', brazil: '🇧🇷',
  chile: '🇨🇱', uruguay: '🇺🇾', paraguay: '🇵🇾', bolivia: '🇧🇴',
  peru: '🇵🇪', colombia: '🇨🇴', venezuela: '🇻🇪', ecuador: '🇪🇨',
  mexico: '🇲🇽', españa: '🇪🇸', spain: '🇪🇸', 'estados unidos': '🇺🇸',
  'united states': '🇺🇸', usa: '🇺🇸', alemania: '🇩🇪', germany: '🇩🇪',
  francia: '🇫🇷', france: '🇫🇷', italia: '🇮🇹', italy: '🇮🇹',
  portugal: '🇵🇹', canada: '🇨🇦', australia: '🇦🇺', japon: '🇯🇵',
  japan: '🇯🇵', china: '🇨🇳', 'reino unido': '🇬🇧', 'united kingdom': '🇬🇧',
  uk: '🇬🇧', rusia: '🇷🇺', russia: '🇷🇺', india: '🇮🇳',
}

function countryFlag(country: string | null): string {
  if (!country) return ''
  const key = norm(country)
  return COUNTRY_FLAGS[key] ? COUNTRY_FLAGS[key] + ' ' : ''
}

function matchesAny(stored: string | null, target: string): boolean {
  if (!stored || !target) return false
  const targets = stored.split(',').map(v => norm(v)).filter(Boolean)
  const t = norm(target)
  return targets.some(v => v === t || t.includes(v) || v.includes(t))
}

function filterSponsors(all: Sponsor[], city?: string, country?: string): Sponsor[] {
  if (!city && !country) return all
  return all.filter(s => {
    if (s.level === 'global') return true
    if (s.level === 'country' && country) return matchesAny(s.country, country)
    if (s.level === 'city' && city) {
      if (!matchesAny(s.city, city)) return false
      if (country && s.country) return matchesAny(s.country, country)
      return true
    }
    return false
  })
}

export default function SponsorsBannerV2({ city, country, conventions = [], flashDays = [], onOpenStudio, showEventsCountryFilter = false, showInsumos = true }: { city?: string; country?: string; conventions?: Convention[]; flashDays?: FlashDay[]; onOpenStudio?: (slug: string) => void; showEventsCountryFilter?: boolean; showInsumos?: boolean }) {
  const { t, language } = useTranslation()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [gridSearch, setGridSearch] = useState('')
  const [convView, setConvView] = useState(!showInsumos)
  const [convCountrySearch, setConvCountrySearch] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [mailCopied, setMailCopied] = useState(false)
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
      history.pushState({ sv2: 'grid' }, '')
      histDepthRef.current = 1
    }
    if (!expanded) {
      setSelectedId(null)
      histDepthRef.current = 0
      setConvView(false)
    }
    return () => { document.body.style.overflow = '' }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  // Push history cuando se abre el modal de info
  useEffect(() => {
    if (showInfo) {
      history.pushState({ sv2: 'info' }, '')
      histDepthRef.current++
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInfo])

  // Botón físico atrás del celular
  useEffect(() => {
    const onPop = () => {
      if (skipPopsRef.current > 0) { skipPopsRef.current--; return }
      histDepthRef.current = Math.max(0, histDepthRef.current - 1)
      if (selectedId) setSelectedId(null)
      else if (showInfo) setShowInfo(false)
      else if (expanded) setExpanded(false)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [selectedId, showInfo, expanded])

  const openSponsor = (id: string) => {
    history.pushState({ sv2: 'detail' }, '')
    histDepthRef.current++
    setSelectedId(id)
    fetch(`/api/sponsors-v2/${id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'detail_open' }) }).catch(() => {})
  }

  const closeDetail = () => history.back()  // consume el estado → popstate → setSelectedId(null)

  const closeAll = () => {
    const depth = histDepthRef.current
    histDepthRef.current = 0
    setExpanded(false)
    setSelectedId(null)
    setShowInfo(false)
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
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, pointerEvents: 'none', background: '#000', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, gap: 5 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-block', animation: `sv2-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </>
  )

  const gridSponsors = gridSearch.trim()
    ? filterSponsors(allRef.current, undefined, gridSearch.trim())
    : allRef.current

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
            {/* Header */}
            <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#efff42', marginBottom: 20 }}>
              {convView ? t('inicio', 'events_title', 'Eventos') : t('inicio', 'insumos_title', 'Insumos')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowInfo(v => !v)} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: showInfo ? 'rgba(239,255,66,0.15)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${showInfo ? 'rgba(239,255,66,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 14, color: showInfo ? '#efff42' : 'rgba(255,255,255,0.45)',
                }}>i</button>
                <button onClick={closeAll} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 14, color: 'rgba(255,255,255,0.45)',
                }}>✕</button>
              </div>

            </div>

            {/* Vista Insumos */}
            {!convView && (
              <div>
                <input
                  type="text"
                  placeholder={t('insumos', 'search_placeholder', 'Buscar proveedor por país...')}
                  value={gridSearch}
                  onChange={e => setGridSearch(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    marginBottom: 8, padding: '10px 16px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none',
                  }}
                />
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginBottom: 20 }}>
                  {t('insumos', 'tap_hint', 'Tocá el logo para visitar al proveedor')}
                </p>
                {gridSponsors.length === 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                    {t('insumos', 'no_results', 'Sin proveedores en ese país')}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                  {gridSponsors.map(s => (
                    <a
                      key={s.id}
                      href={s.link || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        fetch(`/api/sponsors-v2/${s.id}/click`, { method: 'POST' }).catch(() => {})
                        fetch(`/api/sponsors-v2/${s.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'banner_click' }) }).catch(() => {})
                      }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '28px 16px 22px',
                        textDecoration: 'none',
                        cursor: s.link ? 'pointer' : 'default',
                        gap: 10,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.logo_url} alt={s.name} style={{
                        height: 56, width: '100%', objectFit: 'contain',
                        filter: s.keep_color ? 'none' : 'brightness(0) invert(1)',
                        opacity: s.keep_color ? 1 : 0.65,
                      }} />
                      {s.description && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
                          textAlign: 'center', lineHeight: 1.3,
                        }}>
                          {s.description}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Vista Eventos */}
            {convView && (() => {
              type EventItem =
                | { kind: 'conv'; date: Date | null; data: Convention }
                | { kind: 'flash'; date: Date; data: FlashDay }

              const allItems: EventItem[] = [
                ...conventions.map(c => ({ kind: 'conv' as const, date: c.expires_at ? new Date(c.expires_at) : null, data: c })),
                ...flashDays.map(f => ({ kind: 'flash' as const, date: new Date(f.date + 'T12:00:00'), data: f })),
              ]

              const items = convCountrySearch.trim()
                ? allItems.filter(i => {
                    const q = norm(convCountrySearch)
                    if (i.kind === 'conv') return norm(i.data.country || '').includes(q)
                    return false
                  })
                : allItems

              const withDate = items.filter(i => i.date).sort((a, b) => a.date!.getTime() - b.date!.getTime())
              const noDate   = items.filter(i => !i.date)

              const groups: { label: string; items: EventItem[] }[] = []
              for (const item of withDate) {
                const label = item.date!.toLocaleDateString(language, { month: 'long', year: 'numeric' }).replace(/^\w/, l => l.toUpperCase())
                const last = groups[groups.length - 1]
                if (last && last.label === label) last.items.push(item)
                else groups.push({ label, items: [item] })
              }
              if (noDate.length > 0) groups.push({ label: t('eventos', 'no_date', 'Sin fecha'), items: noDate })

              const ConvCard = ({ c }: { c: Convention }) => (
                <div style={{ borderRadius: 16, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image_url} alt={c.name || ''} style={{ display: 'block', width: '100%', objectFit: 'contain' }} />
                  {(c.name || c.link) && (
                    <div style={{ padding: '16px 20px 20px' }}>
                      {c.name && <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.2 }}>{c.name}</p>}
                      {c.link && (
                        <a href={c.link} target="_blank" rel="noopener noreferrer"
                          onClick={() => fetch(`/api/conventions/${c.id}/click`, { method: 'POST' }).catch(() => {})}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', background: '#efff42', color: '#000', borderRadius: 12, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
                          {t('eventos', 'see_more', 'Ver más →')}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )

              const FlashCard = ({ f }: { f: FlashDay }) => (
                <div style={{ borderRadius: 16, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.flyer_url} alt={`Flash Day ${f.studio_name}`} style={{ display: 'block', width: '100%', objectFit: 'contain' }} />
                  <div style={{ padding: '16px 20px 20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'rgba(239,255,66,0.1)', border: '1px solid rgba(239,255,66,0.25)', borderRadius: 20, marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#efff42' }}>Flash Day</span>
                    </div>
                    <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 4px', lineHeight: 1.2 }}>{f.studio_name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 14px' }}>
                      {new Date(f.date + 'T12:00:00').toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <button
                      onClick={() => {
                        histDepthRef.current = 0
                        setExpanded(false)
                        onOpenStudio?.(f.studio_slug)
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', background: '#efff42', color: '#000', borderRadius: 12, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                      {t('eventos', 'see_studio', 'Ver estudio →')}
                    </button>
                  </div>
                </div>
              )

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  {showEventsCountryFilter && (
                    <input
                      type="text"
                      placeholder={t('eventos', 'search_country', 'Buscar evento por país...')}
                      value={convCountrySearch}
                      onChange={e => setConvCountrySearch(e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '10px 16px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none',
                      }}
                    />
                  )}
                  {groups.length === 0 && (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                      {convCountrySearch.trim() ? t('eventos', 'no_results_country', 'Sin eventos en ese país') : t('eventos', 'no_events', 'No hay eventos próximos')}
                    </p>
                  )}
                  {groups.map(g => (
                    <div key={g.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(239,255,66,0.6)' }}>{g.label}</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {g.items.map(item => item.kind === 'conv'
                          ? <ConvCard key={item.data.id} c={item.data} />
                          : <FlashCard key={item.data.id} f={item.data} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Modal full-screen de detalle */}
      {(() => {
        const sel = allRef.current.find(s => s.id === selectedId) ?? null
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
                  <div style={{ flex: 1, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '65%', maxWidth: 280, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sel.detail_logo_url || sel.logo_url} alt={sel.name} style={{
                        maxHeight: `${sel.logo_scale || 100}%`, maxWidth: `${sel.logo_scale || 100}%`, objectFit: 'contain',
                        filter: sel.detail_logo_mode === 'color' ? 'none'
                          : sel.detail_logo_mode === 'shadow' ? 'drop-shadow(0 0 10px rgba(255,255,255,0.95)) drop-shadow(0 0 4px rgba(255,255,255,0.8))'
                          : 'brightness(0) invert(1)',
                        opacity: 1,
                      } as React.CSSProperties} />
                    </div>
                  </div>

                  {/* Texto y botón */}
                  <div style={{ width: '100%', maxWidth: 480 }}>
                    <p style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 6px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                      {sel.name}
                    </p>
                    {(sel.city || sel.country) && (
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 0 12px' }}>
                        {countryFlag(sel.country)}{[sel.country, sel.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {sel.description && (
                      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.52)', lineHeight: 1.75, margin: '0 0 28px' }}>
                        {sel.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {sel.link && (
                        <a href={sel.link} target="_blank" rel="noopener noreferrer"
                          onClick={() => {
                            fetch(`/api/sponsors-v2/${sel.id}/click`, { method: 'POST' }).catch(() => {})
                            fetch(`/api/sponsors-v2/${sel.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'detail_click' }) }).catch(() => {})
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '13px 26px', background: '#efff42', color: '#000',
                            borderRadius: 14, fontSize: 14, fontWeight: 800, textDecoration: 'none',
                          }}>{t('insumos', 'see_more', 'Ver más →')}</a>
                      )}
                      {sel.whatsapp && (
                        <a href={`https://wa.me/${sel.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          onClick={() => {
                            fetch(`/api/sponsors-v2/${sel.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'whatsapp_click' }) }).catch(() => {})
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '13px 26px', background: 'rgba(37,211,102,0.15)', color: '#25d366',
                            border: '1px solid rgba(37,211,102,0.3)',
                            borderRadius: 14, fontSize: 14, fontWeight: 800, textDecoration: 'none',
                          }}>WhatsApp</a>
                      )}
                      {!sel.link && !sel.whatsapp && <div style={{ height: 12 }} />}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Banner fijo — solo cuando insumos está activo */}
      {showInsumos && (
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
          <div style={{ maxWidth: '80rem', margin: '0 auto', background: '#000', borderRadius: '14px 14px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
            <div style={{ overflow: 'hidden', padding: '16px 16px 16px' }}>
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
          </div>
        </div>
      )}

      {/* Botones flotantes */}
      <div style={{ position: 'fixed', bottom: showInsumos ? 70 : 20, left: 0, right: 0, zIndex: 41, pointerEvents: 'none', padding: '0 20px' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 8px', display: 'flex', justifyContent: showInsumos ? 'stretch' : 'center', gap: 8, pointerEvents: 'auto' }}>
          {showInsumos && (
            <button onClick={() => { setConvView(false); setExpanded(true); fetch('/api/track/app-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_name: 'insumos_open' }) }).catch(() => {}) }}
              style={{ flex: 1, padding: '7px 0', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(239,255,66,0.7)', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: '0.05em' }}>
              {t('inicio', 'insumos_btn', 'Insumos')}
            </button>
          )}
          <button onClick={() => { setConvView(true); setExpanded(true); fetch('/api/track/app-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_name: 'eventos_open' }) }).catch(() => {}) }}
            style={{ flex: showInsumos ? 1 : 'unset', width: showInsumos ? undefined : 160, padding: '7px 0', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(239,255,66,0.7)', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: '0.05em' }}>
            {t('inicio', 'events_btn', 'Eventos')}
          </button>
        </div>
      </div>

      {/* Modal de soporte */}
      {showInfo && (
        <div onClick={() => setShowInfo(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 40px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 420, background: '#111', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', padding: '32px 28px 28px', margin: '0 16px' }}>

            {/* Logo */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 36, opacity: 0.9 }} />
            </div>

            <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 10, letterSpacing: '-0.02em' }}>
              {convView ? t('inicio', 'events_subtitle', 'Eventos de tatuaje') : t('inicio', 'insumos_subtitle', 'Insumos para tatuadores')}
            </p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 28 }}>
              {convView
                ? t('eventos', 'info_desc', 'Convenciones y eventos de la comunidad. Si organizás uno y querés sumarlo, escribinos.')
                : t('insumos', 'info_desc', 'Acá encontrás marcas y proveedores del mundo del tatuaje. Si tenés una marca y querés aparecer, escribinos.')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="https://instagram.com/flashttoo" target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>Instagram</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>@flashttoo</p>
                </div>
                <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)' }}>↗</span>
              </a>

              <button
                onClick={() => {
                  navigator.clipboard.writeText('soporte.flashttoo@gmail.com').catch(() => {})
                  setMailCopied(true)
                  setTimeout(() => setMailCopied(false), 2000)
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 14, background: mailCopied ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.05)', border: `1px solid ${mailCopied ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.2s' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: mailCopied ? '#4ade80' : '#fff', margin: 0 }}>Email</p>
                  <p style={{ fontSize: 12, color: mailCopied ? 'rgba(74,222,128,0.6)' : 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>soporte.flashttoo@gmail.com</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: mailCopied ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                  {mailCopied ? t('eventos', 'copied', '✓ copiado') : t('eventos', 'copy', 'copiar')}
                </span>
              </button>
            </div>

            <button onClick={() => setShowInfo(false)}
              style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {t('eventos', 'close', 'Cerrar')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Logo({ s, dragRef }: { s: Sponsor; dragRef: React.RefObject<{ moved: boolean }> }) {
  const img = (
    <div style={{ width: 100, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={s.logo_url} alt={s.name ?? ''} draggable={false}
        style={{ maxHeight: `${s.logo_scale || 100}%`, maxWidth: `${s.logo_scale || 100}%`, objectFit: 'contain', filter: s.keep_color ? 'none' : 'brightness(0) invert(1)', display: 'block', opacity: s.keep_color ? 1 : 0.7 }}
      />
    </div>
  )
  if (s.link) {
    return (
      <a href={s.link} target="_blank" rel="noopener noreferrer"
        style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}
        onClick={e => {
          if (dragRef.current?.moved) { e.preventDefault(); return }
          fetch(`/api/sponsors-v2/${s.id}/click`, { method: 'POST' }).catch(() => {})
          fetch(`/api/sponsors-v2/${s.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'banner_click' }) }).catch(() => {})
        }}>
        {img}
      </a>
    )
  }
  return <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{img}</span>
}
