'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase, type Artist } from '@/lib/supabase'
import EditPanel from '@/components/EditPanel'

const STYLES = [
  'Tradicional','Realismo','Blackwork','Acuarela','Geométrico',
  'Japonés','Neo Tradicional','Minimalista','Old School','Dotwork',
  'Fineline','Lettering','Tribal','Biomecánico','Cover-up','Otros',
]

type Ad = {
  id: string; title: string; image_url: string; link: string; city: string | null
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
  const [location, setLocation]   = useState('')
  const [activeStyles, setStyles] = useState<string[]>([])
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
  const [loading, setLoading]         = useState(true)

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

  useEffect(() => {
    Promise.all([
      supabase.from('artists').select('*').order('created_at', { ascending: false }),
      supabase.from('ads').select('id,title,image_url,link,city').eq('active', true),
    ]).then(([a, b]) => {
      setArtists(shuffle(a.data || []))
      setAds(shuffle(b.data || []))
      setLoading(false)
    })
  }, [])

  const toggleStyle = (s: string) =>
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const filtered = artists.filter(a => {
    if (a.visible === false) return false
    const q = norm(location)
    const locMatch = !q ||
      norm(a.city).includes(q) ||
      norm(a.country).includes(q)
    const styleMatch = activeStyles.length === 0 ||
      activeStyles.every(s => a.styles.includes(s))
    return locMatch && styleMatch
  })

  // Targeting: sin ciudad = global (siempre), con ciudad/país = solo cuando coincide
  const visibleAds = ads.filter(ad => {
    if (!ad.city) return true  // global
    if (!location.trim()) return false  // ad con target necesita búsqueda activa
    const t = norm(ad.city)
    const l = norm(location)
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
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModalFull() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [closeModalFull])

  // Botón atrás del celular: cierra el modal sin tocar el historial (el browser ya lo hizo)
  useEffect(() => {
    const h = () => {
      if (selected) {
        setSelected(null)
        setEditOpen(false)
        setEditKey('')
        setEditKeyError('')
      }
    }
    window.addEventListener('popstate', h)
    return () => window.removeEventListener('popstate', h)
  }, [selected])

  const hasFilters = location.trim() || activeStyles.length > 0

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
            + agregar
          </Link>
        </div>

        {/* Búsqueda + estilos apilados */}
        <div className="max-w-7xl mx-auto px-5 pb-3 flex flex-col gap-2">

          <input type="text" placeholder="ciudad o país" value={location}
            onChange={e => setLocation(e.target.value)}
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
                  {STYLES.map(s => {
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
            <button onClick={() => { setLocation(''); setStyles([]) }}
              className="self-start text-xs px-3 py-1 rounded-full transition-all"
              style={{ border: '1px solid rgba(255,80,80,0.25)', color: 'rgba(255,100,100,0.5)' }}>
              limpiar todo
            </button>
          )}
        </div>
      </header>

      {!loading && (
        <div className="max-w-7xl mx-auto px-5 pt-4 pb-1">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>
            {filtered.length} tatuador{filtered.length !== 1 ? 'es' : ''}
          </p>
        </div>
      )}

      {/* ── GRID ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-5 py-4">
        {loading ? (
          <div className="columns-2 sm:columns-3 lg:columns-5 gap-3">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="break-inside-avoid mb-3 rounded-xl animate-pulse"
                style={{ height: `${200 + (i % 4) * 50}px`, background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center">
            <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 13 }}>sin resultados</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-5 gap-3">
            {feedItems.map((item, idx) =>
              item.type === 'artist' ? (
                <button key={item.data.id} onClick={() => openModal(item.data)}
                  className="break-inside-avoid mb-3 w-full text-left group block relative overflow-hidden"
                  style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="relative w-full overflow-hidden" style={{ paddingBottom: '133%', background: '#111' }}>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                      style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.04)', letterSpacing: '0.05em' }}>
                      {item.data.name.slice(0, 2).toUpperCase()}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.data.photo_url} alt={item.data.name}
                      loading={idx < 4 ? 'eager' : 'lazy'}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={e => { e.currentTarget.style.opacity = '0' }} />
                    <div className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-bold leading-tight" style={{ fontSize: 13 }}>{item.data.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{item.data.city}</p>
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                      style={{ borderRadius: 11, boxShadow: 'inset 0 0 0 1px rgba(239,255,66,0.3)' }} />
                  </div>
                </button>
              ) : (
                // Ad card
                <a key={`ad-${item.data.id}-${idx}`}
                  href={item.data.link} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackClick(item.data.id, 'ad')}
                  className="break-inside-avoid mb-3 w-full block relative overflow-hidden group"
                  style={{ borderRadius: 12, border: '1px solid rgba(239,255,66,0.15)' }}>
                  <div className="relative w-full" style={{ paddingBottom: '133%' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.data.image_url} alt={item.data.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={e => { e.currentTarget.style.opacity = '0' }} />
                    <div className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
                    <div className="absolute top-2 right-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(239,255,66,0.9)', color: '#000', fontSize: 9, letterSpacing: '0.06em' }}>
                        PUBLICIDAD
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-bold" style={{ fontSize: 12 }}>{item.data.title}</p>
                    </div>
                  </div>
                </a>
              )
            )}
          </div>
        )}
      </div>


      {/* ── MODAL ──────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)' }}
          onClick={closeModal}>

          <div className="flex justify-center items-start min-h-full p-4 pt-6 pb-64">
          <div className="flex flex-col w-full" style={{ maxWidth: 320 }} onClick={e => e.stopPropagation()}>
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
                <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: '#fff' }}>{selected.name}</h2>
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
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 16 }}>
                  {selected.bio}
                </p>
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

