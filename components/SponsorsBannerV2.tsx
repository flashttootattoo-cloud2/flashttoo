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
function slugify(s: string) {
  return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
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

function CulturaVideoPlayer({ src, poster, forceMuted }: { src: string; poster: string; forceMuted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(true)

  function togglePlay() {
    const v = ref.current; if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }
  function toggleSound(e: React.MouseEvent) {
    e.stopPropagation()
    const v = ref.current; if (!v) return
    v.muted = !v.muted; setMuted(v.muted)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', cursor: 'pointer' }} onClick={togglePlay}>
      <video ref={ref} src={src} poster={poster} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 20, marginLeft: 3 }}>▶</span>
          </div>
        </div>
      )}
      {!forceMuted && <button onClick={toggleSound} style={{ position: 'absolute', bottom: 12, right: 12, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        {muted ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        )}
      </button>}
    </div>
  )
}

export default function SponsorsBannerV2({ city, country, conventions = [], flashDays = [], onOpenStudio, showEventsCountryFilter = false, showInsumos = true, onOverlayChange }: { city?: string; country?: string; conventions?: Convention[]; flashDays?: FlashDay[]; onOpenStudio?: (slug: string) => void; showEventsCountryFilter?: boolean; showInsumos?: boolean; onOverlayChange?: (open: boolean) => void }) {
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
  const [showCultura, setShowCultura] = useState(false)
  const [culturaArticles, setCulturaArticles] = useState<{ id: string; image_url: string; description: string; created_at: string; tags?: string[]; comment_count: number; recent_commenters: { id: string; emoji: string | null; photo_url: string | null }[] }[]>([])
  const [culturaLoaded, setCulturaLoaded] = useState(false)
  const [culturaTag, setCulturaTag] = useState<string | null>(null)
  const [culturaAvailableTags, setCulturaAvailableTags] = useState<string[]>([])
  const culturaLangRef = useRef<string>('')
  type CulturaVid = { id: string; video_url: string | null; cover_image_url: string; author_instagram: string; author_flashttoo_slug: string | null; instagram_video_url: string | null; description: string | null; description_en: string | null; description_pt: string | null; tags: string[]; tags_en: string[]; tags_pt: string[]; mute_audio: boolean; published_at: string | null; publish_at: string | null }
  function cvDesc(v: CulturaVid): string | null {
    const lang = language?.slice(0, 2)
    if (lang === 'en' && v.description_en) return v.description_en
    if (lang === 'pt' && v.description_pt) return v.description_pt
    return v.description
  }
  function cvTags(v: CulturaVid): string[] {
    const lang = language?.slice(0, 2)
    if (lang === 'en' && v.tags_en?.length) return v.tags_en
    if (lang === 'pt' && v.tags_pt?.length) return v.tags_pt
    return v.tags
  }
  const [culturaVideos, setCulturaVideos] = useState<CulturaVid[]>([])
  const [culturaVideosLoaded, setCulturaVideosLoaded] = useState(false)
  const [culturaArchived, setCulturaArchived] = useState<CulturaVid[]>([])
  const [culturaVideoTag, setCulturaVideoTag] = useState<string | null>(null)
  const [selectedCulturaVideo, setSelectedCulturaVideo] = useState<CulturaVid | null>(null)
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [galleryLoaded, setGalleryLoaded] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null)
  const [galleryDisplayCount, setGalleryDisplayCount] = useState(20)
  const galleryContainerRef = useRef<HTMLDivElement>(null)
  const culturaCarouselDragging = useRef(false)
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
  const [sponsorContactOpen, setSponsorContactOpen] = useState(false)
  const [galleryContactOpen, setGalleryContactOpen] = useState(false)
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
  const selectedPhotoRef        = useRef<GalleryPhoto | null>(null)
  const showGalleryRef          = useRef(false)
  const selectedIdRef           = useRef<string | null>(null)
  const showInfoRef             = useRef(false)
  const expandedRef             = useRef(false)
  const showCulturaRef          = useRef(false)
  const selectedCulturaVideoRef = useRef<CulturaVid | null>(null)

  // Sincronizar refs espejo con estado actual en cada render
  selectedPhotoRef.current        = selectedPhoto
  showGalleryRef.current          = showGallery
  selectedIdRef.current           = selectedId
  showInfoRef.current             = showInfo
  expandedRef.current             = expanded
  showCulturaRef.current          = showCultura
  selectedCulturaVideoRef.current = selectedCulturaVideo

  // Fetch una sola vez — mezcla aleatoria fija en este montaje
  useEffect(() => {
    onOverlayChange?.(!!selectedId)
  }, [selectedId, onOverlayChange])

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
        // Abrir perfil directo si la URL trae ?insumo=<id o slug>
        const insumoId = new URLSearchParams(window.location.search).get('insumo')
        const insumoMatch = insumoId && (all.find(s => s.id === insumoId) || all.find(s => slugify(s.name) === insumoId))
        if (insumoMatch) {
          history.replaceState(null, '', window.location.pathname)
          setSelectedId(insumoMatch.id)
          history.pushState({ sv2: 'detail' }, '')
          histDepthRef.current = 1
        }
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Abrir el perfil de un sponsor desde afuera (ej. tocando su nombre en la comunidad)
  useEffect(() => {
    function onOpenSponsor(e: Event) {
      const slug = (e as CustomEvent<string>).detail
      if (!slug) return
      const match = allRef.current.find(s => s.id === slug) || allRef.current.find(s => slugify(s.name) === slug)
      if (!match) return
      setSelectedId(match.id)
      history.pushState({ sv2: 'detail' }, '')
      histDepthRef.current++
    }
    window.addEventListener('open-sponsor', onOpenSponsor)
    return () => window.removeEventListener('open-sponsor', onOpenSponsor)
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
    const onVisible = () => { if (!document.hidden) dragRef.current.on = false }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('blur', () => { dragRef.current.on = false })
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisible)
    }
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
      if (showGalleryRef.current)          { setShowGallery(false); return }
      if (selectedCulturaVideoRef.current) { setSelectedCulturaVideo(null); return }
      if (showCulturaRef.current)          { setShowCultura(false); return }
      if (selectedIdRef.current)           { setSelectedId(null);   return }
      if (showInfoRef.current)             { setShowInfo(false);    return }
      if (expandedRef.current)             { setExpanded(false);    return }
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
    if (showCultura) {
      history.pushState({ sv2: 'cultura' }, '')
      histDepthRef.current++
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCultura])

  useEffect(() => {
    if (selectedCulturaVideo) {
      history.pushState({ sv2: 'cultura-video' }, '')
      histDepthRef.current++
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCulturaVideo])

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
    setShowGallery(false)
    setSelectedPhoto(null)
    photoStackRef.current = []
    histDepthRef.current = 0
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
        position: 'fixed', top: 0, left: 0, right: 0, bottom: convView ? 66 : 0, zIndex: 60,
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
                        <img src={s.detail_logo_url || s.logo_url} alt={s.name} style={{
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
                        <a href={/^https?:\/\//i.test(c.link) ? c.link : `https://${c.link}`} target="_blank" rel="noopener noreferrer"
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
                      <span style={{ display: 'inline-block', marginTop: 10, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#efff42', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(239,255,66,0.3)', borderRadius: 5, padding: '3px 8px' }}>
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
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
                        {/* Chip Contacto */}
                        {(sel.link || sel.instagram || sel.whatsapp) && (
                          <div style={{ marginTop: 16 }}>
                            <button onClick={() => setSponsorContactOpen(true)}
                              style={{ fontSize: 11, fontWeight: 700, color: sponsorContactOpen ? '#38bdf8' : '#000', background: sponsorContactOpen ? 'rgba(56,189,248,0.12)' : '#38bdf8', border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.04em' }}>
                              Contacto
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Línea decorativa amarilla */}
                  <div style={{ height: 1, background: 'linear-gradient(to right, rgba(239,255,66,0.25), transparent)', marginBottom: 20 }} />

                  {/* Modal contacto insumo */}
                  {sponsorContactOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}
                      onClick={() => setSponsorContactOpen(false)}>
                      <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
                      <div onClick={e => e.stopPropagation()}
                        style={{ width: '100%', maxWidth: 360, borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.9)', animation: 'slideUpModal 0.38s cubic-bezier(0.22,0.61,0.36,1)', overflow: 'hidden', background: 'rgba(18,18,20,0.78)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.08)' }}>

                        {/* Header */}
                        <div style={{ padding: '16px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{sel.name}</p>
                          <button onClick={() => setSponsorContactOpen(false)}
                            style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>

                        {/* Filas de contacto */}
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, margin: '0 10px', overflow: 'hidden' }}>
                          {sel.link && (
                            <a href={/^https?:\/\//i.test(sel.link) ? sel.link : `https://${sel.link}`} target="_blank" rel="noopener noreferrer"
                              onClick={() => { fetch(`/api/sponsors-v2/${sel.id}/click`, { method: 'POST' }).catch(() => {}); setSponsorContactOpen(false) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', textDecoration: 'none' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                              <span style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.85)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Web</span>
                            </a>
                          )}
                          {sel.instagram && (
                            <a href={`https://instagram.com/${sel.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                              onClick={() => { fetch(`/api/sponsors-v2/${sel.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'instagram_click' }) }).catch(() => {}); setSponsorContactOpen(false) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', textDecoration: 'none' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
                              <span style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.85)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Instagram</span>
                            </a>
                          )}
                          {sel.whatsapp && (
                            <a href={`https://wa.me/${sel.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                              onClick={() => { fetch(`/api/sponsors-v2/${sel.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'whatsapp_click' }) }).catch(() => {}); setSponsorContactOpen(false) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', textDecoration: 'none' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                              <span style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.85)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>WhatsApp</span>
                            </a>
                          )}
                        </div>

                        {/* Compartir */}
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, margin: '8px 10px 10px', overflow: 'hidden' }}>
                          <button onClick={() => {
                            const url = `${window.location.origin}${window.location.pathname}?insumo=${sel.name ? slugify(sel.name) : sel.id}`
                            if (navigator.share) { navigator.share({ title: sel.name ?? '', url }).catch(() => {}) }
                            else { navigator.clipboard.writeText(url).catch(() => {}) }
                            setSponsorContactOpen(false)
                          }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                            <span style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.85)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{t('insumos', 'share_btn', 'Compartir perfil')}</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Países */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
                    {sel.country
                      ? sel.country.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                          <span key={c} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                            {countryFlag(c)}{c}
                          </span>
                        ))
                      : (
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
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
          onTouchStart={e => { e.stopPropagation(); startDrag(e.touches[0].clientX) }}
          onTouchMove={e => { e.stopPropagation(); moveDrag(e.touches[0].clientX) }}
          onTouchEnd={e => { e.stopPropagation(); endDrag() }}
          onTouchCancel={e => { e.stopPropagation(); endDrag() }}
          onMouseDown={e => startDrag(e.clientX)}
          onMouseMove={e => moveDrag(e.clientX)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: selectedPhoto ? 75 : showGallery ? 65 : 40,
            padding: '0 20px',
            userSelect: 'none', touchAction: 'pan-x', cursor: 'grab',
          }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', background: '#000', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
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

      {/* Botones flotantes — Glass Pill */}
      <style>{`.ftpill{display:flex;align-items:center;justify-content:center;gap:0;height:44px;min-width:44px;padding:0 12px;border-radius:999px;border:none;cursor:pointer;font-size:10.5px;font-weight:700;letter-spacing:0.06em;white-space:nowrap;overflow:hidden;transition:background .22s,color .22s,gap .26s,padding .26s;-webkit-tap-highlight-color:transparent}.ftpill svg{flex-shrink:0;transition:transform .22s}.ftpill.fton svg{transform:scale(1.15)}.ftpill-lbl{max-width:0;overflow:hidden;opacity:0;transition:max-width .28s ease,opacity .2s}.ftpill.fton .ftpill-lbl{max-width:76px;opacity:1}.ftpill.fton{gap:7px;padding:0 16px 0 12px}`}</style>
      <div style={{ position: 'fixed', bottom: 76, left: 0, right: 0, zIndex: selectedPhoto ? 75 : (showGallery || expanded) ? 65 : showCultura ? 41 : 41, pointerEvents: 'none', display: selectedId ? 'none' : 'flex', justifyContent: 'center', padding: '0 20px' }}>
        <div style={{ maxWidth: '80rem', width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(12,12,12,0.62)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: 5, boxShadow: '0 4px 28px rgba(0,0,0,0.5)' }}>
            {/* Home */}
            <button className={`ftpill${!expanded && !showGallery && !showCultura ? ' fton' : ''}`}
              style={{ background: !expanded && !showGallery && !showCultura ? 'rgba(239,255,66,0.13)' : 'transparent', color: !expanded && !showGallery && !showCultura ? '#efff42' : 'rgba(255,255,255,0.35)' }}
              onClick={() => { setExpanded(false); setShowGallery(false); setShowCultura(false); setSelectedPhoto(null); photoStackRef.current = []; histDepthRef.current = 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/></svg>
              <span className="ftpill-lbl">Home</span>
            </button>
            {/* Galería */}
            <button className={`ftpill${showGallery ? ' fton' : ''}`}
              style={{ background: showGallery ? 'rgba(239,255,66,0.13)' : 'transparent', color: showGallery ? '#efff42' : 'rgba(255,255,255,0.35)' }}
              onClick={() => { setShowCultura(false); if (showGallery) { closeGallery() } else { loadGallery(); setGalleryDisplayCount(20); setShowGallery(true) } }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="10" rx="1"/><rect x="14" y="3" width="7" height="6" rx="1"/><rect x="14" y="13" width="7" height="8" rx="1"/><rect x="3" y="17" width="7" height="4" rx="1"/></svg>
              <span className="ftpill-lbl">{t('inicio', 'gallery_btn', 'Galería')}</span>
            </button>
            {/* cultura. */}
            <button className={`ftpill${showCultura ? ' fton' : ''}`}
              style={{ background: showCultura ? 'rgba(239,255,66,0.13)' : 'transparent', color: showCultura ? '#efff42' : 'rgba(255,255,255,0.35)' }}
              onClick={() => {
                if (showCultura) { setShowCultura(false); return }
                setSelectedPhoto(null); setShowGallery(false); setExpanded(false); photoStackRef.current = []; histDepthRef.current = 0
                setShowCultura(true)
                if (!culturaVideosLoaded) {
                  setCulturaVideosLoaded(true)
                  fetch(`/api/cultura-videos?status=active&lang=${language}`).then(r => r.json()).then(d => setCulturaVideos(d.videos ?? [])).catch(() => {})
                  fetch(`/api/cultura-videos?status=archived&lang=${language}`).then(r => r.json()).then(d => setCulturaArchived(d.videos ?? [])).catch(() => {})
                }
                if (!culturaLoaded || culturaLangRef.current !== language) {
                  culturaLangRef.current = language
                  setCulturaLoaded(false)
                  const qs = `/api/cultura?lang=${language}${culturaTag ? `&tag=${culturaTag}` : ''}`
                  fetch(qs).then(r => r.json()).then(d => {
                    const arts = d.articles ?? []
                    setCulturaArticles(arts)
                    setCulturaLoaded(true)
                    if (!culturaTag) {
                      const tags = [...new Set<string>(arts.flatMap((a: { tags?: string[] }) => a.tags ?? []))]
                      setCulturaAvailableTags(tags)
                    }
                  }).catch(() => {})
                }
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
              <span className="ftpill-lbl">{t('cultura', 'nav_btn', 'cultura')}</span>
            </button>
            {/* Insumos — tarrito de tinta */}
            {showInsumos && (
              <button className={`ftpill${expanded && !convView && !showGallery && !showCultura ? ' fton' : ''}`}
                style={{ background: expanded && !convView && !showGallery && !showCultura ? 'rgba(239,255,66,0.13)' : 'transparent', color: expanded && !convView && !showGallery && !showCultura ? '#efff42' : 'rgba(255,255,255,0.35)' }}
                onClick={() => { setSelectedPhoto(null); setShowGallery(false); setShowCultura(false); photoStackRef.current = []; histDepthRef.current = 0; setConvView(false); setExpanded(true); fetch('/api/track/app-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_name: 'insumos_open' }) }).catch(() => {}) }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="2" width="8" height="4" rx="1"/>
                  <path d="M6 6h12v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6z"/>
                  <line x1="6" y1="12" x2="18" y2="12"/>
                </svg>
                <span className="ftpill-lbl">{t('inicio', 'insumos_btn', 'Insumos')}</span>
              </button>
            )}
            {/* Eventos */}
            <button className={`ftpill${expanded && convView && !showGallery && !showCultura ? ' fton' : ''}`}
              style={{ background: expanded && convView && !showGallery && !showCultura ? 'rgba(239,255,66,0.13)' : 'transparent', color: expanded && convView && !showGallery && !showCultura ? '#efff42' : 'rgba(255,255,255,0.35)' }}
              onClick={() => { setSelectedPhoto(null); setShowGallery(false); setShowCultura(false); photoStackRef.current = []; histDepthRef.current = 0; setConvView(true); setExpanded(true); fetch('/api/track/app-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_name: 'eventos_open' }) }).catch(() => {}) }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span className="ftpill-lbl">{t('inicio', 'events_btn', 'Eventos')}</span>
            </button>
          </div>
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
                  <img src={p.photo_url} alt="" loading="lazy" decoding="async" onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1' }} style={{ width: '100%', height: 'auto', display: 'block', cursor: 'pointer', opacity: 0, transition: 'opacity 0.3s' }} />
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
          <div style={{ margin: '12px 20px 0', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(239,255,66,0.3)' }}>
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
                {sharePhotoCopied ? '✓' : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#efff42" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>}
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
          {(() => { const slug = selectedPhoto.artist_instagram ? selectedPhoto.artist_instagram.replace('@', '') : selectedPhoto.artist_id; return (
          <div style={{ background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPhoto.artist_photo} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(239,255,66,0.25)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#efff42', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPhoto.artist_name}</p>
              {(selectedPhoto.artist_city || selectedPhoto.artist_country) && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>
                  {[selectedPhoto.artist_city, selectedPhoto.artist_country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <button onClick={() => openArtistFromGallery(slug)}
              style={{ flexShrink: 0, padding: '8px 16px', background: '#efff42', borderRadius: 20, color: '#000', fontWeight: 800, fontSize: 12, border: 'none', cursor: loadingArtistSlug === slug ? 'default' : 'pointer', letterSpacing: '0.03em', opacity: loadingArtistSlug === slug ? 0.6 : 1 }}>
              {loadingArtistSlug === slug ? '...' : t('galeria', 'ver_artista', 'Ver artista')}
            </button>
          </div>
          )})()}
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
                <img src={p.photo_url} alt="" loading="lazy" decoding="async" onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1' }} style={{ width: '100%', height: 'auto', display: 'block', cursor: 'pointer', opacity: 0, transition: 'opacity 0.3s' }} />
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

      {/* cultura. overlay */}
      {showCultura && (
        <div style={{ position: 'fixed', top: 0, bottom: 0, left: 'max(0px, calc(50% - 40rem))', right: 'max(0px, calc(50% - 40rem))', zIndex: selectedCulturaVideo ? 95 : 39, background: '#0a0a0a', overflowY: 'auto', overflowX: 'hidden', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {/* Header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logoprincipal.svg" alt="Flashttoo" onClick={() => setShowCultura(false)} style={{ height: 28, opacity: 0.9, flex: '0 0 auto', cursor: 'pointer' }} />
            <span style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#efff42', pointerEvents: 'none' }}>{t('cultura', 'nav_btn', 'cultura')}</span>
            <button onClick={() => setShowCultura(false)} style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>×</button>
          </div>
          {/* Tags scroll */}
          {/* Video carousel */}
          {(culturaVideos.length > 0 || culturaArchived.length > 0) && (() => {
            const allVideoTags = Array.from(new Set([...culturaVideos, ...culturaArchived].flatMap(v => cvTags(v)))).sort()
            const filteredActive = culturaVideoTag ? culturaVideos.filter(v => cvTags(v).includes(culturaVideoTag)) : culturaVideos
            const filteredArchived = culturaVideoTag ? culturaArchived.filter(v => cvTags(v).includes(culturaVideoTag)) : culturaArchived
            return (<>
            {allVideoTags.length > 0 && (
              <div style={{ overflowX: 'auto', display: 'flex', gap: 0, padding: '10px 16px 0', scrollbarWidth: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'grab', userSelect: 'none' }}
                onTouchStart={e => e.stopPropagation()}
                onTouchMove={e => e.stopPropagation()}
                onTouchEnd={e => e.stopPropagation()}
                onWheel={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).scrollLeft += e.deltaY }}
                onMouseDown={e => { const el = e.currentTarget; const startX = e.pageX - el.offsetLeft; const sl = el.scrollLeft; const onMove = (ev: MouseEvent) => { el.scrollLeft = sl - (ev.pageX - el.offsetLeft - startX) }; const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }}>
                {[null, ...allVideoTags].map(tag => {
                  const active = culturaVideoTag === tag
                  const label = tag ?? t('cultura', 'filter_all', 'Todo')
                  return (
                    <button key={label} onClick={() => setCulturaVideoTag(tag)}
                      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 14px 8px', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? '#efff42' : 'rgba(255,255,255,0.4)', borderBottom: active ? '2px solid #efff42' : '2px solid transparent', transition: 'color .18s,border-color .18s', whiteSpace: 'nowrap' }}>
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          {filteredActive.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', padding: '0 16px', marginBottom: 10 }}>{t('cultura', 'carousel_title', 'Últimas 7 portadas')}</p>
              <div
                style={{ overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', cursor: 'grab', userSelect: 'none' }}
                onTouchStart={e => e.stopPropagation()}
                onTouchMove={e => e.stopPropagation()}
                onTouchEnd={e => e.stopPropagation()}
                onWheel={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).scrollLeft += e.deltaY + e.deltaX }}
                onMouseDown={e => { culturaCarouselDragging.current = false; const el = e.currentTarget; el.style.cursor = 'grabbing'; const startX = e.pageX - el.offsetLeft; const sl = el.scrollLeft; const onMove = (ev: MouseEvent) => { if (Math.abs(ev.pageX - el.offsetLeft - startX) > 4) culturaCarouselDragging.current = true; el.scrollLeft = sl - (ev.pageX - el.offsetLeft - startX) }; const onUp = () => { el.style.cursor = 'grab'; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }}
              >
                <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 10, padding: '0 16px 4px', width: 'max-content', minWidth: '100%', boxSizing: 'border-box', justifyContent: 'center' }}>
                {filteredActive.map(v => {
                  const ig = v.author_instagram.startsWith('@') ? v.author_instagram : `@${v.author_instagram}`
                  return (
                    <div key={v.id} onClick={() => { if (!culturaCarouselDragging.current) setSelectedCulturaVideo(v) }} style={{ flexShrink: 0, width: 130, borderRadius: 12, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', cursor: 'pointer' }}>
                      <div style={{ position: 'relative', aspectRatio: '9/16' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {v.video_url && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ color: '#fff', fontSize: 11, marginLeft: 2 }}>▶</span>
                            </div>
                          </div>
                        )}
                        {cvTags(v).length > 0 && (
                          <div style={{ position: 'absolute', top: 7, left: 7 }}>
                            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>{cvTags(v)[0]}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '7px 9px 10px' }}>
                        {v.author_flashttoo_slug
                          ? <button onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-artist', { detail: v.author_flashttoo_slug })) }} style={{ fontSize: 10, fontWeight: 700, color: '#efff42', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>{ig}</button>
                          : <a href={`https://instagram.com/${ig.slice(1)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, fontWeight: 700, color: '#efff42', textDecoration: 'none' }}>{ig}</a>
                        }
                        {cvDesc(v) && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cvDesc(v)}</p>}
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>
            </div>
          )}

          {filteredArchived.length > 0 && (
            <div style={{ padding: '20px 16px 16px 20px', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>{t('cultura', 'archive_title', 'Archivo')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', transform: 'translateZ(0)' }}>
                {filteredArchived.map(v => {
                  const ig = v.author_instagram.startsWith('@') ? v.author_instagram : `@${v.author_instagram}`
                  return (
                    <div key={v.id} onClick={() => setSelectedCulturaVideo(v)} style={{ borderRadius: 10, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.cover_image_url} alt="" style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)' }} />
                      <div style={{ position: 'absolute', bottom: 7, left: 8, right: 8 }}>
                        {v.author_flashttoo_slug
                          ? <button onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-artist', { detail: v.author_flashttoo_slug })) }} style={{ fontSize: 9, fontWeight: 700, color: '#efff42', lineHeight: 1.2, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>{ig}</button>
                          : <p style={{ fontSize: 9, fontWeight: 700, color: '#efff42', lineHeight: 1.2 }}>{ig}</p>
                        }
                      </div>
                      {cvTags(v).length > 0 && (
                        <div style={{ position: 'absolute', top: 6, left: 6 }}>
                          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 5px', borderRadius: 3, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>{cvTags(v)[0]}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          </>)
          })()}

          {/* Video fullscreen modal */}
          {selectedCulturaVideo && (() => {
            const sv = selectedCulturaVideo
            const ig = sv.author_instagram.startsWith('@') ? sv.author_instagram : `@${sv.author_instagram}`
            return (
              <div onClick={() => setSelectedCulturaVideo(null)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <style>{`@keyframes cvExpand{from{opacity:0;transform:scale(0.93) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
                <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 340, borderRadius: 20, overflow: 'hidden', background: '#0a0a0a', animation: 'cvExpand 0.45s cubic-bezier(0.22,0.61,0.36,1)', boxShadow: '0 32px 80px rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ position: 'relative', aspectRatio: '9/16', background: '#000' }}>
                    {sv.video_url
                      ? <CulturaVideoPlayer src={sv.video_url} poster={sv.cover_image_url} forceMuted={sv.mute_audio} />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={sv.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    }
                    {cvTags(sv).length > 0 && (
                      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 5 }}>
                        {cvTags(sv).slice(0, 2).map(t => (
                          <span key={t} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '14px 16px 18px' }}>
                    {sv.author_flashttoo_slug
                      ? <button onClick={e => { e.stopPropagation(); setSelectedCulturaVideo(null); window.dispatchEvent(new CustomEvent('open-artist', { detail: sv.author_flashttoo_slug })) }} style={{ fontSize: 13, fontWeight: 700, color: '#efff42', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{ig}</button>
                      : <a href={`https://instagram.com/${ig.slice(1)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 13, fontWeight: 700, color: '#efff42', textDecoration: 'none' }}>{ig}</a>
                    }
                    {cvDesc(sv) && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 5, lineHeight: 1.5, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                        {cvDesc(sv)!.split(/(@[\w.]+)/g).map((part, i) =>
                          /^@[\w.]+$/.test(part)
                            ? <a key={i} href={`https://instagram.com/${part.slice(1)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#efff42', textDecoration: 'none', fontWeight: 600 }}>{part}</a>
                            : part
                        )}
                      </p>
                    )}
                    {!sv.video_url && sv.instagram_video_url && (
                      <a href={sv.instagram_video_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                        </svg>
                        {t('cultura', 'see_on_instagram', 'Ver video en Instagram')}
                      </a>
                    )}
                    {(sv.published_at ?? sv.publish_at) && (
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
                        {t('cultura', 'cover_prefix', 'Portada')} · {new Date((sv.published_at ?? sv.publish_at)!).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setSelectedCulturaVideo(null)} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            )
          })()}

          <div style={{ height: 120 }} />
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
