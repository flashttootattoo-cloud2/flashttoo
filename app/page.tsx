'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase, type Artist } from '@/lib/supabase'
import EditPanel from '@/components/EditPanel'
import { INTERVIEW_QUESTIONS } from '@/lib/interview'

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

const DEFAULT_STYLES = [
  'Tradicional','Realismo','Blackwork','Acuarela','Geométrico',
  'Japonés','Neo Tradicional','Minimalista','Old School','Dotwork',
  'Fineline','Lettering','Tribal','Biomecánico','Cover-up','Ornamental','Otros',
]

type Ad = {
  id: string; title: string; image_url: string; link: string; city: string | null
}

type ContentCard = {
  id: string; title: string; body: string; active: boolean
}

const AD_INTERVAL = 4  // insertar un ad cada N tarjetas

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function norm(s: string): string {
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
  const [contentCards, setContentCards]     = useState<ContentCard[]>([])
  const [showCount, setShowCount]           = useState(false)
  const cardStartOffset = useRef(Math.floor(Math.random() * 100))
  const [selectedContent, setSelectedContent] = useState<ContentCard | null>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (stylesRef.current && !stylesRef.current.contains(e.target as Node)) setStylesOpen(false)
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

  // Persistir filtros en sessionStorage para restaurarlos si el browser recarga la pestaña
  useEffect(() => { try { sessionStorage.setItem('s_country', country) } catch {} }, [country])
  useEffect(() => { try { sessionStorage.setItem('s_city', city) } catch {} }, [city])
  useEffect(() => { try { sessionStorage.setItem('s_styles', JSON.stringify(activeStyles)) } catch {} }, [activeStyles])

  // Guardar posición de scroll mientras navega
  useEffect(() => {
    const save = () => { try { sessionStorage.setItem('s_scroll', String(window.scrollY)) } catch {} }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [])

  // Restaurar scroll después de que carguen los artistas (solo si no hay modal abierto por deep link)
  useEffect(() => {
    if (loading || artists.length === 0) return
    const hasDeepLink = new URLSearchParams(window.location.search).has('artista')
    if (hasDeepLink) return
    try {
      const saved = sessionStorage.getItem('s_scroll')
      if (saved && parseInt(saved) > 100) {
        requestAnimationFrame(() => window.scrollTo({ top: parseInt(saved), behavior: 'instant' }))
      }
    } catch {}
  }, [loading, artists.length])

  useEffect(() => {
    fetch('/api/styles').then(r => r.json()).then(d => { if (d.styles) setAllStyles(d.styles) }).catch(() => {})
    fetch('/api/content-cards').then(r => r.json()).then(d => { if (Array.isArray(d.cards)) setContentCards(d.cards) }).catch(() => {})
    supabase.from('settings').select('value').eq('key', 'show_count').single().then(({ data }) => { if (data?.value === true) setShowCount(true) })
  }, [])

  useEffect(() => {
    Promise.all([
      supabase.from('artists').select('*').or('status.eq.active,status.is.null').order('created_at', { ascending: false }),
      supabase.from('ads').select('id,title,image_url,link,city').eq('active', true),
    ]).then(([a, b]) => {
      setArtists(shuffle(a.data || []))
      setAds(shuffle(b.data || []))
      setLoading(false)
    })
  }, [])

  const prevIsFiltering = useRef(false)
  useEffect(() => {
    const filtering = !!country.trim() || !!city.trim() || activeStyles.length > 0
    if (prevIsFiltering.current && !filtering) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    prevIsFiltering.current = filtering
  }, [country, city, activeStyles])

  const toggleStyle = (s: string) =>
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const filtered = artists.filter(a => {
    if (a.visible === false) return false
    const qCountry = norm(country)
    const qCity    = norm(city)
    const countryMatch = !qCountry || norm(a.country).includes(qCountry)
    const cityMatch    = !qCity    || norm(a.city).includes(qCity)
    const styleMatch   = activeStyles.length === 0 || activeStyles.every(s => a.styles.includes(s))
    return countryMatch && cityMatch && styleMatch
  })

  // Targeting: sin filtro = global (siempre), con filtro = solo cuando coincide
  const visibleAds = ads.filter(ad => {
    if (!ad.city) return true
    if (!country.trim() && !city.trim()) return false
    const t = norm(ad.city)
    const l = norm(city || country)
    return t.includes(l) || l.includes(t)
  })

  // Mezclar ads en el feed cada AD_INTERVAL tarjetas
  // Los ads restantes siempre se muestran aunque no haya suficientes artistas
  const feedItems: Array<{ type: 'artist'; data: Artist } | { type: 'ad'; data: Ad }> = []
  let adIdx = 0
  filtered.forEach((artist, i) => {
    feedItems.push({ type: 'artist', data: artist })
    if ((i + 1) % AD_INTERVAL === 0 && adIdx < visibleAds.length) {
      feedItems.push({ type: 'ad', data: visibleAds[adIdx++] })
    }
  })
  // Ads que no entraron por falta de artistas → se agregan igual al final
  while (adIdx < visibleAds.length) {
    feedItems.push({ type: 'ad', data: visibleAds[adIdx++] })
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

  const isFiltering = !!country.trim() || !!city.trim() || activeStyles.length > 0

  // Insertar tarjetas de contenido cada ~20 posiciones, solo cuando no hay búsqueda activa
  const CONTENT_GAPS = [12, 22, 19, 21, 20, 23, 18, 21, 20, 22]
  const allBlocks: Block[] = []
  let cInsert = CONTENT_GAPS[0], cGapIdx = 0, cCardIdx = cardStartOffset.current
  for (let i = 0; i < blocks.length; i++) {
    if (i === cInsert && contentCards.length > 0) {
      allBlocks.push({ kind: 'content', card: contentCards[cCardIdx % contentCards.length], fi: -1, rightAlign: cCardIdx % 2 === 1 })
      cCardIdx++
      cGapIdx = (cGapIdx + 1) % CONTENT_GAPS.length
      cInsert += CONTENT_GAPS[cGapIdx]
    }
    allBlocks.push(blocks[i])
  }
  const finalBlocks = isFiltering ? allBlocks.filter(b => b.kind !== 'content') : allBlocks

  const openModal = useCallback((artist: Artist) => {
    setSelected(artist)
    const alreadyLiked = localStorage.getItem(`liked_${artist.id}`) === '1'
    setLiked(alreadyLiked)
    setLocalLikes((artist.likes ?? 0) + (alreadyLiked ? 1 : 0))
    trackView(artist.id)
    window.history.pushState({}, '', `/?artista=${artist.id}`)
  }, [])

  // Deep link: abre el modal si la URL tiene ?artista=ID
  useEffect(() => {
    if (loading || artists.length === 0 || deepLinkHandled.current) return
    deepLinkHandled.current = true
    const id = new URLSearchParams(window.location.search).get('artista')
    if (!id) return
    const artist = artists.find(a => a.id === id)
    if (artist) openModal(artist)
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
    const url = `${window.location.origin}/?artista=${selected.id}`
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
      setEditKeyError('Clave incorrecta')
    }
    setEditVerifying(false)
  }, [selected, editKey])

  const closeModal = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelected(null)
      setEditOpen(false)
      setEditKey('')
      setEditKeyError('')
      window.history.pushState({}, '', '/')
    }
  }, [])

  const closeModalFull = useCallback(() => {
    setSelected(null)
    setEditOpen(false)
    setEditKey('')
    setEditKeyError('')
    window.history.pushState({}, '', '/')
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedContent) setSelectedContent(null)
        else closeModalFull()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [closeModalFull, selectedContent])

  // Botón atrás del celular: cierra el modal sin tocar el historial (el browser ya lo hizo)
  useEffect(() => {
    const h = () => {
      if (selectedContent) {
        setSelectedContent(null)
      } else if (selected) {
        setSelected(null)
        setEditOpen(false)
        setEditKey('')
        setEditKeyError('')
      }
    }
    window.addEventListener('popstate', h)
    return () => window.removeEventListener('popstate', h)
  }, [selected, selectedContent])

  const hasFilters = country.trim() || city.trim() || activeStyles.length > 0

  return (
    <main style={{ background: '#000', minHeight: '100vh' }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Logo + agregar */}
        <div className="max-w-7xl mx-auto px-5 pt-4 pb-3 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logoprincipal.svg" alt="Flashttoo" className="h-7 shrink-0" />
          <Link href="/agregar" className="shrink-0 text-xs font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: '#efff42', color: '#000' }}>
            + tatuador/a
          </Link>
        </div>

        {/* Búsqueda + estilos apilados */}
        <div className="max-w-7xl mx-auto px-5 pb-3 flex flex-col gap-2">

          <input type="text" placeholder="país" value={country}
            onChange={e => { setCountry(e.target.value); setCity('') }}
            className="w-full py-2 px-4 text-sm text-white outline-none transition-all rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(239,255,66,0.5)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')} />

          <input type="text" placeholder={country.trim() ? `ciudad en ${country.trim()}` : 'ciudad'}
            value={city}
            onChange={e => setCity(e.target.value)}
            className="w-full py-2 px-4 text-sm text-white outline-none transition-all rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(239,255,66,0.5)')}
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
              <span>{activeStyles.length > 0 ? `${activeStyles.length} estilo${activeStyles.length > 1 ? 's' : ''} seleccionado${activeStyles.length > 1 ? 's' : ''}` : 'Estilos de tatuaje'}</span>
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
                    limpiar selección
                  </button>
                )}
              </div>
            )}
          </div>

          {hasFilters && (
            <button onClick={() => { setCountry(''); setCity(''); setStyles([]) }}
              className="self-start text-xs px-3 py-1 rounded-full transition-all"
              style={{ border: '1px solid rgba(255,80,80,0.25)', color: 'rgba(255,100,100,0.5)' }}>
              limpiar todo
            </button>
          )}
        </div>
      </header>

      {!loading && showCount && (
        <div className="max-w-7xl mx-auto px-5 pt-4 pb-1">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>
            {filtered.length} tatuador{filtered.length !== 1 ? 'es' : ''}
          </p>
        </div>
      )}

      {/* ── GRID ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-5 py-4">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 items-start">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className={`rounded-xl animate-pulse ${i === 11 ? 'col-span-2' : ''}`}
                style={{ paddingBottom: i === 11 ? '66.5%' : '133%', background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center">
            <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 13 }}>sin resultados</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 items-start" style={{ gridAutoFlow: 'dense' }}>
            {finalBlocks.map(block => {
              if (block.kind === 'content') { return (
                <button key={`cc-${block.card.id}-${block.fi}`}
                  onClick={() => { setSelectedContent(block.card); window.history.pushState({}, '', '/') }}
                  className="col-span-2 relative overflow-hidden text-left"
                  style={{ borderRadius: 12, border: '1px solid rgba(239,255,66,0.12)', cursor: 'pointer' }}>
                  <div style={{ paddingBottom: '66.5%' }} />
                  <div className="absolute inset-0" style={{
                    background: 'rgba(239,255,66,0.03)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    padding: '16px 14px 12px',
                  }}>
                    <div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(239,255,66,0.4)', letterSpacing: '0.18em', marginBottom: 8, textTransform: 'uppercase' }}>
                        Flashttoo
                      </div>
                      <p className="text-white font-bold" style={{ fontSize: 14, lineHeight: 1.3 }}>{block.card.title}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5, lineHeight: 1.5 }}>
                        {block.card.body.slice(0, 80)}{block.card.body.length > 80 ? '…' : ''}
                      </p>
                    </div>
                    <p style={{ fontSize: 10, color: 'rgba(239,255,66,0.35)', textAlign: 'right' }}>leer más →</p>
                  </div>
                </button>
              )}
              if (block.kind === 'featured') {
                const big = block.big as { type: 'artist'; data: Artist }
                return (
                  <div key={`feat-${big.data.id}`}
                    className={block.rightAlign ? 'sm:col-start-2 lg:col-start-3' : ''}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, gridColumnEnd: 'span 3' }}>
                    {/* Grande: 2/3 del ancho */}
                    <button onClick={() => openModal(big.data)}
                      className="group relative overflow-hidden"
                      style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ paddingBottom: '133%' }} />
                      <div className="absolute inset-0" style={{ background: '#111' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={big.data.photo_url} alt={big.data.name}
                          loading={block.fi < 4 ? 'eager' : 'lazy'}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={e => { e.currentTarget.style.opacity = '0' }} />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)' }} />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white font-bold" style={{ fontSize: 16, overflowWrap: 'break-word' }}>{big.data.name}</p>
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{big.data.city}</p>
                        </div>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                          style={{ borderRadius: 11, boxShadow: 'inset 0 0 0 1px rgba(239,255,66,0.3)' }} />
                      </div>
                    </button>
                    {/* 2 chicas apiladas: 1/3 del ancho */}
                    <div className="flex flex-col gap-3">
                      {[block.s1, block.s2].map((item, si) => item.type === 'artist' ? (
                        <button key={item.data.id} onClick={() => openModal(item.data)}
                          className="group relative overflow-hidden"
                          style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ paddingBottom: '133%' }} />
                          <div className="absolute inset-0" style={{ background: '#111' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.data.photo_url} alt={item.data.name} loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              onError={e => { e.currentTarget.style.opacity = '0' }} />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-white font-bold leading-tight" style={{ fontSize: 11, overflowWrap: 'break-word' }}>{item.data.name}</p>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{item.data.city}</p>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <a key={`ad-s${si}-${item.data.id}`}
                          href={item.data.link} target="_blank" rel="noopener noreferrer"
                          onClick={() => trackClick(item.data.id, 'ad')}
                          className="group relative overflow-hidden"
                          style={{ borderRadius: 12, border: '1px solid rgba(239,255,66,0.15)' }}>
                          <div style={{ paddingBottom: '133%' }} />
                          <div className="absolute inset-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.data.image_url} alt={item.data.title} loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={e => { e.currentTarget.style.opacity = '0' }} />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 60%)' }} />
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-white font-bold" style={{ fontSize: 10 }}>{item.data.title}</p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )
              }
              // Tarjeta normal (artista o ad)
              if (block.kind !== 'single') return null
              const item = block.item
              if (item.type === 'artist') return (
                <button key={item.data.id} onClick={() => openModal(item.data)}
                  className="group relative overflow-hidden"
                  style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ paddingBottom: '133%' }} />
                  <div className="absolute inset-0" style={{ background: '#111' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.data.photo_url} alt={item.data.name}
                      loading={block.fi < 4 ? 'eager' : 'lazy'}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={e => { e.currentTarget.style.opacity = '0' }} />
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
              return (
                <a key={`ad-${item.data.id}-${block.fi}`}
                  href={item.data.link} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackClick(item.data.id, 'ad')}
                  className="relative overflow-hidden group"
                  style={{ borderRadius: 12, border: '1px solid rgba(239,255,66,0.15)' }}>
                  <div style={{ paddingBottom: '133%' }} />
                  <div className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.data.image_url} alt={item.data.title} loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={e => { e.currentTarget.style.opacity = '0' }} />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
                    <div className="absolute top-2 right-2">
                      <span style={{ background: 'rgba(239,255,66,0.9)', color: '#000', fontSize: 9, letterSpacing: '0.06em' }}
                        className="text-xs px-2 py-0.5 rounded-full font-bold">PUBLICIDAD</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-bold" style={{ fontSize: 12 }}>{item.data.title}</p>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>


      {/* ── MODAL ──────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', animation: 'fadeInYellow 0.22s ease' }}
          onClick={closeModal}>

          <div className="flex justify-center items-start min-h-full pb-64 sm:px-4 sm:pt-6">
          <div className="flex flex-col w-full sm:max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="relative w-full overflow-hidden"
            style={{ background: '#111', borderRadius: editOpen ? '20px 20px 0 0' : 20, border: '1px solid rgba(255,255,255,0.08)', borderBottom: editOpen ? 'none' : '1px solid rgba(255,255,255,0.08)', boxShadow: editOpen ? 'none' : '0 40px 100px rgba(0,0,0,0.9)' }}>

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
                      {copiedEmail ? 'Mail copiado' : 'Email'}
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
                    <StatItem label="visitas"   value={selected.profile_views ?? 0} />
                    <StatItem label="Instagram" value={selected.instagram_clicks ?? 0} />
                    <StatItem label="WhatsApp"  value={selected.whatsapp_clicks ?? 0} />
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
                Editar perfil
              </p>
              <input
                autoFocus
                value={editKey}
                onChange={e => { setEditKey(e.target.value.toUpperCase()); setEditKeyError('') }}
                onKeyDown={e => { if (e.key === 'Enter') verifyEditKey() }}
                placeholder="CLAVE DE EDICIÓN"
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
                {editVerifying ? 'Verificando...' : 'Entrar →'}
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
                  Conocé a {selected.name}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {answered.map(q => (
                    <div key={q.key}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5, lineHeight: 1.4 }}>
                        {q.label}
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
                ← cerrar
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
    </main>
  )
}

