'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

type Sponsor = {
  id: string; name: string; logo_url: string; bg_image_url: string | null
  detail_logo_url: string | null; detail_logo_mode: string | null
  description: string | null; bio: string | null; instagram: string | null
  link: string | null; level: string
  city: string | null; country: string | null; keep_color: boolean | null
  logo_scale: number | null; grid_logo_scale: number | null; whatsapp: string | null
  bg_image_dark: number | null; logo_bg_color: string | null
}

type Convention = { id: string; name: string | null; image_url: string; link: string | null; expires_at: string | null; country: string | null }
type FlashDay = { id: string; studio_slug: string; studio_name: string; flyer_url: string; date: string }
type GalleryPhoto = { artist_id: string; artist_name: string; artist_photo: string; photo_url: string; artist_instagram: string | null; artist_city: string | null; artist_country: string | null; artist_styles: string[] | null; photo_styles: string[] | null }

function norm(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const COUNTRY_FLAGS: Record<string, string> = {
  argentina: '🇦🇷', brasil: '🇧🇷', brazil: '🇧🇷',
  chile: '🇨🇱', uruguay: '🇺🇾', paraguay: '🇵🇾', bolivia: '🇧🇴',
  peru: '🇵🇪', colombia: '🇨🇴', venezuela: '🇻🇪', ecuador: '🇪🇨',
  panama: '🇵🇦', cuba: '🇨🇺', aruba: '🇦🇼', 'republica dominicana': '🇩🇴',
  'puerto rico': '🇵🇷', 'costa rica': '🇨🇷', guatemala: '🇬🇹',
  honduras: '🇭🇳', nicaragua: '🇳🇮', 'el salvador': '🇸🇻', haiti: '🇭🇹',
  mexico: '🇲🇽', espana: '🇪🇸', spain: '🇪🇸', 'estados unidos': '🇺🇸',
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

// Todas las banderas cuya clave contiene el query (búsqueda parcial multiidioma)
function flagsMatchingQuery(query: string): Set<string> {
  const q = norm(query)
  const result = new Set<string>()
  for (const [k, v] of Object.entries(COUNTRY_FLAGS)) {
    if (k.includes(q)) result.add(v)
  }
  return result
}

// Busca en el campo country de un sponsor, cruzando sinónimos vía bandera
function countryMatchesSearch(stored: string | null, query: string): boolean {
  if (!stored || !query) return false
  const queryNorm = norm(query)
  const matchingFlags = flagsMatchingQuery(query)
  return stored.split(',').some(c => {
    const cn = norm(c.trim())
    if (cn.includes(queryNorm) || queryNorm.includes(cn)) return true
    const flag = COUNTRY_FLAGS[cn]
    if (flag && matchingFlags.has(flag)) return true
    return false
  })
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
  const [bannerGap, setBannerGap] = useState(8)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [gridSearch, setGridSearch] = useState('')
  const [gridPage, setGridPage] = useState(1)
  const GRID_PAGE_SIZE = 30
  const [convView, setConvView] = useState(!showInsumos)
  const [showGallery, setShowGallery] = useState(false)
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [galleryLoaded, setGalleryLoaded] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null)
  const [galleryDisplayCount, setGalleryDisplayCount] = useState(20)
  const galleryContainerRef = useRef<HTMLDivElement>(null)
  const gallerySentinelRef = useRef<HTMLDivElement>(null)
  const [detailDisplayCount, setDetailDisplayCount] = useState(20)
  const [activeStyleFilter, setActiveStyleFilter] = useState<string | null>(null)
  const [loadingArtistSlug, setLoadingArtistSlug] = useState<string | null>(null)
  const [sharePhotoCopied, setSharePhotoCopied] = useState(false)
  const detailContainerRef = useRef<HTMLDivElement>(null)
  const detailSentinelRef = useRef<HTMLDivElement>(null)
  const [convCountrySearch, setConvCountrySearch] = useState('')
  const [gridBgImage, setGridBgImage] = useState<string | null>(null)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [mailCopied, setMailCopied] = useState(false)
  const bgImagesRef   = useRef<string[]>([])
  const allRef        = useRef<Sponsor[]>([])
  const trackRef      = useRef<HTMLDivElement>(null)
  const firstRef      = useRef<HTMLDivElement>(null)
  const posRef        = useRef(0)
  const loopRef       = useRef(0)
  const [extraCopies, setExtraCopies] = useState(4)
  const dragRef       = useRef({ on: false, startX: 0, startPos: 0, moved: false })
  const histDepthRef  = useRef(0)  // cuántos estados pushState tiene el overlay
  const skipPopsRef   = useRef(0)  // popstate a ignorar tras history.go(-n)
  const photoStackRef    = useRef<GalleryPhoto[]>([])  // historial de fotos visitadas
  const navigatingBackRef = useRef(false)  // evita push en useEffect al volver atrás
  // Refs espejo para que el handler de popstate siempre lea valores actuales (sin closure obsoleto)
  const selectedPhotoRef = useRef<GalleryPhoto | null>(null)
  const showGalleryRef   = useRef(false)
  const selectedIdRef    = useRef<string | null>(null)
  const showInfoRef      = useRef(false)
  const expandedRef      = useRef(false)

  // Sincronizar refs espejo con estado actual en cada render
  selectedPhotoRef.current = selectedPhoto
  showGalleryRef.current   = showGallery
  selectedIdRef.current    = selectedId
  showInfoRef.current      = showInfo
  expandedRef.current      = expanded

  // Fetch una sola vez — mezcla aleatoria fija en este montaje
  useEffect(() => {
    setLoading(true)
    fetch('/api/sponsors-v2')
      .then(r => r.json())
      .then(d => {
        const all = (d.sponsors ?? []) as Sponsor[]
        allRef.current = [...all].sort(() => Math.random() - 0.5)
        bgImagesRef.current = Array.isArray(d.bg_images) ? d.bg_images : []
        const filtered = filterSponsors(allRef.current, city, country)
        setSponsors(filtered)
        if (typeof d.banner_gap === 'number') setBannerGap(d.banner_gap)
        setLoading(false)
        // Precargar logos del banner, fondos de perfiles y de la grilla
        all.forEach(s => {
          if (s.logo_url)    { const i = new Image(); i.src = s.logo_url }
          if (s.bg_image_url){ const i = new Image(); i.src = s.bg_image_url }
        })
        bgImagesRef.current.forEach(url => { const i = new Image(); i.src = url })
        // Abrir perfil directo si la URL trae ?insumo=<id>
        const insumoId = new URLSearchParams(window.location.search).get('insumo')
        if (insumoId && all.find(s => s.id === insumoId)) {
          history.replaceState(null, '', window.location.pathname)
          setSelectedId(insumoId)
          history.pushState({ sv2: 'detail' }, '')
          histDepthRef.current = 1
        }
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
        const w = firstRef.current?.getBoundingClientRect().width ?? 0
        if (w > 0) {
          loopRef.current = w
          const needed = Math.ceil(window.innerWidth / w) + 2
          setExtraCopies(needed)
          posRef.current = Math.random() * w
          ready = true
        }
      }
      if (ready && !dragRef.current.on) {
        posRef.current += 0.2
        if (posRef.current >= loopRef.current) {
          // remedir en cada reset para mantener alineacion exacta
          loopRef.current = firstRef.current?.getBoundingClientRect().width ?? loopRef.current
          posRef.current -= loopRef.current
        }
        if (trackRef.current) trackRef.current.style.transform = `translate3d(-${posRef.current}px,0,0)`
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
      if (bgImagesRef.current.length > 0) {
        setGridBgImage(bgImagesRef.current[Math.floor(Math.random() * bgImagesRef.current.length)])
      }
    }
    if (!expanded) {
      setSelectedId(null)
      histDepthRef.current = 0
      setConvView(!showInsumos)
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

  // Botón físico atrás del celular — deps vacíos, usa refs para evitar closure obsoleto
  useEffect(() => {
    const onPop = () => {
      if (skipPopsRef.current > 0) { skipPopsRef.current--; return }
      if ((window as Window & { __artistAboveGallery?: boolean }).__artistAboveGallery) {
        ;(window as Window & { __artistAboveGallery?: boolean }).__artistAboveGallery = false
        return
      }
      histDepthRef.current = Math.max(0, histDepthRef.current - 1)
      if (selectedPhotoRef.current) {
        const prev = photoStackRef.current.pop()
        if (prev) navigatingBackRef.current = true  // volver atrás no debe pushear nuevo estado
        setSelectedPhoto(prev ?? null)
        return
      }
      if (showGalleryRef.current) { setShowGallery(false); return }
      if (selectedIdRef.current)  { setSelectedId(null);   return }
      if (showInfoRef.current)    { setShowInfo(false);    return }
      if (expandedRef.current)    { setExpanded(false);    return }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = showGallery ? 'hidden' : ''
    if (showGallery) {
      history.pushState({ sv2: 'gallery' }, '')
      histDepthRef.current++
    }
    return () => { document.body.style.overflow = '' }
  }, [showGallery])

  useEffect(() => {
    if (!showGallery || selectedPhoto) return
    const container = galleryContainerRef.current
    const sentinel = gallerySentinelRef.current
    if (!container || !sentinel) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setGalleryDisplayCount(c => c + 20) },
      { root: container, threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [showGallery, selectedPhoto, galleryPhotos.length])

  useEffect(() => {
    if (!selectedPhoto) return
    setDetailDisplayCount(20)
    setActiveStyleFilter(null)
    if (navigatingBackRef.current) {
      navigatingBackRef.current = false  // vinimos del popstate, el estado ya existe en historial
    } else {
      history.pushState({ sv2: 'gallery-detail' }, '')
      histDepthRef.current++
    }
    requestAnimationFrame(() => { detailContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' }) })
    const container = detailContainerRef.current
    const sentinel = detailSentinelRef.current
    if (!container || !sentinel) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setDetailDisplayCount(c => c + 20) },
      { root: container, threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [selectedPhoto])

  useEffect(() => {
    setGalleryLoaded(true)
    fetch('/api/gallery').then(r => r.json()).then(d => {
      const photos = d.photos ?? []
      setGalleryPhotos(photos)
      photos.slice(0, 6).forEach((p: GalleryPhoto) => { const img = new window.Image(); img.src = p.photo_url })
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadGallery = () => { /* precargado al montar */ }

  const openSponsor = (id: string) => {
    if (showGalleryRef.current) {
      setShowGallery(false)
      setSelectedPhoto(null)
      photoStackRef.current = []
      histDepthRef.current = 0
    }
    history.pushState({ sv2: 'detail' }, '')
    histDepthRef.current++
    setBioExpanded(false)
    setSelectedId(id)
    fetch(`/api/sponsors-v2/${id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'detail_open' }) }).catch(() => {})
  }

  const closeDetail = () => history.back()  // consume el estado → popstate → setSelectedId(null)

  const navigateToPhoto = (p: GalleryPhoto) => {
    if (selectedPhoto) photoStackRef.current.push(selectedPhoto)
    setSelectedPhoto(p)
  }

  const closeGallery = () => {
    ;(window as Window & { __artistAboveGallery?: boolean }).__artistAboveGallery = false
    const depth = (selectedPhoto ? 1 + photoStackRef.current.length : 0) + (showGallery ? 1 : 0)
    photoStackRef.current = []
    setSelectedPhoto(null)
    setShowGallery(false)
    if (depth > 0) {
      skipPopsRef.current += depth
      history.go(-depth)
      histDepthRef.current = Math.max(0, histDepthRef.current - depth)
    }
  }

  const openArtistFromGallery = (slug: string) => {
    ;(window as Window & { __artistAboveGallery?: boolean }).__artistAboveGallery = true
    setLoadingArtistSlug(slug)
    window.dispatchEvent(new CustomEvent('open-artist', { detail: slug }))
    const onOpened = () => {
      setLoadingArtistSlug(null)
      window.removeEventListener('artist-opened', onOpened)
    }
    window.addEventListener('artist-opened', onOpened)
  }

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
    if (trackRef.current) trackRef.current.style.transform = `translate3d(-${posRef.current}px,0,0)`
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

  const allGridSponsors = gridSearch.trim()
    ? allRef.current.filter(s => countryMatchesSearch(s.country, gridSearch.trim()) || norm(s.name ?? '').includes(norm(gridSearch.trim())))
    : allRef.current
  const gridSponsors = allGridSponsors.slice(0, gridPage * GRID_PAGE_SIZE)
  const hasMore = gridSponsors.length < allGridSponsors.length

  if (!sponsors.length) return null

  return (
    <>
      {/* Grilla de logos */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: '#0a0a0a',
        transform: expanded ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}>
        {/* Imagen de fondo fija — no se mueve con el scroll */}
        {gridBgImage && !convView && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gridBgImage} alt="" aria-hidden style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 30%',
              zIndex: 0,
            }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(0,0,0,0.72)' }} />
          </>
        )}

        <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '28px 20px 100px' }}>
            {/* Header */}
            <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#efff42', marginBottom: 20 }}>
              {convView ? t('inicio', 'events_title', 'Eventos') : t('inicio', 'insumos_title', 'Insumos')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
              <div />
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
                  onChange={e => { setGridSearch(e.target.value); setGridPage(1) }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    marginBottom: 8, padding: '10px 16px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none',
                  }}
                />
                {gridSponsors.length === 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                    {t('insumos', 'no_results', 'Sin proveedores en ese país')}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {gridSponsors.map(s => (
                    <div key={s.id} onClick={() => openSponsor(s.id)} style={{
                      borderRadius: 16,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: gridBgImage ? 'rgba(255,255,255,0.07)' : '#111',
                      backdropFilter: gridBgImage ? 'blur(20px)' : 'none',
                      WebkitBackdropFilter: gridBgImage ? 'blur(20px)' : 'none',
                      boxShadow: gridBgImage ? '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                    }}>
                      {/* Logo centrado */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px 16px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.logo_url} alt={s.name} style={{
                          height: s.grid_logo_scale || 90, maxWidth: '100%', width: 'auto',
                          objectFit: 'contain', display: 'block',
                          filter: s.keep_color ? 'none' : 'brightness(0) invert(1)',
                          opacity: s.keep_color ? 1 : 0.65,
                        }} />
                      </div>
                      {/* Etiqueta */}
                      {s.description && (
                        <div style={{ padding: '0 12px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, textAlign: 'center', display: 'block' }}>
                            {s.description}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <button onClick={() => setGridPage(p => p + 1)} style={{
                    marginTop: 16, width: '100%', padding: '14px 0',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 14, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', letterSpacing: '0.02em',
                  }}>
                    {t('insumos', 'load_more', 'Cargar más')}
                  </button>
                )}
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
                    return true // flash days no tienen país, se muestran siempre
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
        const visible = !!selectedId
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 61,
            background: '#0a0a0a',
            transform: visible ? 'translateY(0)' : 'translateY(100%)',
            pointerEvents: visible ? 'auto' : 'none',
            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
          }}>
            {/* Logo grande blureado — fijo, no se mueve con el scroll */}
            {sel && (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sel.detail_logo_url || sel.logo_url} alt="" aria-hidden style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '160%', height: '160%',
                  objectFit: 'contain',
                  filter: 'blur(60px) brightness(0.5)',
                  opacity: 1,
                  pointerEvents: 'none',
                }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,8,8,0.35)' }} />
              </div>
            )}

            {sel && (
              <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 1 }}>

                {/* ── HERO ── */}
                <div style={{ position: 'relative', height: '58vh', minHeight: 300, overflow: 'hidden' }}>

                  {/* Imagen de fondo del hero */}
                  {sel.bg_image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={sel.bg_image_url} alt="" aria-hidden style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'cover', objectPosition: 'center',
                      transform: 'scale(1.04)',
                      opacity: 0.75,
                    }} />
                  ) : null}

                  {/* Gradiente para legibilidad del texto — más suave si hay foto */}
                  <div style={{ position: 'absolute', inset: 0, background: sel.bg_image_url
                    ? 'linear-gradient(to bottom, rgba(8,8,8,0.25) 0%, rgba(8,8,8,0.05) 30%, rgba(8,8,8,0.6) 70%, rgba(8,8,8,1) 100%)'
                    : 'linear-gradient(to bottom, rgba(8,8,8,0.5) 0%, rgba(8,8,8,0.15) 35%, rgba(8,8,8,0.75) 75%, rgba(8,8,8,1) 100%)',
                  }} />
                  {/* Oscurecimiento adicional configurable */}
                  {sel.bg_image_url && (sel.bg_image_dark ?? 0) > 0 && (
                    <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${((sel.bg_image_dark ?? 0) / 100).toFixed(2)})` }} />
                  )}

                  {/* Halo de luz detrás del logo */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -58%)',
                    width: 260, height: 260, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(239,255,66,0.09) 0%, rgba(239,255,66,0.03) 40%, transparent 70%)',
                    filter: 'blur(18px)',
                    pointerEvents: 'none',
                  }} />

                  {/* Nav */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 18px 0', display: 'flex', justifyContent: 'space-between', zIndex: 4 }}>
                    <button onClick={closeDetail} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 16 }}>←</button>
                    <button onClick={closeAll} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>✕</button>
                  </div>

                  {/* Nombre, logo y tag — esquina inferior izquierda */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 24px', zIndex: 3 }}>
                    {/* Logo chico sobre el nombre */}
                    <div style={sel.logo_bg_color ? {
                      width: 72, height: 72, borderRadius: '50%',
                      background: sel.logo_bg_color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 10, boxSizing: 'border-box',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      marginBottom: 12,
                    } : {
                      width: 72, height: 56,
                      display: 'flex', alignItems: 'flex-end',
                      marginBottom: 12,
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sel.detail_logo_url || sel.logo_url} alt={sel.name} style={{
                        maxHeight: '100%', maxWidth: '100%', objectFit: 'contain',
                        filter: sel.detail_logo_mode === 'color' ? 'none'
                          : sel.detail_logo_mode === 'shadow' ? 'drop-shadow(0 2px 16px rgba(255,255,255,0.5))'
                          : 'brightness(0) invert(1) drop-shadow(0 2px 12px rgba(255,255,255,0.25))',
                      } as React.CSSProperties} />
                    </div>
                    <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                      {sel.name}
                    </h1>
                    {sel.description && (
                      <span style={{ display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(239,255,66,0.8)', background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', borderRadius: 999, padding: '3px 10px' }}>
                        {sel.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── CONTENIDO ── */}
                <div style={{ background: 'transparent', padding: '28px 24px 80px', maxWidth: 600, margin: '0 auto' }}>

                  {sel.bio && (() => {
                    const isLong = sel.bio.length > 400 || sel.bio.split('\n').length > 8
                    return (
                      <div style={{ marginBottom: 32 }}>
                        <p style={{
                          fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.85, margin: 0, fontWeight: 400, whiteSpace: 'pre-wrap',
                          ...(!bioExpanded && isLong ? {
                            display: '-webkit-box', WebkitLineClamp: 10,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          } : {}),
                        } as React.CSSProperties}>
                          {sel.bio}
                        </p>
                        {isLong && (
                          <button onClick={() => setBioExpanded(v => !v)} style={{
                            marginTop: 10, background: 'none', border: 'none',
                            color: 'rgba(239,255,66,0.7)', fontSize: 11, fontWeight: 700,
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 5, width: '100%',
                          }}>
                            <span>{bioExpanded ? t('insumos', 'bio_less', 'Ver menos') : t('insumos', 'bio_more', 'Ver más')}</span>
                            <span style={{
                              fontSize: 13, display: 'inline-block',
                              transition: 'transform 0.2s',
                              transform: bioExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}>↓</span>
                          </button>
                        )}
                      </div>
                    )
                  })()}

                  {/* Línea decorativa amarilla */}
                  <div style={{ height: 1, background: 'linear-gradient(to right, rgba(239,255,66,0.25), transparent)', marginBottom: 28 }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sel.link && (
                      <a href={sel.link} target="_blank" rel="noopener noreferrer"
                        onClick={() => {
                          fetch(`/api/sponsors-v2/${sel.id}/click`, { method: 'POST' }).catch(() => {})
                          fetch(`/api/sponsors-v2/${sel.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'detail_click' }) }).catch(() => {})
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px 26px', background: 'rgba(239,255,66,0.07)', color: 'rgba(239,255,66,0.85)', border: '1px solid rgba(239,255,66,0.2)', borderRadius: 14, fontSize: 14, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.02em' }}>
                        Web
                      </a>
                    )}
                    {sel.instagram && (
                      <a href={`https://instagram.com/${sel.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                        onClick={() => {
                          fetch(`/api/sponsors-v2/${sel.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'instagram_click' }) }).catch(() => {})
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px 26px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                        Instagram
                      </a>
                    )}
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}${window.location.pathname}?insumo=${sel.id}`
                        if (navigator.share) {
                          navigator.share({ title: sel.name ?? '', url }).catch(() => {})
                        } else {
                          navigator.clipboard.writeText(url).catch(() => {})
                        }
                      }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px 26px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                      {t('insumos', 'share_btn', 'Compartir perfil')}
                    </button>
                    {sel.whatsapp && (
                      <a href={`https://wa.me/${sel.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        onClick={() => {
                          fetch(`/api/sponsors-v2/${sel.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'whatsapp_click' }) }).catch(() => {})
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px 26px', background: 'rgba(37,211,102,0.06)', color: 'rgba(37,211,102,0.8)', border: '1px solid rgba(37,211,102,0.18)', borderRadius: 14, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                        WhatsApp
                      </a>
                    )}
                  </div>

                  {/* Países como chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
                    {sel.country
                      ? sel.country.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                          <span key={c} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(239,255,66,0.75)', background: 'rgba(239,255,66,0.06)', border: '1px solid rgba(239,255,66,0.18)', borderRadius: 999, padding: '4px 12px' }}>
                            {countryFlag(c)}{c}
                          </span>
                        ))
                      : (
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '4px 12px' }}>
                            🌍 {t('insumos', 'global_label', 'Global')}
                          </span>
                        )
                    }
                  </div>
                </div>
              </div>
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
          onTouchCancel={endDrag}
          onMouseDown={e => startDrag(e.clientX)}
          onMouseMove={e => moveDrag(e.clientX)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: selectedPhoto ? 75 : showGallery ? 65 : 40,
            padding: '0 20px',
            userSelect: 'none', touchAction: 'pan-x', cursor: 'grab',
          }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', background: '#000', borderRadius: '14px 14px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
            <div style={{ overflow: 'hidden', padding: '16px 16px 16px' }}>
              <div ref={trackRef} style={{ display: 'flex', willChange: 'transform', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', isolation: 'isolate' }}>
                <div ref={firstRef} style={{ display: 'flex', gap: bannerGap, paddingRight: bannerGap, flexShrink: 0 }}>
                  {sponsors.map(s => <Logo key={s.id} s={s} dragRef={dragRef} onOpen={openSponsor} />)}
                </div>
                {Array.from({ length: extraCopies }, (_, ci) => (
                  <div key={ci} style={{ display: 'flex', gap: bannerGap, paddingRight: bannerGap, flexShrink: 0 }}>
                    {sponsors.map(s => <Logo key={`${ci}-${s.id}`} s={s} dragRef={dragRef} onOpen={openSponsor} />)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones flotantes */}
      <div style={{ position: 'fixed', bottom: showInsumos ? 70 : 20, left: 0, right: 0, zIndex: selectedPhoto ? 75 : showGallery ? 65 : 41, pointerEvents: 'none', padding: '0 20px' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 8px', display: 'flex', justifyContent: showInsumos ? 'stretch' : 'center', gap: 8, pointerEvents: 'auto' }}>
          {showInsumos && (
            <button onClick={() => { setSelectedPhoto(null); setShowGallery(false); setConvView(false); setExpanded(true); fetch('/api/track/app-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_name: 'insumos_open' }) }).catch(() => {}) }}
              style={{ flex: 1, padding: '7px 0', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(239,255,66,0.7)', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: '0.05em' }}>
              {t('inicio', 'insumos_btn', 'Insumos')}
            </button>
          )}
          <button onClick={() => { if (showGallery) { closeGallery() } else { loadGallery(); setGalleryDisplayCount(20); setShowGallery(true) } }}
            style={{ flex: 1, padding: '7px 0', background: showGallery ? 'rgba(239,255,66,0.15)' : 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: `1px solid ${showGallery ? 'rgba(239,255,66,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: 'rgba(239,255,66,0.7)', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: '0.05em' }}>
            {t('inicio', 'gallery_btn', 'Galería')}
          </button>
          <button onClick={() => { setSelectedPhoto(null); setShowGallery(false); setConvView(true); setExpanded(true); fetch('/api/track/app-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_name: 'eventos_open' }) }).catch(() => {}) }}
            style={{ flex: showInsumos ? 1 : 'unset', width: showInsumos ? undefined : 160, padding: '7px 0', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(239,255,66,0.7)', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: '0.05em' }}>
            {t('inicio', 'events_btn', 'Eventos')}
          </button>
        </div>
      </div>

      {/* Modal de soporte */}
      {/* Galería overlay */}
      {showGallery && (
        <div ref={galleryContainerRef} style={{ position: 'fixed', top: 0, bottom: 0, left: 'max(0px, calc(50% - 40rem))', right: 'max(0px, calc(50% - 40rem))', zIndex: 60, background: '#000', overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {/* Header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(0,0,0,0.92)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logoprincipal.svg" alt="Flashttoo" onClick={closeGallery} style={{ height: 28, opacity: 0.9, flex: '0 0 auto', cursor: 'pointer' }} />
            <span style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#efff42', pointerEvents: 'none' }}>{t('inicio', 'gallery_btn', 'Galería')}</span>
            <button onClick={closeGallery}
              style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>
              ×
            </button>
          </div>
          {/* Grid 2 columnas */}
          {galleryPhotos.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>{t('galeria', 'loading', 'Cargando...')}</p>
            </div>
          ) : (
            (() => {
              const photos = galleryPhotos.slice(0, galleryDisplayCount)
              const renderCard = (p: typeof photos[0]) => (
                <div key={p.photo_url}>
                  <div style={{ borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', minHeight: 80 }} onClick={() => navigateToPhoto(p)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo_url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: 'auto', display: 'block', cursor: 'pointer' }} />
                  </div>
                  <button onClick={e => { e.stopPropagation(); const slug = p.artist_instagram ? p.artist_instagram.replace('@', '') : p.artist_id; openArtistFromGallery(slug) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px 2px', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.artist_photo} alt="" loading="lazy" decoding="async" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.artist_name}</span>
                  </button>
                </div>
              )
              return (
                <div style={{ padding: '8px 20px 120px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
                      {photos.filter((_, i) => i % 2 === 0).map(renderCard)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
                      {photos.filter((_, i) => i % 2 === 1).map(renderCard)}
                    </div>
                  </div>
                  <div ref={gallerySentinelRef} style={{ height: 1 }} />
                </div>
              )
            })()
          )}
        </div>
      )}

      {/* Detalle de foto */}
      {selectedPhoto && (
        <div ref={detailContainerRef} style={{ position: 'fixed', top: 0, bottom: 0, left: 'max(0px, calc(50% - 40rem))', right: 'max(0px, calc(50% - 40rem))', zIndex: 70, background: '#000', overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {/* Header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(0,0,0,0.92)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 28, opacity: 0.9, flex: '0 0 auto' }} />
            <span style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#efff42', pointerEvents: 'none' }}>{t('inicio', 'gallery_btn', 'Galería')}</span>
            <button onClick={() => history.back()} style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>←</button>
          </div>
          {/* Foto grande + info artista conectados */}
          <div style={{ margin: '12px 20px 0', borderRadius: 14, overflow: 'hidden' }}>
            {/* Foto con etiquetas encima */}
            <div style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPhoto.photo_url} alt="" style={{ width: '100%', display: 'block' }} />
              {/* Botón compartir foto */}
              <button onClick={async () => {
                const slug = selectedPhoto.artist_instagram ? selectedPhoto.artist_instagram.replace('@','') : selectedPhoto.artist_id
                const url = `${window.location.origin}/?artista=${slug}`
                if (navigator.share) {
                  try { await navigator.share({ title: selectedPhoto.artist_name, text: `Mirá este trabajo de ${selectedPhoto.artist_name} en Flashttoo`, url }) } catch {}
                } else {
                  await navigator.clipboard.writeText(url).catch(() => {})
                  setSharePhotoCopied(true)
                  setTimeout(() => setSharePhotoCopied(false), 2000)
                }
              }} style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, color: '#efff42' }}>
                {sharePhotoCopied ? '✓' : '↗'}
              </button>
              {selectedPhoto.photo_styles && selectedPhoto.photo_styles.length > 0 && (
                <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedPhoto.photo_styles.map((s, i) => {
                    const active = activeStyleFilter === s
                    return (
                      <button key={i} onClick={() => setActiveStyleFilter(active ? null : s)}
                        style={{ background: active ? '#efff42' : 'rgba(30,30,30,0.95)', border: `1px solid ${active ? '#efff42' : 'rgba(239,255,66,0.5)'}`, borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: active ? '#000' : '#efff42', letterSpacing: '0.04em', cursor: 'pointer' }}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          {/* Info artista */}
          <div style={{ background: '#efff42', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPhoto.artist_photo} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(0,0,0,0.12)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#000', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPhoto.artist_name}</p>
              {(selectedPhoto.artist_city || selectedPhoto.artist_country) && (
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.5)', margin: '3px 0 0' }}>
                  {[selectedPhoto.artist_city, selectedPhoto.artist_country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            {(() => { const slug = selectedPhoto.artist_instagram ? selectedPhoto.artist_instagram.replace('@', '') : selectedPhoto.artist_id; return (
            <button onClick={() => openArtistFromGallery(slug)}
              style={{ flexShrink: 0, padding: '8px 16px', background: '#000', borderRadius: 10, color: '#efff42', fontWeight: 800, fontSize: 12, border: 'none', cursor: loadingArtistSlug === slug ? 'default' : 'pointer', letterSpacing: '0.03em', opacity: loadingArtistSlug === slug ? 0.6 : 1 }}>
              {loadingArtistSlug === slug ? '...' : t('galeria', 'ver_artista', 'Ver artista')}
            </button>
            )})()}
          </div>
          </div>
          {/* Más fotos relacionadas */}
          {(() => {
            const rest = galleryPhotos.filter(p => p.photo_url !== selectedPhoto.photo_url)
            const selStyles = selectedPhoto.artist_styles ?? []
            const related = rest.filter(p => selStyles.length > 0 && (p.artist_styles ?? []).some(s => selStyles.includes(s)))
            const others  = rest.filter(p => !related.includes(p))
            const allOrdered = [...related, ...others]
            const ordered = activeStyleFilter
              ? allOrdered.filter(p => (p.artist_styles ?? []).includes(activeStyleFilter))
              : allOrdered
            if (ordered.length === 0) return null
            const photos = ordered.slice(0, detailDisplayCount)
            const renderCard = (p: typeof photos[0]) => (
              <div key={p.photo_url}>
                <div style={{ borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', minHeight: 80 }} onClick={() => navigateToPhoto(p)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photo_url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: 'auto', display: 'block', cursor: 'pointer' }} />
                </div>
                <button onClick={e => { e.stopPropagation(); const slug = p.artist_instagram ? p.artist_instagram.replace('@', '') : p.artist_id; openArtistFromGallery(slug) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px 2px', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.artist_photo} alt="" loading="lazy" decoding="async" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.artist_name}</span>
                </button>
              </div>
            )
            return (
              <div style={{ padding: '16px 20px 120px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
                    {photos.filter((_, i) => i % 2 === 0).map(renderCard)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
                    {photos.filter((_, i) => i % 2 === 1).map(renderCard)}
                  </div>
                </div>
                <div ref={detailSentinelRef} style={{ height: 1 }} />
              </div>
            )
          })()}
        </div>
      )}

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

function Logo({ s, dragRef, onOpen }: { s: Sponsor; dragRef: React.RefObject<{ moved: boolean }>; onOpen: (id: string) => void }) {
  const h = Math.round(34 * (s.logo_scale || 100) / 100)
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', cursor: 'pointer', height: 34 }}
      onClick={() => {
        if (dragRef.current?.moved) return
        fetch(`/api/sponsors-v2/${s.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'banner_click' }) }).catch(() => {})
        onOpen(s.id)
      }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={s.logo_url} alt={s.name ?? ''} draggable={false}
        style={{ height: h, width: 'auto', display: 'block', filter: s.keep_color ? 'none' : 'brightness(0) invert(1)', opacity: s.keep_color ? 1 : 0.7, transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
      />
    </div>
  )
}
