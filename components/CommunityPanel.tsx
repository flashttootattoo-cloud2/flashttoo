'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

type CommunityPost = {
  id: string
  type: 'artist' | 'studio' | 'sponsor' | 'client' | 'admin'
  content: string
  city: string | null
  country: string | null
  contact_type: 'ig' | 'whatsapp' | 'email' | null
  contact: string | null
  client_name: string | null
  client_emoji: string | null
  artist_id: string | null
  artist_name: string | null
  artist_photo: string | null
  artist_slug: string | null
  show_flashbook: boolean | null
  flashbook_alias: string | null
  show_availability: boolean | null
  studio_name: string | null
  studio_logo: string | null
  studio_slug: string | null
  sponsor_id: string | null
  sponsor_name: string | null
  sponsor_logo: string | null
  sponsor_slug: string | null
  sponsor_description: string | null
  sponsor_whatsapp: string | null
  offer_title: string | null
  offer_items: { name: string; price: number }[] | null
  created_at: string
}

const EMOJIS = ['🙂','😊','🤔','🎨','✏️','🌙','🔥','⚡','🌿','💀','🐍','🦋','🌸','👁️','🖤']

// Compara contra una lista separada por coma (ej. países de venta de una marca)
function matchesAnyCountry(stored: string | null | undefined, target: string): boolean {
  if (!stored || !target) return false
  return stored.split(',').map(v => v.trim().toLowerCase()).filter(Boolean).includes(target)
}

function timeAgo(iso: string, nowLabel = 'ahora'): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return nowLabel
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function popoverPos(btn: HTMLButtonElement | null, width = 260): { top?: number; bottom?: number; left: number } | null {
  if (!btn) return null
  const rect = btn.getBoundingClientRect()
  const left = Math.min(rect.left, window.innerWidth - width - 12)
  return rect.top < window.innerHeight / 2
    ? { top: rect.bottom + 8, left }
    : { bottom: window.innerHeight - rect.top + 8, left }
}

function contactLabel(type: string | null, val: string | null): { href: string } | null {
  if (!type || !val) return null
  if (type === 'ig') return { href: `https://instagram.com/${val.replace('@', '')}` }
  if (type === 'whatsapp') return { href: `https://wa.me/${val.replace(/\D/g, '')}` }
  if (type === 'email') return { href: `mailto:${val}` }
  return null
}

type Props = {
  loggedArtist: { id: string; name: string; photo_url: string | null; slug: string; city?: string; country?: string; flashbook_alias?: string | null } | null
  loggedStudio: { slug: string; name: string; logo_url: string | null; visible?: boolean; expires_at?: string | null; access_token?: string; refresh_token?: string; city?: string; country?: string } | null
  loggedSponsor?: { slug: string; name: string; logo_url: string | null; active: boolean; expires_at?: string | null; access_token: string; refresh_token?: string } | null
  onOpenArtist: (id: string) => void
  onOpenStudio: (slug: string) => void
  onOpenSponsor?: (slug: string) => void
  onOpenAvailability?: (artist_id: string, artist_name: string, artist_photo: string | null) => void
  onSponsorTokenRefreshed?: (tokens: { access_token: string; refresh_token?: string }) => void
  onStudioTokenRefreshed?: (tokens: { access_token: string; refresh_token?: string }) => void
  onClose?: () => void
  lang?: string
  highlightPostId?: string
}

export default function CommunityPanel({ loggedArtist, loggedStudio, loggedSponsor, onOpenArtist, onOpenStudio, onOpenSponsor, onOpenAvailability, onSponsorTokenRefreshed, onStudioTokenRefreshed, onClose, lang = 'es', highlightPostId }: Props) {
  const { t } = useTranslation()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [postError, setPostError] = useState('')
  const [showClientForm, setShowClientForm] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientEmoji, setClientEmoji] = useState('🙂')
  const [clientCity, setClientCity] = useState('')
  const [clientCountry, setClientCountry] = useState('')
  const [contactType, setContactType] = useState<'ig' | 'whatsapp' | 'email'>('whatsapp')
  const [contact, setContact] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [studioLocation, setStudioLocation] = useState<{ city?: string; country?: string } | null>(null)
  const [artistLocation, setArtistLocation] = useState<{ city?: string; country?: string } | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | undefined>(highlightPostId)
  const [filterCity, setFilterCity] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [withFlashbook, setWithFlashbook] = useState(false)
  const [withAvailability, setWithAvailability] = useState(false)
  const [showOfferPicker, setShowOfferPicker] = useState(false)
  const [sponsorOffers, setSponsorOffers] = useState<{ id: string; title: string; items: { name: string; price: number }[] }[] | null>(null)
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null)
  const [loggedHasFutureSlots, setLoggedHasFutureSlots] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const offsetRef = useRef(0)

  // Buscar ciudad del artista logueado si no viene en el prop
  useEffect(() => {
    if (!loggedArtist || (loggedArtist.city && loggedArtist.country)) return
    fetch(`/api/artists/${loggedArtist.id}`)
      .then(r => r.json())
      .then(d => { if (d.artist) setArtistLocation({ city: d.artist.city, country: d.artist.country }) })
      .catch(() => {})
  }, [loggedArtist])

  // Verificar si el artista logueado tiene turnos futuros
  useEffect(() => {
    if (!loggedArtist?.id) { setLoggedHasFutureSlots(false); return }
    const today = new Date().toISOString().slice(0, 10)
    fetch(`/api/flash/availability?artist_id=${loggedArtist.id}`)
      .then(r => r.json())
      .then(d => {
        const slots: { date: string }[] = d?.artist?.availability ?? []
        setLoggedHasFutureSlots(slots.some(s => s.date >= today))
      })
      .catch(() => setLoggedHasFutureSlots(false))
  }, [loggedArtist?.id])

  // Buscar ciudad del estudio logueado si no viene en el prop
  useEffect(() => {
    if (!loggedStudio || (loggedStudio.city && loggedStudio.country)) return
    fetch(`/api/studios/${loggedStudio.slug}`)
      .then(r => r.json())
      .then(d => { if (d.studio) setStudioLocation({ city: d.studio.city, country: d.studio.country }) })
      .catch(() => {})
  }, [loggedStudio])

  const viewerCity    = (loggedArtist?.city ?? artistLocation?.city ?? loggedStudio?.city ?? studioLocation?.city ?? '').toLowerCase()
  const viewerCountry = (loggedArtist?.country ?? artistLocation?.country ?? loggedStudio?.country ?? studioLocation?.country ?? '').toLowerCase()

  const sortByProximity = useCallback((raw: CommunityPost[]) => {
    const sameCountry = (p: CommunityPost) => !!(viewerCountry && p.country?.toLowerCase() === viewerCountry)
    const sameCity    = (p: CommunityPost) => !!(viewerCity && p.city?.toLowerCase() === viewerCity)
    return [...raw].sort((a, b) => {
      const nearbyA = sameCountry(a)
      const nearbyB = sameCountry(b)
      if (nearbyA && !nearbyB) return -1
      if (nearbyB && !nearbyA) return 1
      if (nearbyA && nearbyB) {
        const fullA = sameCity(a)
        const fullB = sameCity(b)
        if (fullA && !fullB) return -1
        if (fullB && !fullA) return 1
      }
      if (!nearbyA && !nearbyB) {
        if (a.type === 'admin' && b.type !== 'admin') return -1
        if (b.type === 'admin' && a.type !== 'admin') return 1
      }
      return 0
    })
  }, [viewerCity, viewerCountry])

  useEffect(() => {
    setPosts(prev => prev.length ? sortByProximity(prev) : prev)
  }, [sortByProximity])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/community?lang=${encodeURIComponent(lang)}&offset=0`)
      const d = await r.json()
      if (Array.isArray(d.posts)) {
        setPosts(sortByProximity(d.posts))
        offsetRef.current = d.posts.length
        setHasMore(d.hasMore ?? false)
      }
    } finally { setLoading(false) }
  }, [sortByProximity, lang])

  const loadMore = useCallback(async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const r = await fetch(`/api/community?lang=${encodeURIComponent(lang)}&offset=${offsetRef.current}`)
      const d = await r.json()
      if (Array.isArray(d.posts) && d.posts.length > 0) {
        setPosts(prev => [...prev, ...d.posts])
        offsetRef.current += d.posts.length
        setHasMore(d.hasMore ?? false)
      } else {
        setHasMore(false)
      }
    } finally { setLoadingMore(false) }
  }, [lang, loadingMore])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!highlightedId || loading) return
    const el = document.getElementById(`cpost-${highlightedId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setHighlightedId(undefined), 3000)
    }
  }, [highlightedId, loading, posts])

  const isLoggedIn = !!(loggedArtist || loggedStudio || loggedSponsor)
  const sponsorBlocked = !!loggedSponsor && (!loggedSponsor.active || (!!loggedSponsor.expires_at && new Date(loggedSponsor.expires_at) < new Date()))
  const studioBlocked = !!loggedStudio && (loggedStudio.visible === false || (!!loggedStudio.expires_at && new Date(loggedStudio.expires_at) < new Date()))

  const CLIENT_KEY = 'community_last_post'
  const clientCanPost = () => {
    try {
      const last = localStorage.getItem(CLIENT_KEY)
      if (!last) return true
      return Date.now() - parseInt(last) > 24 * 60 * 60 * 1000
    } catch { return true }
  }
  const clientHoursLeft = () => {
    try {
      const last = localStorage.getItem(CLIENT_KEY)
      if (!last) return 0
      const remaining = 24 * 60 * 60 * 1000 - (Date.now() - parseInt(last))
      return Math.ceil(remaining / (60 * 60 * 1000))
    } catch { return 0 }
  }

  const share = async (post: CommunityPost) => {
    const url = `${window.location.origin}?comunidad=1&post=${post.id}`
    const name = post.type === 'admin' ? 'Flashttoo' : post.type === 'artist' ? post.artist_name : post.type === 'studio' ? post.studio_name : post.type === 'sponsor' ? post.sponsor_name : post.client_name
    const location = [post.city, post.country].filter(Boolean).join(', ')
    const shareText = `${name ? `${name}${location ? ` · ${location}` : ''}\n` : ''}${post.content}\n\n${url}`
    if (navigator.share) {
      await navigator.share({ title: 'Flashttoo · Comunidad', text: shareText }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(shareText).catch(() => {})
    }
  }

  const submit = async () => {
    if (!text.trim()) return
    if (sponsorBlocked || studioBlocked) return
    setSending(true)
    setPostError('')
    try {
      let body: Record<string, unknown> = { content: text, lang }
      if (loggedArtist) {
        body = { ...body, type: 'artist', artist_id: loggedArtist.id, artist_name: loggedArtist.name, artist_photo: loggedArtist.photo_url, artist_slug: loggedArtist.slug || loggedArtist.id, city: loggedArtist.city || artistLocation?.city || null, country: loggedArtist.country || artistLocation?.country || null, show_flashbook: withFlashbook || null, flashbook_alias: withFlashbook ? (loggedArtist.flashbook_alias || null) : null, show_availability: withAvailability || null }
      } else if (loggedStudio) {
        body = { ...body, type: 'studio', studio_slug: loggedStudio.slug, access_token: loggedStudio.access_token, city: loggedStudio.city || studioLocation?.city || null, country: loggedStudio.country || studioLocation?.country || null }
      } else if (loggedSponsor) {
        body = { ...body, type: 'sponsor', sponsor_slug: loggedSponsor.slug, access_token: loggedSponsor.access_token, offer_id: selectedOfferId || undefined }
      } else {
        if (!clientName.trim()) return
        if (!clientCanPost()) return
        body = { ...body, type: 'client', client_name: clientName, client_emoji: clientEmoji, city: clientCity, country: clientCountry, contact_type: contactType, contact }
      }
      let r = await fetch('/api/community', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      let d = await r.json()
      // Token de sponsor/estudio vencido — refrescar y reintentar una vez
      const refreshToken = loggedSponsor?.refresh_token || loggedStudio?.refresh_token
      const onTokenRefreshed = loggedSponsor ? onSponsorTokenRefreshed : onStudioTokenRefreshed
      if (r.status === 401 && refreshToken) {
        const ref = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }) })
        if (ref.ok) {
          const tokens = await ref.json()
          onTokenRefreshed?.(tokens)
          body.access_token = tokens.access_token
          r = await fetch('/api/community', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          d = await r.json()
        }
      }
      if (r.ok && d.post) {
        if (!isLoggedIn) { try { localStorage.setItem(CLIENT_KEY, String(Date.now())) } catch {} }
        setPosts(prev => [d.post, ...prev])
        setText('')
        setWithFlashbook(false)
        setWithAvailability(false)
        setShowOfferPicker(false)
        setSelectedOfferId(null)
        setClientName(''); setClientCity(''); setClientCountry(''); setContact('')
        setShowClientForm(false)
      } else if (!r.ok) {
        setPostError(d.error || t('comunidad', 'post_error', 'No se pudo publicar, probá de nuevo'))
      }
    } finally { setSending(false) }
  }

  const placeholder = loggedSponsor
    ? t('comunidad', 'placeholder_sponsor', '¿Qué novedad tenés hoy?')
    : isLoggedIn
    ? t('comunidad', 'placeholder_artist', '¿Qué novedad tenés hoy para quien se quiere tatuar?')
    : t('comunidad', 'placeholder_client', '¿Qué estás buscando?')

  const nowLabel = t('comunidad', 'time_now', 'ahora')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0a', overflow: 'hidden', minWidth: 0 }}>
      <style>{`.community-textarea::placeholder { color: rgba(255,255,255,0.18); }`}</style>

      {/* Header */}
      <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#efff42', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              {t('comunidad', 'header', 'Comunidad')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={load} style={{ fontSize: 18, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>↻</button>
            {onClose && (
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            )}
          </div>
        </div>
      </div>

      {/* Composer */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: isLoggedIn ? 'default' : 'pointer' }}
            onClick={() => !isLoggedIn && setShowEmojiPicker(v => !v)}>
            {loggedArtist?.photo_url
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={loggedArtist.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : loggedStudio?.logo_url
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={loggedStudio.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : loggedSponsor?.logo_url
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={loggedSponsor.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
              : <span>{clientEmoji}</span>}
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: loggedArtist || loggedStudio || loggedSponsor ? '#efff42' : 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
              {loggedArtist ? loggedArtist.name : loggedStudio ? loggedStudio.name : loggedSponsor ? loggedSponsor.name : clientName || t('comunidad', 'you', 'Vos')}
            </p>
            {sponsorBlocked || studioBlocked ? (
              <p style={{ fontSize: 13, color: 'rgba(255,100,100,0.7)', lineHeight: 1.5, margin: 0 }}>
                {t('comunidad', 'sponsor_blocked', 'Tu perfil está bloqueado — no podés publicar hasta que se reactive la suscripción.')}
              </p>
            ) : (
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={placeholder}
                maxLength={300}
                rows={2}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, resize: 'none', lineHeight: 1.5, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', caretColor: '#efff42' }}
                className="community-textarea"
              />
            )}
            {loggedArtist && (
              <div style={{ marginTop: 8, marginBottom: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {loggedArtist.flashbook_alias && (
                  <button type="button" onClick={() => setWithFlashbook(v => !v)}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1px solid ${withFlashbook ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, background: withFlashbook ? 'rgba(239,255,66,0.1)' : 'transparent', color: withFlashbook ? '#efff42' : 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                    {withFlashbook ? t('comunidad', 'flashbook_attached', 'Flashbook adjunto') : t('comunidad', 'attach_flashbook', '+ Adjuntar tu flashbook')}
                  </button>
                )}
                {loggedHasFutureSlots && (
                  <button type="button" onClick={() => setWithAvailability(v => !v)}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1px solid ${withAvailability ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, background: withAvailability ? 'rgba(239,255,66,0.1)' : 'transparent', color: withAvailability ? '#efff42' : 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                    {withAvailability ? t('comunidad','turnos_adjuntos','Turnos adjuntos') : t('comunidad','adjuntar_turnos','+ Adjuntar turnos libres')}
                  </button>
                )}
              </div>
            )}
            {loggedSponsor && !sponsorBlocked && (
              <div style={{ marginTop: 8 }}>
                <button type="button" onClick={async () => {
                    const next = !showOfferPicker
                    setShowOfferPicker(next)
                    if (next && sponsorOffers === null) {
                      setLoadingOffers(true)
                      try {
                        const r = await fetch(`/api/sponsor-offers?access_token=${encodeURIComponent(loggedSponsor.access_token)}`)
                        const d = await r.json()
                        setSponsorOffers(r.ok ? (d.offers ?? []) : [])
                      } catch { setSponsorOffers([]) } finally { setLoadingOffers(false) }
                    }
                  }}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1px solid ${selectedOfferId ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, background: selectedOfferId ? 'rgba(239,255,66,0.1)' : 'transparent', color: selectedOfferId ? '#efff42' : 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                  {selectedOfferId ? `⚡ ${sponsorOffers?.find(o => o.id === selectedOfferId)?.title ?? t('comunidad', 'offer_title', 'Pedido Flash')}` : t('comunidad', 'attach_offer', '+ Agregar Pedido Flash')}
                </button>
                {showOfferPicker && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {loadingOffers ? (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{t('offers', 'loading', 'Cargando...')}</p>
                    ) : !sponsorOffers || sponsorOffers.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                        {t('comunidad', 'no_offers_hint', 'Todavía no armaste ninguna oferta. Creá una desde tu menú → Pedido Flash.')}
                      </p>
                    ) : (
                      sponsorOffers.map(offer => (
                        <button key={offer.id} type="button"
                          onClick={() => { setSelectedOfferId(prev => prev === offer.id ? null : offer.id); setShowOfferPicker(false) }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '8px 10px', borderRadius: 8, border: `1px solid ${selectedOfferId === offer.id ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.08)'}`, background: selectedOfferId === offer.id ? 'rgba(239,255,66,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{offer.title}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{offer.items.map(it => it.name).join(' · ')}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {postError && (
              <p style={{ fontSize: 12, color: 'rgba(255,100,100,0.8)', marginTop: 6, marginBottom: 0 }}>{postError}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{text.length}/300</span>
              <button
                onClick={() => isLoggedIn ? submit() : (text.trim() ? setShowClientForm(true) : null)}
                disabled={sending || !text.trim() || sponsorBlocked || studioBlocked}
                style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', background: text.trim() && !sponsorBlocked && !studioBlocked ? '#efff42' : 'rgba(255,255,255,0.08)', color: text.trim() && !sponsorBlocked && !studioBlocked ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: 20, cursor: text.trim() && !sponsorBlocked && !studioBlocked ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                {sending ? '...' : t('comunidad', 'publish', 'Publicar')}
              </button>
            </div>
          </div>
        </div>

        {/* Emoji picker (solo clientes) */}
        {!isLoggedIn && showEmojiPicker && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 0 4px', marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => { setClientEmoji(e); setShowEmojiPicker(false) }}
                style={{ fontSize: 22, background: clientEmoji === e ? 'rgba(239,255,66,0.15)' : 'none', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 4 }}>
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Formulario cliente */}
        {!isLoggedIn && showClientForm && (
          <div style={{ marginTop: 12, padding: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t('comunidad', 'your_info', 'Tu información')}
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t('comunidad', 'your_name', 'Tu nombre *')}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={clientCity} onChange={e => setClientCity(e.target.value)} placeholder={t('comunidad', 'city', 'Ciudad')}
                style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
              <input value={clientCountry} onChange={e => setClientCountry(e.target.value)} placeholder={t('comunidad', 'country', 'País')}
                style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
              {t('comunidad', 'how_contact', '¿Cómo te contactamos?')}
            </p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {(['whatsapp', 'ig', 'email'] as const).map(ct => (
                <button key={ct} onClick={() => setContactType(ct)}
                  style={{ flex: 1, padding: '6px 4px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: `1px solid ${contactType === ct ? '#efff42' : 'rgba(255,255,255,0.1)'}`, background: contactType === ct ? 'rgba(239,255,66,0.1)' : 'rgba(255,255,255,0.04)', color: contactType === ct ? '#efff42' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  {ct === 'whatsapp' ? 'WhatsApp' : ct === 'ig' ? 'Instagram' : 'Email'}
                </button>
              ))}
            </div>
            <input value={contact} onChange={e => setContact(e.target.value)}
              placeholder={contactType === 'ig' ? '@tu_usuario' : contactType === 'whatsapp' ? '+54 11 xxxx xxxx' : 'tu@email.com'}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            {!clientCanPost() && (
              <p style={{ fontSize: 11, color: 'rgba(255,180,0,0.7)', marginTop: 4 }}>
                {t('comunidad', 'daily_limit', 'Ya publicaste hoy. Podés volver a publicar en {h}h.').replace('{h}', String(clientHoursLeft()))}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={submit} disabled={sending || !clientName.trim() || !clientCanPost()}
                style={{ flex: 1, padding: '9px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: clientName.trim() && clientCanPost() ? '#efff42' : 'rgba(255,255,255,0.08)', color: clientName.trim() && clientCanPost() ? '#000' : 'rgba(255,255,255,0.3)', cursor: clientName.trim() && clientCanPost() ? 'pointer' : 'default' }}>
                {sending ? t('comunidad', 'publishing', 'Publicando...') : t('comunidad', 'publish', 'Publicar')}
              </button>
              <button onClick={() => setShowClientForm(false)}
                style={{ padding: '9px 16px', fontSize: 13, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                {t('comunidad', 'cancel', 'Cancelar')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filtro por zona — solo clientes */}
      {!isLoggedIn && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', gap: 8 }}>
          <input
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
            placeholder={t('comunidad', 'filter_city', 'Filtrar por ciudad...')}
            style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }}
          />
          <input
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            placeholder={t('comunidad', 'filter_country', 'País...')}
            style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }}
          />
          {(filterCity || filterCountry) && (
            <button
              onClick={() => { setFilterCity(''); setFilterCountry('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 16, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>
              ×
            </button>
          )}
        </div>
      )}

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
            {t('comunidad', 'loading', 'Cargando...')}
          </div>
        )}
        {!loading && posts.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              {t('comunidad', 'empty_state', 'Sé el primero en publicar. Contá qué novedades tenés.')}
            </p>
          </div>
        )}
        {(() => {
          const fc = filterCity.trim().toLowerCase()
          const fco = filterCountry.trim().toLowerCase()
          const filtered = (fc || fco)
            ? posts.filter(p =>
                (!fc  || p.city?.toLowerCase().includes(fc)) &&
                (!fco || p.country?.toLowerCase().includes(fco))
              )
            : posts
          if (!loading && filtered.length === 0 && (fc || fco)) {
            return (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                  {t('comunidad', 'no_posts_zone', 'No hay publicaciones en esa zona aún.')}
                </p>
              </div>
            )
          }
          return filtered.map((post: CommunityPost) => {
            const viewerCity = (loggedArtist?.city ?? artistLocation?.city ?? loggedStudio?.city ?? studioLocation?.city ?? '').toLowerCase()
            const viewerCountry = (loggedArtist?.country ?? artistLocation?.country ?? loggedStudio?.country ?? studioLocation?.country ?? '').toLowerCase()
            const sameCountry = !!(viewerCountry && matchesAnyCountry(post.country, viewerCountry))
            const nearby: 'full' | 'country' | false = sameCountry
              ? (viewerCity && post.city?.toLowerCase() === viewerCity ? 'full' : 'country')
              : false
            const ownerId = loggedArtist?.id ?? loggedStudio?.slug ?? loggedSponsor?.slug ?? null
            const isOwn = !!(ownerId && (
              (post.type === 'artist' && post.artist_id === ownerId) ||
              (post.type === 'studio' && post.studio_slug === ownerId) ||
              (post.type === 'sponsor' && post.sponsor_slug === ownerId)
            ))
            return (
              <PostCard key={post.id} post={post} onShare={share}
                onOpenArtist={onOpenArtist} onOpenStudio={onOpenStudio} onOpenSponsor={onOpenSponsor}
                onOpenAvailability={onOpenAvailability}
                reporterId={ownerId}
                nearby={nearby}
                isOwn={isOwn}
                highlighted={post.id === highlightedId}
                nowLabel={nowLabel}
                onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} />
            )
          })
        })()}
        {hasMore && (
          <div style={{ padding: '12px 16px' }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: loadingMore ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', fontSize: 13, cursor: loadingMore ? 'default' : 'pointer' }}>
              {loadingMore ? '·  ·  ·' : '+'}
            </button>
          </div>
        )}
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}

function OfferWidget({ items, whatsapp }: { items: { name: string; price: number }[]; whatsapp: string | null }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const toggle = (i: number) => setSelected(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const total = items.reduce((sum, it, i) => selected.has(i) ? sum + it.price : sum, 0)
  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

  const waHref = (() => {
    if (!whatsapp || selected.size === 0) return null
    const lines = items.filter((_, i) => selected.has(i)).map(it => `- ${it.name} ($${fmt(it.price)})`)
    const text = `${t('comunidad', 'offer_wa_intro', 'Hola! Quiero pedir esto de tu Pedido Flash')}:\n${lines.join('\n')}\n${t('comunidad', 'offer_wa_total', 'Total')}: $${fmt(total)}`
    return `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
  })()

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, margin: '0 10px 10px', overflow: 'hidden' }}>
      <div>
        {items.map((it, i) => (
          <button key={i} type="button" onClick={() => toggle(i)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${selected.has(i) ? '#efff42' : 'rgba(255,255,255,0.25)'}`, background: selected.has(i) ? '#efff42' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selected.has(i) && <span style={{ fontSize: 10, color: '#000', fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', flexShrink: 0, marginLeft: 8 }}>${fmt(it.price)}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{t('comunidad', 'offer_wa_total', 'Total')}: <strong style={{ color: '#fff' }}>${fmt(total)}</strong></span>
        {waHref ? (
          <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            style={{ fontSize: 11, fontWeight: 700, color: '#000', background: '#38bdf8', borderRadius: 20, padding: '5px 12px', textDecoration: 'none', letterSpacing: '0.02em' }}>
            {t('comunidad', 'offer_wa_btn', 'Pedir por WhatsApp')}
          </a>
        ) : (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            {selected.size === 0 ? t('comunidad', 'offer_select_hint', 'Elegí algo') : t('comunidad', 'offer_no_wa', 'Sin WhatsApp')}
          </span>
        )}
      </div>
    </div>
  )
}

function CopyEmailButton({ email }: { email: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {}) }}
      style={{ fontSize: 11, fontWeight: 700, color: '#000', background: '#38bdf8', border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.04em' }}>
      {copied ? t('comunidad', 'copied', 'Copiado ✓') : t('comunidad', 'copy_email', 'Copiar email')}
    </button>
  )
}

function ReplyRow({ post, contact, onOpenArtist, onOpenStudio, onOpenSponsor, onShare, reporterId, isOwn, onDelete }: {
  post: CommunityPost
  contact: { href: string } | null
  onOpenArtist: (id: string) => void
  onOpenStudio: (slug: string) => void
  onOpenSponsor?: (slug: string) => void
  onShare: (p: CommunityPost) => void
  reporterId: string | null
  isOwn: boolean
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [showCountries, setShowCountries] = useState(false)
  const [contactPos, setContactPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const [countriesPos, setCountriesPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const contactBtnRef = useRef<HTMLButtonElement>(null)
  const countriesBtnRef = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ bottom: number; right: number } | null>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [reported, setReported] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isArtist = post.type === 'artist'
  const isStudio = post.type === 'studio'
  const isSponsor = post.type === 'sponsor'
  const isClient = post.type === 'client'

  const showMenu = isOwn || (isClient && !!reporterId)

  const closeMenu = () => {
    if (autoCloseRef.current) { clearTimeout(autoCloseRef.current); autoCloseRef.current = null }
    setMenuOpen(false)
  }

  const openMenu = () => {
    if (menuOpen) { closeMenu(); return }
    setReported(false)
    if (menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect()
      setMenuPos({ bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right })
    }
    setMenuOpen(true)
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current)
    autoCloseRef.current = setTimeout(() => { setMenuOpen(false); autoCloseRef.current = null }, 5000)
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button
          ref={contactBtnRef}
          onClick={() => { if (open) { setOpen(false); return } setContactPos(popoverPos(contactBtnRef.current)); setOpen(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: open ? 'rgba(239,255,66,0.7)' : 'rgba(255,255,255,0.55)', fontSize: 12, padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <button
          onClick={() => onShare(post)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', padding: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        {isSponsor && post.country && (
          <button
            ref={countriesBtnRef}
            onClick={() => { if (showCountries) { setShowCountries(false); return } setCountriesPos(popoverPos(countriesBtnRef.current)); setShowCountries(true) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: showCountries ? 'rgba(239,255,66,0.7)' : 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', padding: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </button>
        )}
        {showMenu && (
          <div style={{ marginLeft: 'auto' }}>
            <button
              ref={menuBtnRef}
              onClick={openMenu}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.22)', fontSize: 16, lineHeight: 1, letterSpacing: '-1px', padding: '0 2px' }}>
              ···
            </button>
            {menuOpen && menuPos && (
              <>
                <div onClick={closeMenu} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
                <div style={{ position: 'fixed', bottom: menuPos.bottom, right: menuPos.right, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', minWidth: 130, zIndex: 200 }}>
                  {isOwn ? (
                    <button
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true)
                        await fetch(`/api/community/${post.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner_id: reporterId }) }).catch(() => {})
                        onDelete(post.id)
                      }}
                      style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: deleting ? 'rgba(255,80,80,0.4)' : 'rgba(255,80,80,0.8)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {deleting ? t('comunidad', 'deleting', 'Borrando...') : t('comunidad', 'delete', 'Borrar')}
                    </button>
                  ) : reported ? (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '10px 14px', margin: 0 }}>
                      {t('comunidad', 'thanks_report', 'Gracias por reportar')}
                    </p>
                  ) : (
                    <button
                      onClick={() => { setReported(true); fetch('/api/community/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: post.id, reporter_id: reporterId }) }).catch(() => {}); setTimeout(() => setMenuOpen(false), 5000) }}
                      style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: 'rgba(255,80,80,0.8)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('comunidad', 'report', 'Reportar')}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showCountries && post.country && countriesPos && (
        <>
          <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div onClick={() => setShowCountries(false)} style={{ position: 'fixed', inset: 0, zIndex: 129 }} />
          <div
            style={{ position: 'fixed', ...countriesPos, zIndex: 130, width: 260, borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.9)', animation: 'slideUpModal 0.28s cubic-bezier(0.22,0.61,0.36,1)', overflow: 'hidden', background: 'rgba(18,18,20,0.92)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ padding: '16px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                {t('comunidad', 'find_us_in', 'Encontranos en')}
              </p>
              <button onClick={() => setShowCountries(false)}
                style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, margin: '0 10px 10px', overflow: 'hidden' }}>
              {post.country.split(',').map(v => v.trim()).filter(Boolean).map(c => (
                <div key={c} style={{ padding: '6px 18px' }}>
                  <span style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.85)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {open && contactPos && (
        <>
          <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 129 }} />
          <div
            style={{ position: 'fixed', ...contactPos, zIndex: 130, width: 260, borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.9)', animation: 'slideUpModal 0.28s cubic-bezier(0.22,0.61,0.36,1)', overflow: 'hidden', background: 'rgba(18,18,20,0.92)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ padding: '16px 18px 10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isArtist ? post.artist_name : isStudio ? post.studio_name : isSponsor ? post.sponsor_name : post.client_name}
                </p>
                <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  {isClient ? t('comunidad', 'contact_here', 'Contactame aquí') : t('comunidad', 'contact_from_profile', 'Contactá desde su perfil')}
                </p>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ flexShrink: 0, fontSize: 16, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '0 18px 18px' }}>
              {(isArtist || isStudio || isSponsor) && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                  <button
                    onClick={() => { if (isArtist && post.artist_id) onOpenArtist(post.artist_id); else if (isStudio && post.studio_slug) onOpenStudio(post.studio_slug); else if (isSponsor && post.sponsor_id) onOpenSponsor?.(post.sponsor_id) }}
                    style={{ fontSize: 11, fontWeight: 700, color: '#000', background: '#38bdf8', border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.04em' }}>
                    {t('comunidad', 'view_profile', 'Ver perfil')}
                  </button>
                </div>
              )}
              {isClient && contact && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                  {post.contact_type === 'email'
                    ? <CopyEmailButton email={post.contact!} />
                    : <a href={contact.href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ fontSize: 11, fontWeight: 700, color: '#000', background: '#38bdf8', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.04em', textDecoration: 'none' }}>
                        {post.contact_type === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                      </a>
                  }
                </div>
              )}
              {isClient && !contact && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center' }}>
                  {t('comunidad', 'no_contact', 'Este usuario no dejó contacto.')}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PostCard({ post, onShare, onOpenArtist, onOpenStudio, onOpenSponsor, onOpenAvailability, reporterId, nearby, isOwn, highlighted, nowLabel, onDelete }: {
  post: CommunityPost
  onShare: (p: CommunityPost) => void
  onOpenArtist: (slug: string) => void
  onOpenStudio: (slug: string) => void
  onOpenSponsor?: (slug: string) => void
  onOpenAvailability?: (artist_id: string, artist_name: string, artist_photo: string | null) => void
  reporterId: string | null
  nearby: 'full' | 'country' | false
  isOwn: boolean
  highlighted?: boolean
  nowLabel: string
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  const isArtist = post.type === 'artist'
  const isStudio = post.type === 'studio'
  const isSponsor = post.type === 'sponsor'
  const isClient = post.type === 'client'
  const isAdmin  = post.type === 'admin'
  const contact  = contactLabel(post.contact_type, post.contact)
  const [showOffer, setShowOffer] = useState(false)
  const [offerPos, setOfferPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const offerBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <div id={`cpost-${post.id}`} style={{
      padding: '14px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: highlighted ? 'rgba(239,255,66,0.10)' : isAdmin ? 'rgba(239,255,66,0.04)' : 'transparent',
      borderLeft: isAdmin || nearby === 'full' || highlighted ? '3px solid #efff42' : nearby === 'country' ? '1px solid rgba(239,255,66,0.4)' : '3px solid transparent',
      transition: 'background 1.5s ease, border-left-color 1.5s ease',
    }}>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>

        <div
          onClick={() => { if (isArtist && post.artist_id) onOpenArtist(post.artist_id); else if (isStudio && post.studio_slug) onOpenStudio(post.studio_slug); else if (isSponsor && post.sponsor_id) onOpenSponsor?.(post.sponsor_id) }}
          style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: isAdmin || isSponsor ? '#000' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: isArtist ? '2px solid #efff42' : isStudio ? '2px solid #4dcfff' : isSponsor ? '2px solid #c084fc' : isAdmin ? '2px solid #efff42' : 'none', cursor: (isArtist || isStudio || isSponsor) ? 'pointer' : 'default' }}>
          {isAdmin
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src="/icon-desktop-512.png" alt="Flashttoo" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
            : isArtist && post.artist_photo
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={post.artist_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : isStudio && post.studio_logo
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={post.studio_logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : isSponsor && post.sponsor_logo
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={post.sponsor_logo} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
            : <span>{post.client_emoji ?? '🙂'}</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
              <span
                style={{ fontSize: 13, fontWeight: 700, color: '#fff', cursor: (isArtist || isStudio || isSponsor) ? 'pointer' : 'default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                onClick={() => { if (isArtist && post.artist_id) onOpenArtist(post.artist_id); else if (isStudio && post.studio_slug) onOpenStudio(post.studio_slug); else if (isSponsor && post.sponsor_id) onOpenSponsor?.(post.sponsor_id) }}>
                {isAdmin ? 'Flashttoo' : isArtist ? post.artist_name : isStudio ? post.studio_name : isSponsor ? post.sponsor_name : post.client_name}
              </span>
              {(isArtist || isStudio || isAdmin) && (
                <span style={{ fontSize: 9, fontWeight: 700, color: isAdmin ? '#efff42' : isArtist ? 'rgba(239,255,66,0.55)' : 'rgba(100,200,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                  {isAdmin ? t('comunidad', 'badge_official', 'Oficial') : isArtist ? t('comunidad', 'badge_artist', 'Tattoo Artist') : t('comunidad', 'badge_studio', 'Estudio')}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 8 }}>{timeAgo(post.created_at, nowLabel)}</span>
          </div>
          {isSponsor && post.sponsor_description && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
              {post.sponsor_description}
            </p>
          )}
          {!isAdmin && !isSponsor && (post.city || post.country) && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
              {[post.city, post.country].filter(Boolean).join(', ')}
            </p>
          )}

          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            {post.content}
          </p>

          {isSponsor && post.offer_items && post.offer_items.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <button type="button" ref={offerBtnRef}
                onClick={() => { if (showOffer) { setShowOffer(false); return } setOfferPos(popoverPos(offerBtnRef.current, 350)); setShowOffer(true) }}
                style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', background: 'rgba(239,255,66,0.1)', border: 'none', borderRadius: 20, color: '#efff42', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                ⚡ {post.offer_title || t('comunidad', 'offer_title', 'Pedido Flash')}
              </button>
            </div>
          )}

          {showOffer && post.offer_items && offerPos && (
            <>
              <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
              <div onClick={() => setShowOffer(false)} style={{ position: 'fixed', inset: 0, zIndex: 129 }} />
              <div
                style={{ position: 'fixed', ...offerPos, zIndex: 130, width: 350, borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.9)', animation: 'slideUpModal 0.28s cubic-bezier(0.22,0.61,0.36,1)', overflow: 'hidden', background: 'rgba(18,18,20,0.92)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ padding: '16px 18px 10px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {post.sponsor_logo && (
                      <div style={{ width: 22, height: 16, borderRadius: 4, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.sponsor_logo} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      </div>
                    )}
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      ⚡ {post.offer_title || t('comunidad', 'offer_title', 'Pedido Flash')}
                    </p>
                  </div>
                  <button onClick={() => setShowOffer(false)}
                    style={{ flexShrink: 0, fontSize: 16, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
                <OfferWidget items={post.offer_items} whatsapp={post.sponsor_whatsapp} />
              </div>
            </>
          )}

          {(post.show_flashbook && post.flashbook_alias) || post.show_availability ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {post.show_flashbook && post.flashbook_alias && (
                <a href={`/flash/${post.flashbook_alias}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', background: 'rgba(56,189,248,0.1)', border: 'none', borderRadius: 20, color: '#38bdf8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                  {t('comunidad', 'view_flashbook', 'Ver flashbook')}
                </a>
              )}
              {post.show_availability && post.artist_id && (
                <button type="button"
                  onClick={() => onOpenAvailability?.(post.artist_id!, post.artist_name ?? '', post.artist_photo ?? null)}
                  style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', background: 'rgba(56,189,248,0.1)', border: 'none', borderRadius: 20, color: '#38bdf8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {t('comunidad','turnos_libres_chip','Turnos libres')}
                </button>
              )}
            </div>
          ) : null}

          {isAdmin
            ? (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => onShare(post)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', padding: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
              </div>
            )
            : <ReplyRow post={post} contact={contact} onOpenArtist={onOpenArtist} onOpenStudio={onOpenStudio} onOpenSponsor={onOpenSponsor} onShare={onShare} reporterId={reporterId} isOwn={isOwn} onDelete={onDelete} />
          }
        </div>
      </div>
    </div>
  )
}
