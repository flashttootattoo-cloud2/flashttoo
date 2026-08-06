'use client'

import React, { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase, type Artist, type Studio } from '@/lib/supabase'
import EditPanel from '@/components/EditPanel'
import SponsorsBanner from '@/components/SponsorsBanner'
import SponsorsBannerV2 from '@/components/SponsorsBannerV2'
import ConventionModal from '@/components/ConventionModal'
import StudioPanel from '@/components/StudioPanel'
import { INTERVIEW_QUESTIONS } from '@/lib/interview'
import { useTranslation } from '@/contexts/TranslationContext'

function BioText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const parts = text.split(/(@[a-zA-Z0-9_.]{1,30})/g)
  return (
    <p style={style}>
      {parts.map((part, i) =>
        /^@[a-zA-Z0-9_.]{1,30}$/.test(part) ? (
          <a key={i} href={`https://www.instagram.com/${part.slice(1)}`} target="_blank" rel="noopener noreferrer"
            style={{ color: '#efff42', fontWeight: 600, textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}>
            {part}
          </a>
        ) : part
      )}
    </p>
  )
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last  = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const DEFAULT_STYLES = [
  'Tradicional','Realismo','Blackwork','Acuarela','Geométrico',
  'Japonés','Neo Tradicional','Minimalista','Old School','Dotwork',
  'Fineline','Lettering','Tribal','Biomecánico','Cover-up','Ornamental','Otros',
]

type Ad = {
  id: string; title: string; image_url: string; link: string | null
  city: string | null; country: string | null
  instagram: string | null; whatsapp: string | null; website: string | null
  clicks: number; show_global: boolean; expires_at: string | null
}

type ContentCard = {
  id: string; title: string; body: string; active: boolean
}

type Convention = { id: string; name: string | null; image_url: string; link: string | null; expires_at: string | null; country: string | null }

const AD_INTERVAL = 15

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function norm(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k'
  return String(n)
}

const StatItem = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{fmt(value)}</span>
    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
  </div>
)


function trackView(id: string) {
  fetch(`/api/track/view/${id}`, { method: 'POST' }).catch(() => {})
}
function trackClick(id: string, type: 'instagram' | 'whatsapp' | 'ad' | 'like' | 'unlike') {
  fetch(`/api/track/click/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) }).catch(() => {})
}

export default function Home() {
  const { t, language, setLanguage, languages } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const [artists, setArtists]     = useState<Artist[]>([])
  const [ads, setAds]             = useState<Ad[]>([])
  const [allStyles, setAllStyles] = useState<string[]>(DEFAULT_STYLES)
  const [country, setCountry]     = useState(() => { try { return sessionStorage.getItem('s_country') || '' } catch { return '' } })
  const [city, setCity]           = useState(() => { try { return sessionStorage.getItem('s_city')    || '' } catch { return '' } })
  const [activeStyles, setStyles] = useState<string[]>(() => { try { return JSON.parse(sessionStorage.getItem('s_styles') || '[]') } catch { return [] } })
  const [stylesOpen, setStylesOpen] = useState(false)
  const stylesRef = useRef<HTMLDivElement>(null)
  const deepLinkHandled = useRef(false)
  const [selected, setSelected]   = useState<Artist | null>(null)
  const [editing, setEditing]         = useState(false)
  const [editOpen, setEditOpen]       = useState(false)
  const [editKey, setEditKey]         = useState('')
  const [editKeyError, setEditKeyError] = useState('')
  const [editVerifying, setEditVerifying] = useState(false)
  const [editKeyVerified, setEditKeyVerified] = useState('')
  const [liked, setLiked]             = useState(false)
  const [localLikes, setLocalLikes]   = useState(0)
  const [copied, setCopied]           = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [loading, setLoading]         = useState(true)
  const [conventions, setConventions]       = useState<Convention[]>([])
  const [flashDays, setFlashDays]           = useState<{ id: string; studio_slug: string; studio_name: string; flyer_url: string; date: string }[]>([])
  const [contentCards, setContentCards]     = useState<ContentCard[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [selectedStudioSlug, setSelectedStudioSlug] = useState<string | null>(null)
  const selectedStudioSlugRef = useRef<string | null>(null)
  selectedStudioSlugRef.current = selectedStudioSlug
  const studioDeepLinkHandled = useRef(false)
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Set<string>>(new Set())
  const markPhotoBroken = (id: string) =>
    setBrokenPhotoIds(prev => prev.has(id) ? prev : new Set(prev).add(id))
  const shuffledContentCards = useMemo(
    () => [...contentCards].filter(c => c.active).sort(() => Math.random() - 0.5),
    [contentCards]
  )
  const [showCount, setShowCount]           = useState(false)
  const [galleryEnabled, setGalleryEnabled] = useState(false)
  const [eventsCountryFilter, setEventsCountryFilter] = useState(false)
  const [totalActiveArtists, setTotalActiveArtists] = useState<number | null>(null)
  const [fullscreenImg, setFullscreenImg]   = useState<string | null>(null)
  const [fullscreenPhotos, setFullscreenPhotos] = useState<string[]>([])
  const [fullscreenIdx, setFullscreenIdx]   = useState(0)
  const fullscreenRef = useRef<string | null>(null)
  const fsSwipeRef    = useRef<{ startX: number } | null>(null)
  const [fsDragX, setFsDragX]       = useState(0)
  const [fsDragging, setFsDragging] = useState(false)
  const [secretCard, setSecretCard] = useState<{ image_url: string; back_image_url?: string; artist_name: string; city: string; link: string; caption: string; number?: string } | null>(null)
  const [showSecretCard, setShowSecretCard] = useState(false)
  const logoTapsRef = useRef<number[]>([])
  const openFullscreen = (src: string, photos?: string[]) => {
    const list = photos ?? [src]
    const idx  = list.indexOf(src)
    fullscreenRef.current = src
    setFullscreenPhotos(list)
    setFullscreenIdx(idx >= 0 ? idx : 0)
    history.pushState({ fullscreen: true }, '')
    setFullscreenImg(src)
  }
  const BATCH = 50
  const [hasMoreArtists, setHasMoreArtists] = useState(true)
  const [loadingMore, setLoadingMore]       = useState(false)
  const sentinelRef    = useRef<HTMLDivElement>(null)
  const offsetRef      = useRef(0)
  const loadingMoreRef = useRef(false)
  const loadGenRef     = useRef(0)
  const seedRef        = useRef(Math.random() * 2 - 1)
  const filterRef      = useRef({ country, city, styles: activeStyles })
  filterRef.current = { country, city, styles: activeStyles }
  const [selectedContent, setSelectedContent] = useState<ContentCard | null>(null)
  const [selectedAd, setSelectedAd]           = useState<Ad | null>(null)
  const [adEditSection, setAdEditSection]     = useState(false)
  const [adKeyInput, setAdKeyInput]           = useState('')
  const [adKeyError, setAdKeyError]           = useState('')
  const [adKeyVerified, setAdKeyVerified]     = useState(false)
  const [adEditForm, setAdEditForm]           = useState({ title: '', city: '', country: '', instagram: '', whatsapp: '', website: '' })
  const [adEditPhoto, setAdEditPhoto]         = useState<File | null>(null)
  const [adEditPhotoPreview, setAdEditPhotoPreview] = useState<string | null>(null)
  const [savingAdEdit, setSavingAdEdit]       = useState(false)

  const loadArtistsPage = useCallback(async (
    offset: number,
    append: boolean,
    filters: { country: string; city: string; styles: string[] }
  ) => {
    if (loadingMoreRef.current && append) return
    loadingMoreRef.current = true
    if (append) setLoadingMore(true)
    const gen = loadGenRef.current

    const { data } = await supabase.rpc('search_artists', {
      p_country: filters.country.trim(),
      p_city:    filters.city.trim(),
      p_styles:  filters.styles,
      p_offset:  offset,
      p_limit:   BATCH,
      p_seed:    seedRef.current,
    })
    if (gen !== loadGenRef.current) {
      loadingMoreRef.current = false
      if (append) setLoadingMore(false)
      return
    }
    const batch = (data || []) as Artist[]
    if (append) {
      setArtists(prev => {
        const seen = new Set(prev.map(a => a.id))
        return [...prev, ...batch.filter(a => !seen.has(a.id))]
      })
    } else {
      setArtists(batch)
    }
    offsetRef.current = offset + batch.length
    setHasMoreArtists(batch.length === BATCH)
    loadingMoreRef.current = false
    if (append) setLoadingMore(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (stylesRef.current && !stylesRef.current.contains(e.target as Node)) setStylesOpen(false)
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Contar visitante único por día (1 vez por dispositivo por día)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (localStorage.getItem('last_visit') !== today) {
      fetch('/api/track/pageview', { method: 'POST' }).catch(() => {})
      localStorage.setItem('last_visit', today)
    }
  }, [])

  useEffect(() => {
    const onPop = () => {
      if (fullscreenRef.current) {
        setFullscreenImg(null)
        // Clear ref after all popstate handlers in this event have run
        setTimeout(() => { fullscreenRef.current = null }, 0)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const onPop = () => { setShowSecretCard(false) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Persistir filtros en sessionStorage para restaurarlos si el browser recarga la pestaña
  useEffect(() => { try { sessionStorage.setItem('s_country', country.trim()) } catch {} }, [country])
  useEffect(() => { try { sessionStorage.setItem('s_city', city.trim()) } catch {} }, [city])
  useEffect(() => { try { sessionStorage.setItem('s_styles', JSON.stringify(activeStyles)) } catch {} }, [activeStyles])

  // Guardar posición de scroll mientras navega
  useEffect(() => {
    const save = () => { try { sessionStorage.setItem('s_scroll', String(window.scrollY)) } catch {} }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [])

  // Restaurar scroll una sola vez al cargar la primera tanda de artistas
  const scrollRestored = useRef(false)
  useEffect(() => {
    if (loading || artists.length === 0 || scrollRestored.current) return
    scrollRestored.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.has('artista') || params.has('estudio')) return
    try {
      const saved = sessionStorage.getItem('s_scroll')
      if (saved && parseInt(saved) > 100) {
        requestAnimationFrame(() => window.scrollTo({ top: parseInt(saved), behavior: 'instant' }))
      }
    } catch {}
  }, [loading, artists.length])

  useEffect(() => {
    fetch('/api/styles').then(r => r.json()).then(d => { if (d.styles) setAllStyles(d.styles) }).catch(() => {})
    fetch('/api/features').then(r => r.json()).then(d => { if (d.artist_gallery === true) setGalleryEnabled(true); if (d.events_country_filter === true) setEventsCountryFilter(true) }).catch(() => {})
    fetch('/api/secret-card').then(r => r.json()).then(d => { if (d.card) setSecretCard(d.card) }).catch(() => {})
    supabase.from('artists').select('id', { count: 'exact', head: true }).eq('visible', true).then(({ count }) => { if (typeof count === 'number') setTotalActiveArtists(count) })
    fetch('/api/conventions').then(r => r.json()).then(d => { if (Array.isArray(d.conventions)) setConventions(d.conventions) }).catch(() => {})
    fetch('/api/flash-days').then(r => r.json()).then(d => { if (Array.isArray(d.flashDays)) setFlashDays(d.flashDays) }).catch(() => {})
    fetch('/api/studios').then(r => r.json()).then(d => { if (Array.isArray(d.studios)) setStudios(shuffle(d.studios)) }).catch(() => {})
    supabase.from('settings').select('value').eq('key', 'show_count').single().then(({ data }) => { if (data?.value === true) setShowCount(true) })
  }, [])

  useEffect(() => {
    fetch(`/api/content-cards?lang=${language}`).then(r => r.json()).then(d => { if (Array.isArray(d.cards)) setContentCards(d.cards) }).catch(() => {})
  }, [language])

  useEffect(() => {
    const loadAds = async (): Promise<Ad[]> => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('ads')
        .select('id,title,image_url,link,city,country,instagram,whatsapp,website,clicks,show_global,expires_at')
        .eq('active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
      if (error) {
        // columnas nuevas todavía no existen → fallback sin ellas
        const { data: fallback } = await supabase
          .from('ads')
          .select('id,title,image_url,link,city,country,instagram,whatsapp,website,clicks')
          .eq('active', true)
        return ((fallback || []) as Ad[]).map(ad => ({ ...ad, show_global: false, expires_at: null }))
      }
      return ((data || []) as Ad[]).map(ad => ({ ...ad, show_global: ad.show_global ?? false, expires_at: ad.expires_at ?? null }))
    }
    loadAds().then(ads => setAds(shuffle(ads)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load + refetch on filter change
  const filterKey = `${country}|${city}|${activeStyles.join(',')}`
  const isFirstLoad = useRef(true)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadGenRef.current++
      seedRef.current = Math.random() * 2 - 1
      offsetRef.current = 0
      loadingMoreRef.current = false
      scrollRestored.current = false
      setHasMoreArtists(true)
      setLoading(true)
      loadArtistsPage(0, false, { country, city, styles: activeStyles })
        .then(() => setLoading(false))
      isFirstLoad.current = false
    }, 300)
    return () => clearTimeout(timer)
  }, [filterKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track searches separately with a long debounce so partial typed values don't get recorded
  const isFirstTrack = useRef(true)
  useEffect(() => {
    if (isFirstTrack.current) { isFirstTrack.current = false; return }
    if (!(country.trim() || city.trim() || activeStyles.length > 0)) return
    const timer = setTimeout(() => {
      fetch('/api/track/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, city, styles: activeStyles }),
      }).catch(() => {})
    }, 4000)
    return () => clearTimeout(timer)
  }, [filterKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMoreArtists) {
        loadArtistsPage(offsetRef.current, true, filterRef.current)
      }
    }, { rootMargin: '400px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMoreArtists, loadArtistsPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const prevIsFiltering = useRef(false)
  useLayoutEffect(() => {
    const filtering = !!country.trim() || !!city.trim() || activeStyles.length > 0
    if (prevIsFiltering.current !== filtering) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      try { sessionStorage.setItem('s_scroll', '0') } catch {}
    }
    prevIsFiltering.current = filtering
  }, [country, city, activeStyles])

  const toggleStyle = (s: string) =>
    setStyles(prev => prev.includes(s) ? [] : [s])

  const qCountry = norm(country)
  const qCity    = norm(city)

  const filtered = artists.filter(a => a.visible !== false)

  const isActiveSearch = !!country.trim() || !!city.trim() || activeStyles.length > 0
  const hasLocationSearch = !!qCity || !!qCountry

  // Sin ubicación: solo ads marcadas "en inicio" por el admin. Con ciudad/país: ads de esa ubicación
  const visibleAds = !hasLocationSearch
    ? ads.filter(ad => ad.show_global)
    : ads.filter(ad => {
        const cityMatch    = !qCity    || norm(ad.city).includes(qCity)
        const countryMatch = !qCountry || norm(ad.country).includes(qCountry)
        return cityMatch && countryMatch
      })

  // Filtrar estudios por país/ciudad y/o estilo activo
  const visibleStudios = studios.filter(s => {
    const locationOk = !hasLocationSearch ||
      ((!qCity    || norm(s.city).includes(qCity)) &&
       (!qCountry || norm(s.country).includes(qCountry)))
    const styleOk = activeStyles.length === 0 ||
      (Array.isArray(s.styles) && activeStyles.some(st => s.styles!.includes(st)))
    return locationOk && styleOk
  })

  // Mezclar ads en el feed cada AD_INTERVAL artistas
  // Estudios: 1 cada 9 artistas, posición aleatoria pero estable durante la sesión
  const STUDIO_WINDOW = 9
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const studioInsertAt = useMemo(() => studios.map((_, si) =>
    Math.max(3, si * STUDIO_WINDOW) + Math.floor(Math.random() * STUDIO_WINDOW)
  ), [studios.length])
  const feedItems: Array<{ type: 'artist'; data: Artist } | { type: 'ad'; data: Ad } | { type: 'studio'; data: Studio }> = []
  let adIdx = 0
  let studioIdx = 0
  filtered.forEach((artist, i) => {
    feedItems.push({ type: 'artist', data: artist })
    if ((i + 1) % AD_INTERVAL === 0 && adIdx < visibleAds.length) {
      feedItems.push({ type: 'ad', data: visibleAds[adIdx++] })
    }
    while (studioIdx < visibleStudios.length && studioInsertAt[studioIdx] <= i) {
      feedItems.push({ type: 'studio', data: visibleStudios[studioIdx++] })
    }
  })
  // Items que no entraron por pocos artistas → al final
  while (adIdx < visibleAds.length) {
    feedItems.push({ type: 'ad', data: visibleAds[adIdx++] })
  }
  while (studioIdx < visibleStudios.length) {
    feedItems.push({ type: 'studio', data: visibleStudios[studioIdx++] })
  }

  // Cada 14 artistas hay uno grande; la posición dentro del grupo varía por grupo
  const GROUP = 14
  const GROUP_OFFSETS = [6, 3, 9, 2, 10, 4, 7, 5, 11, 3, 8, 6, 10, 4]
  const artistItems = feedItems.filter(i => i.type === 'artist') as { type: 'artist'; data: Artist }[]
  const featuredMap = new Map<string, boolean>() // id → rightAlign
  for (let g = 0; g * GROUP < artistItems.length; g++) {
    const offset = GROUP_OFFSETS[g % GROUP_OFFSETS.length]
    const idx = g * GROUP + offset
    if (idx < artistItems.length) featuredMap.set(artistItems[idx].data.id, g % 2 === 1)
  }

  // Pre-armar bloques: featured → [featured, small1, small2] | single → [item]
  type FI = typeof feedItems[0]
  type Block =
    | { kind: 'single'; item: FI; fi: number }
    | { kind: 'featured'; big: FI; s1: FI; s2: FI; fi: number; rightAlign: boolean }
    | { kind: 'content'; card: ContentCard; fi: number; rightAlign: boolean }
  const blocks: Block[] = []
  for (let fi = 0; fi < feedItems.length; ) {
    const cur = feedItems[fi]
    if (cur.type === 'artist' && featuredMap.has(cur.data.id) && fi + 2 < feedItems.length) {
      blocks.push({ kind: 'featured', big: cur, s1: feedItems[fi + 1], s2: feedItems[fi + 2], fi, rightAlign: featuredMap.get(cur.data.id)! })
      fi += 3
    } else {
      blocks.push({ kind: 'single', item: cur, fi })
      fi++
    }
  }

  const finalBlocks = blocks

  const openModal = useCallback((artist: Artist) => {
    setSelected(artist)
    const alreadyLiked = localStorage.getItem(`liked_${artist.id}`) === '1'
    setLiked(alreadyLiked)
    setLocalLikes((artist.likes ?? 0) + (alreadyLiked ? 1 : 0))
    trackView(artist.id)
    const slug = artist.instagram ? artist.instagram.replace('@', '') : artist.id
    window.history.pushState({}, '', `/?artista=${slug}`)
    ;[artist.gallery_photo_1, artist.gallery_photo_2, artist.gallery_photo_3].forEach(src => {
      if (src) { const img = new window.Image(); img.src = src }
    })
  }, [])

  // Deep link: abre el panel de estudio si la URL tiene ?estudio=slug
  useEffect(() => {
    if (studioDeepLinkHandled.current) return
    const slug = new URLSearchParams(window.location.search).get('estudio')
    if (slug) {
      studioDeepLinkHandled.current = true
      setSelectedStudioSlug(slug)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link: abre el modal si la URL tiene ?artista=ID
  useEffect(() => {
    if (deepLinkHandled.current) return
    const id = new URLSearchParams(window.location.search).get('artista')
    if (!id) return

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // Esperar a que carguen los artistas
    if (loading || artists.length === 0) return
    deepLinkHandled.current = true
    const artist = isUuid
      ? artists.find(a => a.id === id)
      : artists.find(a => a.instagram?.replace('@', '') === id)
    if (artist) {
      openModal(artist)
    } else {
      const query = isUuid
        ? supabase.from('artists').select('*').eq('id', id).single()
        : supabase.from('artists').select('*').ilike('instagram', id).single()
      query.then(({ data }) => { if (data) openModal(data as Artist) })
    }
  }, [artists, loading, openModal])

  const toggleLike = useCallback(() => {
    if (!selected) return
    if (liked) {
      localStorage.removeItem(`liked_${selected.id}`)
      setLiked(false)
      setLocalLikes(n => Math.max(0, n - 1))
      trackClick(selected.id, 'unlike')
    } else {
      localStorage.setItem(`liked_${selected.id}`, '1')
      setLiked(true)
      setLocalLikes(n => n + 1)
      trackClick(selected.id, 'like')
    }
  }, [selected, liked])

  const shareArtist = useCallback(async () => {
    if (!selected) return
    const slug = selected.instagram ? selected.instagram.replace('@', '') : selected.id
    const url = `${window.location.origin}/?artista=${slug}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${selected.name} — Flashttoo`, text: `Mirá el perfil de ${selected.name} en Flashttoo`, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch { /* usuario canceló */ }
  }, [selected])

  const verifyEditKey = useCallback(async () => {
    if (!selected || !editKey.trim()) return
    setEditVerifying(true); setEditKeyError('')
    const res = await fetch(`/api/artists/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editKey: editKey.trim().toUpperCase(), _verify: true }),
    })
    if (res.ok) {
      setEditKeyVerified(editKey.trim().toUpperCase())
      setEditOpen(false)
      setEditing(true)
    } else {
      setEditKeyError(t('artista', 'wrong_key', 'Clave incorrecta. Si la perdiste, contactanos por Instagram @flashttoo'))
    }
    setEditVerifying(false)
  }, [selected, editKey])

  const handleLogoTap = useCallback(() => {
    const now = Date.now()
    const taps = logoTapsRef.current
    taps.push(now)
    if (taps.length > 3) taps.shift()
    if (taps.length === 3 && taps[2] - taps[0] < 1500 && secretCard?.image_url) {
      history.pushState({ secretCard: true }, '')
      setShowSecretCard(true)
      logoTapsRef.current = []
    }
  }, [secretCard])

  const closeModal = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelected(null)
      setEditOpen(false)
      setEditKey('')
      setEditKeyError('')
      const studioSlug = selectedStudioSlugRef.current
      if (studioSlug) window.history.pushState({}, '', `/?estudio=${studioSlug}`)
      else window.history.pushState({}, '', '/')
    }
  }, [])

  const closeModalFull = useCallback(() => {
    setSelected(null)
    setEditOpen(false)
    setEditKey('')
    setEditKeyError('')
    const studioSlug = selectedStudioSlugRef.current
    if (studioSlug) window.history.pushState({}, '', `/?estudio=${studioSlug}`)
    else window.history.pushState({}, '', '/')
  }, [])

  const openStudio = useCallback((slug: string) => {
    setSelectedStudioSlug(slug)
    history.pushState({ estudio: slug }, '', `/?estudio=${slug}`)
    const k = `vs_${slug}`
    if (!sessionStorage.getItem(k)) {
      sessionStorage.setItem(k, '1')
      fetch(`/api/studios/${slug}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'profile_view' }) }).catch(() => {})
    }
  }, [])

  const closeStudio = useCallback(() => {
    setSelectedStudioSlug(null)
    history.pushState({}, '', '/')
  }, [])

  const verifyAdKey = async () => {
    if (!selectedAd || adKeyInput.length < 10) { setAdKeyError('La clave debe tener 10 caracteres'); return }
    const r = await fetch(`/api/ads/${selectedAd.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edit_key: adKeyInput, verify_only: true }),
    })
    if (!r.ok) { setAdKeyError('Clave incorrecta. Si la perdiste, contactanos por Instagram @flashttoo'); return }
    setAdKeyVerified(true)
  }

  const saveAdEdit = async () => {
    if (!selectedAd) return
    setSavingAdEdit(true)
    try {
      const fd = new FormData()
      fd.append('edit_key', adKeyInput)
      Object.entries(adEditForm).forEach(([k, v]) => fd.append(k, v))
      if (adEditPhoto) fd.append('photo', adEditPhoto)
      const r = await fetch(`/api/ads/${selectedAd.id}`, { method: 'PATCH', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error')
      const updated = { ...selectedAd, ...adEditForm, ...(d.ad?.image_url ? { image_url: d.ad.image_url } : {}) }
      setSelectedAd(updated)
      setAds(prev => prev.map(a => a.id === selectedAd.id ? { ...a, ...updated } : a))
      setAdEditSection(false)
      setAdKeyVerified(false)
      setAdEditPhoto(null)
      setAdEditPhotoPreview(null)
    } catch (err: unknown) {
      setAdKeyError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingAdEdit(false)
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedAd) { setSelectedAd(null); return }
        if (selectedContent) { setSelectedContent(null); return }
        if (selected) { closeModalFull(); return }
        if (selectedStudioSlug) { closeStudio() }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [closeModalFull, closeStudio, selected, selectedContent, selectedAd, selectedStudioSlug])

  // Botón atrás del celular: cierra el modal sin tocar el historial (el browser ya lo hizo)
  useEffect(() => {
    const h = () => {
      if (fullscreenRef.current) return
      if (selectedContent) {
        setSelectedContent(null)
      } else if (selected) {
        setSelected(null)
        setEditOpen(false)
        setEditKey('')
        setEditKeyError('')
      } else if (selectedStudioSlug) {
        setSelectedStudioSlug(null)
      }
    }
    window.addEventListener('popstate', h)
    return () => window.removeEventListener('popstate', h)
  }, [selected, selectedContent, selectedStudioSlug])

  const hasFilters = country.trim() || city.trim() || activeStyles.length > 0

  return (
    <main style={{ background: '#000', minHeight: '100vh', paddingBottom: 40 }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Logo + agregar + idioma */}
        <div className="max-w-7xl mx-auto px-5 pt-4 pb-3 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logoprincipal.svg" alt="Flashttoo" className="h-7 shrink-0" onClick={handleLogoTap} style={{ cursor: 'default' }} />
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/agregar" className="text-xs font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: '#efff42', color: '#000' }}>
              {t('inicio', 'add_artist', '+ tatuador/a')}
            </Link>
            {/* Selector de idioma */}
            {languages.length > 1 && (
              <div ref={langRef} className="relative">
                <button
                  onClick={() => setLangOpen(v => !v)}
                  className="flex items-center justify-center rounded-lg text-base transition-opacity hover:opacity-80"
                  style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>{language}</span>
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-1 rounded-xl overflow-hidden z-50 min-w-max"
                    style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }}>
                    {languages.map(l => (
                      <button key={l.code}
                        onClick={() => { setLanguage(l.code); setLangOpen(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left"
                        style={{
                          background: l.code === language ? 'rgba(239,255,66,0.08)' : 'transparent',
                          color: l.code === language ? '#efff42' : 'rgba(255,255,255,0.7)',
                          fontWeight: l.code === language ? 700 : 400,
                        }}>
                        <span>{l.flag}</span>
                        <span>{l.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Búsqueda + estilos apilados */}
        <div className="max-w-7xl mx-auto px-5 pb-3 flex flex-col gap-2">

          <input type="text" placeholder={t('inicio', 'country_placeholder', 'país')} value={country}
            onChange={e => { setCountry(e.target.value); setCity('') }}
            className="w-full py-2 px-4 text-sm text-white outline-none transition-all rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(239,255,66,0.5)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')} />

          <input type="text"
            placeholder={country.trim() ? `${t('inicio', 'city_with_country', 'ciudad en')} ${country.trim()}` : t('inicio', 'city_placeholder', 'ciudad (primero elegí un país)')}
            value={city}
            disabled={!country.trim()}
            onChange={e => setCity(e.target.value)}
            className="w-full py-2 px-4 text-sm outline-none transition-all rounded-lg"
            style={{
              background: country.trim() ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: country.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
              cursor: country.trim() ? 'text' : 'not-allowed',
            }}
            onFocus={e => { if (country.trim()) e.currentTarget.style.borderColor = 'rgba(239,255,66,0.5)' }}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')} />

          {/* Dropdown estilos — mismo tamaño que el input */}
          <div ref={stylesRef} className="relative w-full">
            <button onClick={() => setStylesOpen(v => !v)}
              className="w-full flex items-center justify-between py-2 px-4 text-sm transition-all rounded-lg"
              style={{
                background: activeStyles.length > 0 ? 'rgba(239,255,66,0.07)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${stylesOpen || activeStyles.length > 0 ? 'rgba(239,255,66,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: activeStyles.length > 0 ? '#efff42' : 'rgba(255,255,255,0.35)',
              }}>
              <span>{activeStyles.length > 0 ? activeStyles[0] : t('inicio', 'styles_placeholder', 'Estilos de tatuaje')}</span>
              <span style={{ fontSize: 9, opacity: 0.5 }}>{stylesOpen ? '▲' : '▼'}</span>
            </button>

            {stylesOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-y-auto"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', maxHeight: 300 }}>
                <div className="grid grid-cols-2">
                  {allStyles.map(s => {
                    const on = activeStyles.includes(s)
                    return (
                      <button key={s} onClick={() => toggleStyle(s)}
                        className="flex items-center justify-between px-4 py-2.5 text-sm transition-all text-left"
                        style={{ background: on ? 'rgba(239,255,66,0.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}>
                        <span style={{ color: on ? '#efff42' : 'rgba(255,255,255,0.55)', fontWeight: on ? 700 : 400 }}>{s}</span>
                        {on && <span style={{ color: '#efff42', fontSize: 12 }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
                {activeStyles.length > 0 && (
                  <button onClick={() => setStyles([])}
                    className="w-full py-2 text-xs transition-all"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,100,100,0.6)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,80,80,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    quitar estilo
                  </button>
                )}
              </div>
            )}
          </div>

          {hasFilters && (
            <button onClick={() => {
              try {
                sessionStorage.removeItem('s_country')
                sessionStorage.removeItem('s_city')
                sessionStorage.removeItem('s_styles')
                sessionStorage.removeItem('s_scroll')
              } catch {}
              window.location.href = '/'
            }}
              className="self-start text-xs px-3 py-1 rounded-full transition-all"
              style={{ border: '1px solid rgba(255,80,80,0.25)', color: 'rgba(255,100,100,0.5)' }}>
              {t('inicio', 'clear_filters', 'limpiar todo')}
            </button>
          )}
        </div>
      </header>

      {!loading && showCount && totalActiveArtists !== null && (
        <div className="max-w-7xl mx-auto px-5 pt-4 pb-1">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>
            {totalActiveArtists} {totalActiveArtists !== 1 ? t('inicio', 'count_plural', 'tatuadores') : t('inicio', 'count_singular', 'tatuador')}
          </p>
        </div>
      )}

      {/* ── GRID ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-5 py-4">
        {loading ? (
          <div className="grid grid-cols-3 gap-3 items-start">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="rounded-xl animate-pulse"
                style={{ paddingBottom: '133%', background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center">
            <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 13 }}>{t('inicio', 'no_results', 'sin resultados')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 items-start" style={{ gridAutoFlow: 'dense' }}>
            {(() => {
              const CHUNK = 15
              const activeCards = isActiveSearch ? [] : shuffledContentCards
              const nodes: React.ReactNode[] = []
              let cardIdx = 0
              finalBlocks.forEach((block, i) => {
                if (block.kind === 'featured') {
                  const big = block.big as { type: 'artist'; data: Artist }
                  nodes.push(
                    <div key={`feat-${big.data.id}`}
                      style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, gridColumnEnd: 'span 3' }}>
                      <button onClick={() => openModal(big.data)}
                        className="group relative overflow-hidden"
                        style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ paddingBottom: '133%' }} />
                        <div className="absolute inset-0" style={{ background: '#111' }}>
                          {brokenPhotoIds.has(big.data.id) ? (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(239,255,66,0.4)', fontSize: 32, fontWeight: 700 }}>
                              {initialsOf(big.data.name)}
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={big.data.photo_url} alt={big.data.name}
                              loading={block.fi < 4 ? 'eager' : 'lazy'}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              onError={() => markPhotoBroken(big.data.id)} />
                          )}
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)' }} />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white font-bold" style={{ fontSize: 16, overflowWrap: 'break-word' }}>{big.data.name}</p>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{big.data.city}</p>
                          </div>
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                            style={{ borderRadius: 11, boxShadow: 'inset 0 0 0 1px rgba(239,255,66,0.3)' }} />
                        </div>
                      </button>
                      <div className="flex flex-col gap-3">
                        {[block.s1, block.s2].map((item, si) => item.type === 'artist' ? (
                          <button key={item.data.id} onClick={() => openModal(item.data)}
                            className="group relative overflow-hidden"
                            style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ paddingBottom: '133%' }} />
                            <div className="absolute inset-0" style={{ background: '#111' }}>
                              {brokenPhotoIds.has(item.data.id) ? (
                                <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(239,255,66,0.4)', fontSize: 22, fontWeight: 700 }}>
                                  {initialsOf(item.data.name)}
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.data.photo_url} alt={item.data.name} loading="lazy"
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                  onError={() => markPhotoBroken(item.data.id)} />
                              )}
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                              <div className="absolute bottom-0 left-0 right-0 p-2">
                                <p className="text-white font-bold leading-tight" style={{ fontSize: 11, overflowWrap: 'break-word' }}>{item.data.name}</p>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{item.data.city}</p>
                              </div>
                            </div>
                          </button>
                        ) : item.type === 'studio' ? (
                          <button key={`studio-s${si}-${item.data.id}`}
                            onClick={() => openStudio(item.data.slug)}
                            className="group relative overflow-hidden text-left"
                            style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'block', width: '100%', padding: 0, cursor: 'pointer' }}>
                            <div style={{ paddingBottom: '133%' }} />
                            <div className="absolute inset-0" style={{ background: '#111' }}>
                              {item.data.logo_url && !brokenPhotoIds.has(item.data.id)
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={item.data.logo_url} alt={item.data.name} loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    onError={() => markPhotoBroken(item.data.id)} />
                                : <div className="absolute inset-0 flex items-center justify-center"
                                    style={{ color: 'rgba(239,255,66,0.4)', fontSize: 22, fontWeight: 900 }}>{initialsOf(item.data.name)}</div>
                              }
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                              <div className="absolute top-1.5 right-1.5">
                                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#efff42', background: 'rgba(0,0,0,0.65)', padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(239,255,66,0.3)' }}>{t('inicio', 'studio_badge', 'Estudio')}</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0">
                                <div style={{ padding: '4px 8px 6px' }}>
                                  <p className="text-white font-bold leading-tight" style={{ fontSize: 11, overflowWrap: 'break-word' }}>{item.data.name}</p>
                                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{item.data.city}</p>
                                </div>
                                {item.data.hiring && (
                                  <div style={{ background: '#efff42', padding: '1px 8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: 8, fontWeight: 600, color: '#000', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.data.hiring_role === 'residente' ? t('inicio', 'hiring_resident_badge', 'Se busca Residente') : t('inicio', 'hiring_guest_badge', 'Se busca Guest Artist')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ) : item.type === 'ad' ? (
                          <button key={`ad-s${si}-${item.data.id}`}
                            onClick={() => { trackClick(item.data.id, 'ad'); setSelectedAd(item.data); setAdEditSection(false); setAdKeyInput(''); setAdKeyError(''); setAdKeyVerified(false); setAdEditForm({ title: item.data.title, city: item.data.city || '', country: item.data.country || '', instagram: item.data.instagram || '', whatsapp: item.data.whatsapp || '', website: item.data.website || '' }) }}
                            className="group relative overflow-hidden"
                            style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ paddingBottom: '133%' }} />
                            <div className="absolute inset-0" style={{ background: '#111' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.data.image_url} alt={item.data.title} loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                onError={e => { e.currentTarget.style.opacity = '0' }} />
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                              <div className="absolute bottom-0 left-0 right-0 p-2">
                                <p className="text-white font-bold" style={{ fontSize: 10 }}>{item.data.title}</p>
                                {item.data.city && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{item.data.city}</p>}
                              </div>
                            </div>
                          </button>
                        ) : null)}
                      </div>
                    </div>
                  )
                } else if (block.kind === 'single') {
                  const item = block.item
                  if (item.type === 'artist') {
                    nodes.push(
                      <button key={item.data.id} onClick={() => openModal(item.data)}
                        className="group relative overflow-hidden"
                        style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ paddingBottom: '133%' }} />
                        <div className="absolute inset-0" style={{ background: '#111' }}>
                          {brokenPhotoIds.has(item.data.id) ? (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(239,255,66,0.4)', fontSize: 28, fontWeight: 700 }}>
                              {initialsOf(item.data.name)}
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.data.photo_url} alt={item.data.name}
                              loading={block.fi < 4 ? 'eager' : 'lazy'}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              onError={() => markPhotoBroken(item.data.id)} />
                          )}
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)' }} />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white font-bold leading-tight" style={{ fontSize: 13, overflowWrap: 'break-word' }}>{item.data.name}</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{item.data.city}</p>
                          </div>
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                            style={{ borderRadius: 11, boxShadow: 'inset 0 0 0 1px rgba(239,255,66,0.3)' }} />
                        </div>
                      </button>
                    )
                  } else if (item.type === 'studio') {
                    const s = item.data
                    nodes.push(
                      <button key={`studio-${s.id}`}
                        onClick={() => openStudio(s.slug)}
                        className="group relative overflow-hidden text-left"
                        style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'block', width: '100%', padding: 0, cursor: 'pointer' }}>
                        <div style={{ paddingBottom: '133%' }} />
                        <div className="absolute inset-0" style={{ background: '#111' }}>
                          {s.logo_url && !brokenPhotoIds.has(s.id)
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={s.logo_url} alt={s.name} loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                onError={() => markPhotoBroken(s.id)} />
                            : <div className="absolute inset-0 flex items-center justify-center"
                                style={{ color: 'rgba(239,255,66,0.45)', fontSize: 36, fontWeight: 900 }}>{initialsOf(s.name)}</div>
                          }
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)' }} />
                          <div className="absolute top-2 right-2">
                            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#efff42', background: 'rgba(0,0,0,0.65)', padding: '3px 6px', borderRadius: 5, border: '1px solid rgba(239,255,66,0.3)' }}>{t('inicio', 'studio_badge', 'Estudio')}</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0">
                            <div style={{ padding: '8px 12px 10px' }}>
                              <p className="text-white font-bold leading-tight" style={{ fontSize: 13, overflowWrap: 'break-word' }}>{s.name}</p>
                              {s.country && (
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.country}</p>
                              )}
                            </div>
                            {s.hiring && (
                              <div style={{ background: '#efff42', padding: '2px 12px', textAlign: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 600, color: '#000', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.hiring_role === 'residente' ? t('inicio', 'hiring_resident_badge', 'Se busca Residente') : t('inicio', 'hiring_guest_badge', 'Se busca Guest Artist')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  } else {
                    nodes.push(
                      <div key={`ad-${item.data.id}-${block.fi}`}
                        className="relative overflow-hidden group"
                        style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                        onClick={() => { trackClick(item.data.id, 'ad'); setSelectedAd(item.data); setAdEditSection(false); setAdKeyInput(''); setAdKeyError(''); setAdKeyVerified(false); setAdEditForm({ title: item.data.title, city: item.data.city || '', country: item.data.country || '', instagram: item.data.instagram || '', whatsapp: item.data.whatsapp || '', website: item.data.website || '' }) }}>
                        <div style={{ paddingBottom: '133%' }} />
                        <div className="absolute inset-0" style={{ background: '#111' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.data.image_url} alt={item.data.title} loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={e => { e.currentTarget.style.opacity = '0' }} />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)' }} />
                          <button
                            onClick={e => { e.stopPropagation(); trackClick(item.data.id, 'ad'); setSelectedAd(item.data); setAdEditSection(true); setAdKeyInput(''); setAdKeyError(''); setAdKeyVerified(false); setAdEditForm({ title: item.data.title, city: item.data.city || '', country: item.data.country || '', instagram: item.data.instagram || '', whatsapp: item.data.whatsapp || '', website: item.data.website || '' }) }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, width: 28, height: 28, color: 'rgba(255,255,255,0.7)', fontSize: 16, letterSpacing: '-1px', lineHeight: 1 }}>
                            ···
                          </button>
                          <div className="absolute top-2 left-2">
                            <span style={{ fontSize: 8, color: 'rgba(239,255,66,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Publicidad</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white font-bold leading-tight" style={{ fontSize: 13, overflowWrap: 'break-word' }}>{item.data.title}</p>
                            {item.data.city && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{item.data.city}</p>}
                          </div>
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                            style={{ borderRadius: 11, boxShadow: 'inset 0 0 0 1px rgba(239,255,66,0.2)' }} />
                        </div>
                      </div>
                    )
                  }
                }
                if ((i + 1) % CHUNK === 0 && cardIdx < activeCards.length) {
                  const card = activeCards[cardIdx++]
                  nodes.push(
                    <button key={`cc-${card.id}-${i}`}
                      onClick={() => { setSelectedContent(card); window.history.pushState({}, '', '/') }}
                      className="text-left relative overflow-hidden"
                      style={{ gridColumn: '1 / span 2', borderRadius: 12, border: '1px solid rgba(239,255,66,0.12)', cursor: 'pointer' }}>
                      <div style={{ paddingBottom: '66.5%' }} />
                      <div className="absolute inset-0" style={{
                        background: 'rgba(239,255,66,0.03)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        padding: '14px 16px 12px',
                      }}>
                        <div>
                          <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(239,255,66,0.4)', letterSpacing: '0.18em', marginBottom: 6, textTransform: 'uppercase' }}>Flashttoo</div>
                          <p className="text-white font-bold" style={{ fontSize: 14, lineHeight: 1.3 }}>{card.title}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 1.5 }}>{card.body.slice(0, 100)}{card.body.length > 100 ? '…' : ''}</p>
                        </div>
                        <p style={{ fontSize: 10, color: 'rgba(239,255,66,0.35)', textAlign: 'right' }}>{t('global', 'card_read_more', 'leer más →')}</p>
                      </div>
                    </button>
                  )
                }
              })
              return nodes
            })()}
          </div>
        )}
        {loadingMore && (
          <p className="text-center py-6" style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>{t('inicio', 'loading_more', 'cargando más...')}</p>
        )}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>


      {/* ── MODAL ──────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 overflow-y-auto"
          style={{ zIndex: 65, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', animation: 'fadeInYellow 0.22s ease' }}
          onClick={closeModal}>

          <div className="flex justify-center items-start min-h-full pb-64 sm:px-4 sm:pt-6">
          <div className="flex flex-col w-full sm:max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="relative w-full overflow-hidden"
            style={{ background: '#111', borderRadius: editOpen ? '0 0 0 0' : '0 0 20px 20px', border: '1px solid rgba(255,255,255,0.08)', borderBottom: editOpen ? 'none' : '1px solid rgba(255,255,255,0.08)', boxShadow: editOpen ? 'none' : '0 40px 100px rgba(0,0,0,0.9)' }}>

            <div className="relative w-full" style={{ paddingBottom: '115%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.photo_url} alt={selected.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, #111 0%, rgba(0,0,0,0.5) 50%, transparent 100%)' }} />

              <button onClick={closeModalFull}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>
                ×
              </button>

              {/* Visitas */}

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: '#fff', overflowWrap: 'break-word' }}>{selected.name}</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{selected.city}, {selected.country}</p>
              </div>
            </div>

            <div className="px-5 pb-5 pt-3">
              {selected.styles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selected.styles.map(s => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(239,255,66,0.06)', border: '1px solid rgba(239,255,66,0.18)', color: 'rgba(239,255,66,0.75)' }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {selected.bio && (
                <BioText text={selected.bio} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 16 }} />
              )}

              {galleryEnabled && (() => {
                const photos = [selected.gallery_photo_1, selected.gallery_photo_2, selected.gallery_photo_3].filter(Boolean) as string[]
                if (!photos.length) return null
                return (
                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {photos.map((src, i) => (
                      <button key={i} onClick={() => openFullscreen(src, photos)}
                        className="relative rounded-xl overflow-hidden"
                        style={{ paddingBottom: '100%', background: '#111' }}>
                        <Image src={src} alt="" fill sizes="33vw" className="object-cover" />
                      </button>
                    ))}
                  </div>
                )
              })()}

              {(() => {
                const today = new Date().toISOString().slice(0, 10)
                const upcoming = (selected.visits || []).filter(v => v.to >= today).sort((a, b) => a.from.localeCompare(b.from))
                if (!upcoming.length) return null
                return (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 8 }}>{t('artista', 'upcoming_dates', 'Próximas fechas')}</p>
                    <div className="flex flex-col gap-2">
                      {upcoming.map((v, i) => (
                        <div key={i} style={{ background: 'rgba(239,255,66,0.04)', border: '1px solid rgba(239,255,66,0.12)', borderRadius: 10, padding: '10px 14px' }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#efff42', marginBottom: 2 }}>{v.city}, {v.country}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                            {new Date(v.from + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – {new Date(v.to + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }} />

              <div className="flex flex-col gap-2">
                {selected.instagram && (
                  <a href={`https://instagram.com/${selected.instagram.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={() => trackClick(selected.id, 'instagram')}
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>Instagram</p>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                  </a>
                )}
                {selected.whatsapp && (
                  <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${selected.name}, te encontré en Flashttoo 👋`)}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={() => trackClick(selected.id, 'whatsapp')}
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>WhatsApp</p>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                  </a>
                )}
                {selected.email && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selected.email!)
                      setCopiedEmail(true)
                      setTimeout(() => setCopiedEmail(false), 2000)
                    }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all w-full relative"
                    style={{ background: copiedEmail ? 'rgba(239,255,66,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copiedEmail ? 'rgba(239,255,66,0.25)' : 'rgba(255,255,255,0.07)'}` }}
                    onMouseEnter={e => { if (!copiedEmail) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                    onMouseLeave={e => { if (!copiedEmail) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}>
                    <p style={{ fontSize: 13, color: copiedEmail ? '#efff42' : 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
                      {copiedEmail ? t('artista', 'email_copied', 'Mail copiado') : t('artista', 'email_btn', 'Email')}
                    </p>
                    <span style={{ color: copiedEmail ? '#efff42' : 'rgba(255,255,255,0.2)', fontSize: 14 }}>
                      {copiedEmail ? '✓' : '⎘'}
                    </span>
                  </button>
                )}
              </div>

              {/* Stats + Like */}
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <StatItem label={t('artista', 'stat_views', 'visitas')}   value={selected.profile_views ?? 0} />
                    <StatItem label="Instagram" value={selected.instagram_clicks ?? 0} />
                    {selected.whatsapp && <StatItem label="WhatsApp" value={selected.whatsapp_clicks ?? 0} />}
                  </div>
                  <button onClick={toggleLike}
                    className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
                    style={{ background: liked ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${liked ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                    <span style={{ fontSize: 16, color: liked ? '#efff42' : 'rgba(255,255,255,0.3)', lineHeight: 1 }}>{liked ? '♥' : '♡'}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: liked ? '#efff42' : 'rgba(255,255,255,0.3)' }}>{fmt(localLikes)}</span>
                  </button>
                </div>

                {/* Compartir */}
                <div className="mt-2 flex justify-end">
                  <button onClick={shareArtist}
                    className="flex items-center justify-center w-9 h-9 rounded-full transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${copied ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.08)'}`, color: copied ? 'rgba(239,255,66,0.7)' : 'rgba(255,255,255,0.3)', fontSize: 15 }}>
                    {copied ? '✓' : '↑'}
                  </button>
                </div>

                {/* Tres puntos */}
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={() => { setEditOpen(v => !v); setEditKey(''); setEditKeyError('') }}
                    className="flex items-center justify-center px-3 py-1 rounded-full transition-all"
                    style={{ color: editOpen ? 'rgba(239,255,66,0.6)' : 'rgba(255,255,255,0.18)', fontSize: 20, letterSpacing: '-2px', lineHeight: 1 }}>
                    ···
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Panel amarillo — extensión del modal */}
          {editOpen && (
            <div style={{ background: '#efff42', borderRadius: '0 0 20px 20px', padding: '20px 20px 24px', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>
              <p style={{ color: '#000', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                {t('artista', 'edit_profile', 'Editar perfil')}
              </p>
              <input
                autoFocus
                value={editKey}
                onChange={e => { setEditKey(e.target.value.toUpperCase()); setEditKeyError('') }}
                onKeyDown={e => { if (e.key === 'Enter') verifyEditKey() }}
                placeholder={t('artista', 'edit_key_placeholder', 'CLAVE DE EDICIÓN')}
                className="w-full py-2.5 px-3 outline-none rounded-xl"
                style={{
                  background: 'rgba(0,0,0,0.1)',
                  border: `1px solid ${editKeyError ? 'rgba(160,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
                  color: '#000',
                  letterSpacing: '0.12em',
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              />
              {editKeyError && (
                <p className="text-xs mt-1.5 text-center" style={{ color: 'rgba(160,0,0,0.8)' }}>{editKeyError}</p>
              )}
              <button
                onClick={verifyEditKey}
                disabled={!editKey.trim() || editVerifying}
                className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold disabled:opacity-30 transition-all"
                style={{ background: '#000', color: '#efff42' }}>
                {editVerifying ? t('artista', 'verifying', 'Verificando...') : t('artista', 'enter_btn', 'Entrar →')}
              </button>
            </div>
          )}
          {/* Sección entrevista — tarjeta amarilla separada debajo de todo */}
          {(() => {
            const iv = (selected.interview ?? {}) as Record<string, string>
            const answered = INTERVIEW_QUESTIONS.filter(q => iv[q.key]?.trim())
            if (!answered.length) return null
            return (
              <div style={{ background: '#efff42', borderRadius: 20, marginTop: 8, padding: '22px 20px 24px', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', marginBottom: 20 }}>
                  {t('artista', 'meet_artist', 'Conocé a')} {selected.name}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {answered.map(q => (
                    <div key={q.key}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5, lineHeight: 1.4 }}>
                        {t('historia', q.key, q.label)}
                      </p>
                      <p style={{ fontSize: 14, color: '#000', lineHeight: 1.65 }}>
                        {iv[q.key]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
          </div>
          </div>
        </div>
      )}

      {/* ── CARTA SECRETA ─────────────────────────────────────── */}
      {showSecretCard && secretCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', animation: 'fadeInYellow 0.2s ease' }}
          onClick={() => setShowSecretCard(false)}>
          <style>{`
            @keyframes cardFlip {
              0%   { transform: rotateY(0deg); }
              35%  { transform: rotateY(0deg); }
              100% { transform: rotateY(180deg); }
            }
            @keyframes infoTop {
              from { opacity: 0; transform: translateY(14px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes infoBot {
              from { opacity: 0; transform: translateY(-14px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .secret-card-inner { animation: cardFlip 1.5s cubic-bezier(.6,0,.4,1) forwards; transform-style: preserve-3d; }
            .secret-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; position: absolute; inset: 0; overflow: hidden; }
            .secret-back  { transform: rotateY(0deg); border-radius: 0; }
            .secret-front { transform: rotateY(180deg); border-radius: 0; }
            .secret-info-top { opacity: 0; animation: infoTop 0.7s ease forwards; animation-delay: 2.5s; }
            .secret-info-bot { opacity: 0; animation: infoBot 0.7s ease forwards; animation-delay: 2.5s; }
            @keyframes glowPulse {
              0%   { box-shadow: 0 0 18px 3px rgba(239,255,66,0.10), 0 0 6px 1px rgba(239,255,66,0.07); }
              50%  { box-shadow: 0 0 38px 10px rgba(239,255,66,0.28), 0 0 14px 4px rgba(239,255,66,0.16); }
              100% { box-shadow: 0 0 18px 3px rgba(239,255,66,0.10), 0 0 6px 1px rgba(239,255,66,0.07); }
            }
            .secret-glow { box-shadow: none; animation: glowPulse 2.4s ease-in-out infinite; animation-delay: 3.2s; }
          `}</style>

          <div className="secret-glow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '72vw', maxWidth: 300, borderRadius: 10 }}>

            {/* INFO SUPERIOR */}
            <div className="secret-info-top" style={{ width: '100%', background: '#000', borderRadius: '10px 10px 0 0', padding: '8px 12px' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(239,255,66,0.6)' }}>
                {secretCard.number ? `#${secretCard.number} · ` : ''}✦ {t('global', 'secret_card', 'carta secreta')}
              </span>
            </div>

            {/* CARTA */}
            <div style={{ perspective: 1200, width: '100%' }}>
              <div className="secret-card-inner" style={{ position: 'relative', width: '100%', aspectRatio: '3/4' }}>
                {/* DORSO */}
                <div className="secret-face secret-back">
                  {secretCard.back_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={secretCard.back_image_url} alt="dorso"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 24, opacity: 0.35 }} />
                      <span style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(239,255,66,0.2)', textTransform: 'uppercase' }}>{t('global', 'secret_card', 'carta secreta')}</span>
                    </div>
                  )}
                </div>
                {/* FRENTE — imagen pura */}
                <div className="secret-face secret-front">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={secretCard.image_url} alt={secretCard.artist_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>

            {/* INFO INFERIOR */}
            <div className="secret-info-bot" style={{ width: '100%', background: '#000', borderRadius: '0 0 10px 10px', padding: '10px 12px 12px' }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{secretCard.artist_name}</p>
              {secretCard.city && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{secretCard.city}</p>
              )}
              {secretCard.caption && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>
                  {secretCard.caption}
                </p>
              )}
              {secretCard.link && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setShowSecretCard(false)
                    if (secretCard.link.startsWith('@')) {
                      const handle = secretCard.link.slice(1)
                      const found = artists.find(a => a.instagram?.replace('@', '') === handle)
                      if (found) {
                        openModal(found)
                      } else {
                        supabase.from('artists').select('*').ilike('instagram', handle).single()
                          .then(({ data }) => { if (data) openModal(data as Artist) })
                      }
                    } else {
                      window.open(secretCard.link, '_blank', 'noopener')
                    }
                  }}
                  style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 700, color: '#efff42', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  {t('global', 'see_profile', 'Ver perfil →')}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL CONTENIDO ────────────────────────────────────── */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: '#efff42', animation: 'fadeInYellow 0.22s ease' }}
          onClick={() => setSelectedContent(null)}>
          <div className="flex justify-center items-start min-h-full pt-12 pb-24 sm:px-6"
            onClick={e => e.stopPropagation()}>
            <div className="w-full sm:max-w-md px-5 sm:px-0">
              <button onClick={() => setSelectedContent(null)}
                className="mb-8 text-xs transition-opacity hover:opacity-50"
                style={{ color: 'rgba(0,0,0,0.4)' }}>
                {t('global', 'card_close', '← cerrar')}
              </button>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>
                Flashttoo
              </div>
              <h1 className="font-bold" style={{ color: '#000', fontSize: 26, lineHeight: 1.2, marginBottom: 20 }}>
                {selectedContent.title}
              </h1>
              <p style={{ color: 'rgba(0,0,0,0.65)', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {selectedContent.body}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PUBLICIDAD ───────────────────────────────────── */}
      {selectedAd && (
        <div className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', animation: 'fadeInYellow 0.22s ease' }}
          onClick={() => setSelectedAd(null)}>
          <div className="flex justify-center items-start min-h-full pb-24 sm:px-4 sm:pt-6">
          <div className="flex flex-col w-full sm:max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="relative w-full overflow-hidden"
            style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>

            {/* Foto */}
            <div className="relative w-full" style={{ paddingBottom: '115%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedAd.image_url} alt={selectedAd.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #111 0%, rgba(0,0,0,0.5) 50%, transparent 100%)' }} />
              <button onClick={() => setSelectedAd(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>
                ×
              </button>
              <div className="absolute top-4 left-4">
                <span style={{ fontSize: 9, color: 'rgba(239,255,66,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Publicidad</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h2 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, color: '#fff', overflowWrap: 'break-word' }}>{selectedAd.title}</h2>
                {(selectedAd.city || selectedAd.country) && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    {[selectedAd.city, selectedAd.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Contacto + editar */}
            <div className="px-5 pb-5 pt-3">
              <div className="flex flex-col gap-2">
                {selectedAd.website && (
                  <a href={selectedAd.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Sitio web</p>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                  </a>
                )}
                {selectedAd.instagram && (
                  <a href={`https://instagram.com/${selectedAd.instagram.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Instagram</p>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                  </a>
                )}
                {selectedAd.whatsapp && (
                  <a href={`https://wa.me/${selectedAd.whatsapp.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>WhatsApp</p>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                  </a>
                )}
                {selectedAd.link && !selectedAd.website && (
                  <a href={selectedAd.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{t('global', 'see_more', 'Ver más')}</p>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                  </a>
                )}
              </div>

              {/* Sección editar */}
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                {!adEditSection ? (
                  <button onClick={() => setAdEditSection(true)}
                    style={{ fontSize: 18, color: 'rgba(255,255,255,0.15)', letterSpacing: '-2px', lineHeight: 1 }}>
                    ···
                  </button>
                ) : !adKeyVerified ? (
                  <div className="flex flex-col gap-2">
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Clave de edición</p>
                    <div className="flex gap-2">
                      <input
                        value={adKeyInput}
                        onChange={e => { setAdKeyInput(e.target.value.toUpperCase()); setAdKeyError('') }}
                        placeholder="••••••••••"
                        maxLength={10}
                        className="flex-1 py-2 px-3 text-sm text-white outline-none rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onKeyDown={e => { if (e.key === 'Enter') verifyAdKey() }}
                      />
                      <button onClick={verifyAdKey}
                        className="px-4 py-2 rounded-lg text-sm font-bold"
                        style={{ background: 'rgba(239,255,66,0.1)', color: '#efff42', border: '1px solid rgba(239,255,66,0.2)' }}>
                        OK
                      </button>
                    </div>
                    {adKeyError && <p style={{ fontSize: 11, color: 'rgba(255,80,80,0.8)' }}>{adKeyError}</p>}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#efff42', letterSpacing: '0.08em' }}>EDITAR PUBLICIDAD</p>
                    {/* Métricas */}
                    <div className="flex gap-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <p style={{ fontSize: 22, fontWeight: 700, color: '#efff42', lineHeight: 1 }}>{selectedAd.clicks}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>clicks</p>
                      </div>
                      {selectedAd.expires_at && (
                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: 16 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1, color: new Date(selectedAd.expires_at) < new Date() ? '#f87171' : 'rgba(255,255,255,0.55)' }}>
                            {new Date(selectedAd.expires_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>vence</p>
                        </div>
                      )}
                    </div>
                    {/* Foto */}
                    <div>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Foto</p>
                      <label className="block cursor-pointer">
                        <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom: '60%' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={adEditPhotoPreview || selectedAd.image_url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.45)' }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>cambiar foto</span>
                          </div>
                        </div>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]; if (!file) return
                            const preview = URL.createObjectURL(file)
                            setAdEditPhotoPreview(preview)
                            const img = new window.Image()
                            img.onload = () => {
                              const MAX = 1200; let { width, height } = img
                              if (width > MAX || height > MAX) {
                                if (width > height) { height = Math.round(height * MAX / width); width = MAX }
                                else { width = Math.round(width * MAX / height); height = MAX }
                              }
                              const canvas = document.createElement('canvas')
                              canvas.width = width; canvas.height = height
                              canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
                              canvas.toBlob(blob => { if (blob) setAdEditPhoto(new File([blob], 'ad.webp', { type: 'image/webp' })) }, 'image/webp', 0.85)
                            }
                            img.src = preview
                          }} />
                      </label>
                    </div>
                    {[
                      { label: 'Nombre / título', key: 'title' },
                      { label: 'Ciudad', key: 'city' },
                      { label: 'País', key: 'country' },
                      { label: 'Instagram', key: 'instagram' },
                      { label: 'WhatsApp', key: 'whatsapp' },
                      { label: 'Sitio web', key: 'website' },
                    ].map(f => (
                      <div key={f.key}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{f.label}</p>
                        <input
                          value={adEditForm[f.key as keyof typeof adEditForm]}
                          onChange={e => setAdEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>
                    ))}
                    {adKeyError && <p style={{ fontSize: 11, color: 'rgba(255,80,80,0.8)' }}>{adKeyError}</p>}
                    <button onClick={saveAdEdit} disabled={savingAdEdit}
                      className="self-end px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                      style={{ background: '#efff42', color: '#000' }}>
                      {savingAdEdit ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
          </div>
        </div>
      )}

      {editing && selected && (
        <EditPanel
          artist={selected}
          prefilledKey={editKeyVerified}
          onClose={() => { setEditing(false); setEditKeyVerified('') }}
          onSaved={(updated) => {
            setSelected(updated)
            setArtists(prev => prev.map(a => a.id === updated.id ? updated : a))
            setEditing(false)
            setEditKeyVerified('')
          }}
          onDeleted={() => {
            setEditing(false)
            setEditKeyVerified('')
            setSelected(null)
            setArtists(prev => prev.filter(a => a.id !== selected.id))
          }}
        />
      )}

      {selectedStudioSlug && (
        <StudioPanel
          slug={selectedStudioSlug}
          onClose={closeStudio}
          onOpenArtist={(artist) => openModal(artist)}
        />
      )}

      <ConventionModal conventions={conventions} flashDays={flashDays} onOpenStudio={openStudio} />
      <SponsorsBanner country={country} />
      <SponsorsBannerV2 city={city} country={country} conventions={conventions} flashDays={flashDays} onOpenStudio={openStudio} showEventsCountryFilter={eventsCountryFilter} />

      {/* Visor fullscreen galería — tira deslizante */}
      {fullscreenImg && (
        <div
          onClick={() => { if (!fsDragging) history.back() }}
          onTouchStart={e => {
            fsSwipeRef.current = { startX: e.touches[0].clientX }
            setFsDragging(true)
          }}
          onTouchMove={e => {
            if (!fsSwipeRef.current) return
            setFsDragX(e.touches[0].clientX - fsSwipeRef.current.startX)
          }}
          onTouchEnd={e => {
            if (!fsSwipeRef.current) return
            const dx = e.changedTouches[0].clientX - fsSwipeRef.current.startX
            fsSwipeRef.current = null
            setFsDragging(false)
            setFsDragX(0)
            if (Math.abs(dx) < 40) return
            const next = dx < 0
              ? Math.min(fullscreenIdx + 1, fullscreenPhotos.length - 1)
              : Math.max(fullscreenIdx - 1, 0)
            setFullscreenIdx(next)
            setFullscreenImg(fullscreenPhotos[next])
          }}
          onMouseDown={e => {
            if (fullscreenPhotos.length < 2) return
            fsSwipeRef.current = { startX: e.clientX }
            setFsDragging(true)
          }}
          onMouseMove={e => {
            if (!fsSwipeRef.current) return
            setFsDragX(e.clientX - fsSwipeRef.current.startX)
          }}
          onMouseUp={e => {
            if (!fsSwipeRef.current) return
            const dx = e.clientX - fsSwipeRef.current.startX
            fsSwipeRef.current = null
            setFsDragging(false)
            setFsDragX(0)
            if (Math.abs(dx) < 10) return
            const next = dx < 0
              ? Math.min(fullscreenIdx + 1, fullscreenPhotos.length - 1)
              : Math.max(fullscreenIdx - 1, 0)
            setFullscreenIdx(next)
            setFullscreenImg(fullscreenPhotos[next])
          }}
          onMouseLeave={() => {
            if (!fsSwipeRef.current) return
            fsSwipeRef.current = null
            setFsDragging(false)
            setFsDragX(0)
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.96)', overflow: 'hidden', cursor: fullscreenPhotos.length > 1 ? 'grab' : 'default' }}>

          {/* Tira horizontal con todas las fotos */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            display: 'flex', alignItems: 'center',
            height: '100%',
            transform: `translateX(calc(-${fullscreenIdx} * 100vw + ${fsDragX}px))`,
            transition: fsDragging ? 'none' : 'transform 0.28s ease',
            willChange: 'transform',
          }}>
            {fullscreenPhotos.map((src, i) => (
              <div key={i} style={{ width: '100vw', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none' }} onClick={e => e.stopPropagation()} />
              </div>
            ))}
          </div>

          {fullscreenPhotos.length > 1 && (
            <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
              {fullscreenPhotos.map((_, i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', transition: 'background 0.2s', background: i === fullscreenIdx ? '#fff' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          )}
          <button
            onClick={e => { e.stopPropagation(); history.back() }}
            style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            ×
          </button>
        </div>
      )}
    </main>
  )
}

