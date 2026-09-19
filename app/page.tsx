'use client'

import React, { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Artist, type Studio } from '@/lib/supabase'
import EditPanel from '@/components/EditPanel'
import ArtistAuthModal from '@/components/ArtistAuthModal'
import SponsorsBannerV2 from '@/components/SponsorsBannerV2'
import ConventionModal from '@/components/ConventionModal'
import CulturaVideoModal from '@/components/CulturaVideoModal'
import StudioPanel from '@/components/StudioPanel'
import { INTERVIEW_QUESTIONS } from '@/lib/interview'
import { useTranslation } from '@/contexts/TranslationContext'
import { renderPhraseContent } from '@/components/PhraseContent'
import CommunityPanel from '@/components/CommunityPanel'
import SearchWizardModal, { SEARCH_WIZARD_SEEN_KEY } from '@/components/SearchWizardModal'
import SponsorOffersModal from '@/components/SponsorOffersModal'

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

type PhraseLink = { label: string; url: string }
type Phrase = {
  id: string; image_url: string; description: string | null; language_code: string
  created_at: string; tags?: string[]; links?: PhraseLink[]
  recent_commenters: { id: string; emoji: string | null; photo_url: string | null }[]
  comment_count: number
}
const PHRASE_TAGS = ['tatuaje','técnica','cultura','arte','diseño','cuidados','minimalista','color','tradicional','blackwork','realismo','geometría','lettering','historia','inspiración']
function phraseReadingTime(desc: string | null): number | null {
  if (!desc) return null
  const words = desc.replace(/^\[img:[^\]]+\]$/gm, '').replace(/^[#>]+\s*/gm, '').replace(/\*\*|\?/g, '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 180))
}
function formatPhraseDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}
// GET autenticado con reintento: si el access_token venció, lo refresca con el refresh_token y reintenta una vez.
async function fetchWithAuthRefresh(url: string, accessToken: string, refreshToken?: string): Promise<{ data: Record<string, unknown> | null; access_token: string; refresh_token?: string }> {
  let token = accessToken
  let refresh = refreshToken
  let r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!r.ok && refresh) {
    const ref = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refresh }) })
    if (ref.ok) {
      const tokens = await ref.json()
      token = tokens.access_token
      refresh = tokens.refresh_token
      r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    }
  }
  const data = await r.json().catch(() => null)
  return { data: r.ok ? data : null, access_token: token, refresh_token: refresh }
}
type PhraseComment = {
  id: string; artist_id: string | null; studio_id: string | null; guest_name: string | null; guest_emoji: string | null
  content: string; created_at: string
  artist_name: string | null; artist_photo_url: string | null; artist_slug: string | null
  studio_name: string | null; studio_slug: string | null; studio_logo_url: string | null
  parent_id: string | null
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


type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function Home() {
  const { t, language, setLanguage, languages } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const [menuLangOpen, setMenuLangOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushCountry, setPushCountry] = useState(() => { try { return sessionStorage.getItem('s_country') || '' } catch { return '' } })
  const [savingPushCountry, setSavingPushCountry] = useState(false)
  const [pushCountryMissing, setPushCountryMissing] = useState(false)
  const [pushNotificationsVisible, setPushNotificationsVisible] = useState(false)

  // Se puede prender/apagar la visibilidad del toggle de notificaciones desde
  // el admin (tintatxm), sin necesitar redeploy — mientras se termina de
  // resolver por qué algunos Android no reciben la notificación
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setPushNotificationsVisible(d?.push_notifications_visible === true)).catch(() => {})
  }, [])

  // Captura el evento de instalación de la PWA (solo Android/Chrome — iOS no
  // tiene esta API, ahí sigue valiendo la instrucción manual de "compartir
  // → agregar a inicio") para poder ofrecer un botón directo de "Instalar app"
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice.catch(() => {})
    setInstallPrompt(null)
  }

  // iOS (cualquier navegador, todos corren sobre WebKit) no tiene la API de
  // instalación automática — ahí la única forma es manual, desde Compartir
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  const togglePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {})
          await sub.unsubscribe()
        }
        setPushEnabled(false)
      } else {
        if (!pushCountry.trim()) {
          setPushCountryMissing(true)
          return
        }
        setPushCountryMissing(false)
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) { alert('Falta la clave VAPID pública (NEXT_PUBLIC_VAPID_PUBLIC_KEY)'); return }
        try {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
          })
          const r = await fetch('/api/push/subscribe', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub, country: pushCountry, lang: language }),
          })
          if (!r.ok) { alert('Se pudo suscribir el navegador pero falló al guardar en el servidor (status ' + r.status + ')'); return }
          setPushEnabled(true)
        } catch (err) {
          alert('No se pudo activar: ' + (err instanceof Error ? err.message : String(err)))
        }
      }
    } finally { setPushLoading(false) }
  }

  // Actualiza el país guardado sin tener que apagar/prender el toggle —
  // reusa la misma suscripción ya activa, el endpoint hace upsert por endpoint
  const savePushCountry = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSavingPushCountry(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, country: pushCountry, lang: language }),
      }).catch(() => {})
    } finally { setSavingPushCountry(false) }
  }

  // Si cambia el idioma de la página con las notificaciones ya activadas,
  // re-guarda la suscripción con el idioma nuevo — si no, quedaría pegada
  // para siempre al idioma que tenía en el momento de activarlas
  useEffect(() => {
    if (!pushEnabled) return
    savePushCountry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  // Guarda el país apenas se cierra el menú de tres puntos (tocando afuera,
  // volviendo a tocar el botón, etc.) — no conviene depender solo del blur
  // del input, porque al cerrarse el menú el campo desaparece del DOM y ese
  // evento no siempre llega a tiempo de disparar el guardado.
  const wasLangOpenRef = useRef(false)
  useEffect(() => {
    if (wasLangOpenRef.current && !langOpen && pushEnabled) savePushCountry()
    wasLangOpenRef.current = langOpen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langOpen])

  const [artists, setArtists]     = useState<Artist[]>([])
  const [ads, setAds]             = useState<Ad[]>([])
  const [allStyles, setAllStyles] = useState<string[]>(DEFAULT_STYLES)
  const [country, setCountry]     = useState(() => { try { return sessionStorage.getItem('s_country') || '' } catch { return '' } })
  const [city, setCity]           = useState(() => { try { return sessionStorage.getItem('s_city')    || '' } catch { return '' } })
  const [activeStyles, setStyles] = useState<string[]>(() => { try { return JSON.parse(sessionStorage.getItem('s_styles') || '[]') } catch { return [] } })
  const [stylesOpen, setStylesOpen] = useState(false)
  const router = useRouter()
  const stylesRef = useRef<HTMLDivElement>(null)
  const deepLinkHandled = useRef(false)
  const [selected, setSelected]   = useState<Artist | null>(null)
  const [selectedHasAvail, setSelectedHasAvail] = useState(false)
  const [selectedAvailSlots, setSelectedAvailSlots] = useState<{date:string;times:string[]}[]>([])
  const [availPopOpen, setAvailPopOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [availViewMonth, setAvailViewMonth] = useState<{year:number;month:number}>(() => { const d = new Date(); return {year:d.getFullYear(),month:d.getMonth()} })
  const [availSelectedDay, setAvailSelectedDay] = useState<string|null>(null)
  const [availPhotoIdx, setAvailPhotoIdx] = useState(0)
  const [availArtistName, setAvailArtistName] = useState('')
  const [availArtistPhoto, setAvailArtistPhoto] = useState<string|null>(null)
  const [availArtistGallery, setAvailArtistGallery] = useState<(string|null)[]>([])
  const [availLoading, setAvailLoading] = useState(false)
  const [turnosOpen, setTurnosOpen] = useState(false)
  const [turnosSlots, setTurnosSlots] = useState<{date:string;times:string[]}[]>([])
  const [turnosViewMonth, setTurnosViewMonth] = useState<{year:number;month:number}>(() => { const d = new Date(); return {year:d.getFullYear(),month:d.getMonth()} })
  const [turnosSelectedDay, setTurnosSelectedDay] = useState<string|null>(null)
  const [turnosSaving, setTurnosSaving] = useState(false)
  const [turnosSaved, setTurnosSaved] = useState(false)
  const [turnosSaveError, setTurnosSaveError] = useState('')
  const [turnosCopied, setTurnosCopied] = useState(false)
  const [editing, setEditing]         = useState(false)
  const [editOpen, setEditOpen]       = useState(false)
  const [editKey, setEditKey]         = useState('')
  const [editKeyError, setEditKeyError] = useState('')
  const [editVerifying, setEditVerifying] = useState(false)
  const [editKeyVerified, setEditKeyVerified] = useState('')
  const [authAccessToken, setAuthAccessToken] = useState('')
  const [migrateMode, setMigrateMode] = useState(false)
  const migrateModeRef = useRef(false)
  migrateModeRef.current = migrateMode
  const editKeyVerifiedRef = useRef('')
  editKeyVerifiedRef.current = editKeyVerified
  const selectedRef = useRef<Artist | null>(null)
  selectedRef.current = selected
  const [migrateSent, setMigrateSent] = useState(false)
  const migrateSentRef = useRef(false)
  migrateSentRef.current = migrateSent
  const [migrateEmail, setMigrateEmail] = useState('')
  const [migratePassword, setMigratePassword] = useState('')
  const [migrateTyc, setMigrateTyc] = useState(false)
  const [migrateError, setMigrateError] = useState('')
  const [migrateDoc, setMigrateDoc] = useState<'terms' | 'privacy' | null>(null)
  const migrateDocRef = useRef<'terms' | 'privacy' | null>(null)
  migrateDocRef.current = migrateDoc
  const [migrateLoading, setMigrateLoading] = useState(false)

  useEffect(() => {
    if (migrateDoc) {
      history.pushState({ doc: migrateDoc }, '')
      const handler = () => setMigrateDoc(null)
      window.addEventListener('popstate', handler)
      return () => window.removeEventListener('popstate', handler)
    }
  }, [migrateDoc])
  const [liked, setLiked]             = useState(false)
  const [localLikes, setLocalLikes]   = useState(0)
  const [copied, setCopied]           = useState(false)
  const [emailCopied, setEmailCopied] = useState(false)
  const [stylesExpanded, setStylesExpanded] = useState(false)
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

  // Flashbook preview en perfil
  const [flashPreview, setFlashPreview] = useState<{ count: number; photos: string[]; whatsapp: string | null } | null>(null)
  const shuffledContentCards = useMemo(
    () => [...contentCards].filter(c => c.active).sort(() => Math.random() - 0.5),
    [contentCards]
  )
  const [showCount, setShowCount]           = useState(false)
  const [galleryEnabled, setGalleryEnabled] = useState(false)
  const [eventsCountryFilter, setEventsCountryFilter] = useState(false)
  const [showInsumos, setShowInsumos] = useState(true)
  const [insumoOpen, setInsumoOpen] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authInviteToken, setAuthInviteToken] = useState<string | undefined>(undefined)
  const [studioAuth, setStudioAuth] = useState<{ slug: string; auth_email: string | null; access_token: string } | null>(null)
  const [showContactInfo, setShowContactInfo] = useState(true)
  const [showClickCounters, setShowClickCounters] = useState(false)
  const [loggedArtist, setLoggedArtist] = useState<{ id: string; name: string; photo_url: string | null; slug: string; city: string | null; country: string | null; access_token: string; refresh_token?: string; flashbook_alias: string | null; status?: string } | null>(null)
  const [artistMenuOpen, setArtistMenuOpen] = useState(false)
  const [showSearchWizard, setShowSearchWizard] = useState(false)
  const [searchWizardSeen, setSearchWizardSeen] = useState(() => {
    try { return !!localStorage.getItem(SEARCH_WIZARD_SEEN_KEY) } catch { return false }
  })
  const [communityOpen, setCommunityOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('comunidad') === '1'
  })
  const highlightPostId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('post') ?? undefined
    : undefined

  // Registra el service worker apenas carga (hace falta antes de poder
  // suscribirse a push) y revisa si ya había una suscripción activa — si la
  // hay, trae el país real guardado (no lo que haya quedado en el buscador).
  // También se vuelve a chequear cada vez que se abre comunidad (puede
  // abrirse de entrada con ?comunidad=1) — si el chat se abre muy rápido,
  // antes de que esto termine la primera vez, el país quedaba pegado al
  // valor viejo hasta recargar la página entera.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.register('/sw.js')
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        setPushEnabled(!!sub)
        if (sub) {
          fetch('/api/push/subscribe?endpoint=' + encodeURIComponent(sub.endpoint))
            .then(r => r.json())
            .then(d => { if (d?.country) setPushCountry(d.country) })
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [communityOpen])
  const communitySwipeRef = useRef<{ startX: number; startY: number } | null>(null)
  const [loggedStudio, setLoggedStudio] = useState<{ slug: string; name: string; logo_url: string | null; visible: boolean; expires_at?: string | null; access_token: string; refresh_token?: string; city?: string | null; country?: string | null } | null>(null)
  const [studioMenuOpen, setStudioMenuOpen] = useState(false)
  const studioMenuRef = useRef<HTMLDivElement>(null)
  const [loggedSponsor, setLoggedSponsor] = useState<{ slug: string; name: string; logo_url: string | null; active: boolean; expires_at?: string | null; access_token: string; refresh_token?: string } | null>(null)
  const [sponsorMenuOpen, setSponsorMenuOpen] = useState(false)
  const sponsorMenuRef = useRef<HTMLDivElement>(null)
  const sponsorDeepLinkHandled = useRef(false)
  const [sponsorSubscriptionOpen, setSponsorSubscriptionOpen] = useState(false)
  const [studioSubscriptionOpen, setStudioSubscriptionOpen] = useState(false)
  const [sponsorOffersOpen, setSponsorOffersOpen] = useState(false)
  const [showFlashDayModal, setShowFlashDayModal] = useState(false)
  const [fdFile, setFdFile] = useState<File | null>(null)
  const [fdPreview, setFdPreview] = useState<string | null>(null)
  const [fdDate, setFdDate] = useState('')
  const [addingFd, setAddingFd] = useState(false)
  const [fdError, setFdError] = useState('')
  const [studioFlashDays, setStudioFlashDays] = useState<{ id: string; flyer_url: string; date: string }[]>([])
  const [showHiringModal, setShowHiringModal] = useState(false)
  const [hiringActive, setHiringActive] = useState(false)
  const [hiringRole, setHiringRole] = useState<'guest artist' | 'residente'>('guest artist')
  const [savingHiring, setSavingHiring] = useState(false)
  const [flashLinkCopied, setFlashLinkCopied] = useState(false)
  const artistMenuRef = useRef<HTMLDivElement>(null)
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [phrase, setPhrase] = useState<Phrase | null>(null)
  const [phraseOpen, setPhraseOpen] = useState(false)
  const phraseOpenRef = useRef(false)
  const [phraseComments, setPhraseComments] = useState<PhraseComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmoji, setGuestEmoji] = useState(() => {
    const emojis = ['😊','🖤','🔥','💉','🌹','⚡','🐉','💀','🌙','✨']
    return emojis[Math.floor(Math.random() * emojis.length)]
  })
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const GUEST_EMOJIS = ['😊','🖤','🔥','💉','🌹','⚡','🐉','💀','🌙','✨']
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [showRegistrationClosed, setShowRegistrationClosed] = useState(false)
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
  const editPanelRef = useRef<HTMLDivElement>(null)
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
    try {
      const saved = localStorage.getItem('flashttoo_artist_session')
      if (saved) {
        const session = JSON.parse(saved)
        setLoggedArtist(session)
        // Refresh fields from DB (incluye status — así si el admin ya lo aprobó,
        // se destraba la sesión abierta sin que tenga que volver a loguearse)
        void supabase.from('artists').select('flashbook_alias, city, country, status').eq('id', session.id).single()
          .then(({ data }) => {
            if (!data) return
            if (data.flashbook_alias !== session.flashbook_alias || data.city !== session.city || data.country !== session.country || data.status !== session.status) {
              const updated = { ...session, flashbook_alias: data.flashbook_alias ?? null, city: data.city ?? null, country: data.country ?? null, status: data.status ?? undefined }
              setLoggedArtist(updated)
              try { localStorage.setItem('flashttoo_artist_session', JSON.stringify(updated)) } catch {}
            }
          })
      }
    } catch {}
    try {
      const savedStudio = localStorage.getItem('flashttoo_studio_session')
      if (savedStudio) {
        const s = JSON.parse(savedStudio)
        setLoggedStudio(s)
        // Cargar ciudad/país, visibilidad y vencimiento del estudio (con reintento si el token venció)
        fetchWithAuthRefresh(`/api/studios/${s.slug}`, s.access_token, s.refresh_token).then(({ data, access_token, refresh_token }) => {
          const studio = data?.studio as { city?: string; country?: string; visible?: boolean; expires_at?: string | null } | undefined
          if (studio) {
            const updated = { ...s, city: studio.city, country: studio.country, visible: studio.visible, expires_at: studio.expires_at ?? null, access_token, refresh_token }
            setLoggedStudio(updated)
            try { localStorage.setItem('flashttoo_studio_session', JSON.stringify(updated)) } catch {}
          }
        }).catch(() => {})
      }
    } catch {}
    try {
      const savedSponsor = localStorage.getItem('flashttoo_sponsor_session')
      if (savedSponsor) {
        const s = JSON.parse(savedSponsor)
        setLoggedSponsor(s)
        // Refrescar datos del sponsor (logo, estado, vencimiento) contra el servidor, con reintento si el token venció
        fetchWithAuthRefresh(`/api/sponsors-v2/${s.slug}`, s.access_token, s.refresh_token).then(({ data, access_token, refresh_token }) => {
          const sponsor = data?.sponsor as { name?: string; logo_url?: string | null; active?: boolean; expires_at?: string | null } | undefined
          if (sponsor) {
            const updated = { ...s, name: sponsor.name, logo_url: sponsor.logo_url, active: sponsor.active, expires_at: sponsor.expires_at, access_token, refresh_token }
            setLoggedSponsor(updated)
            try { localStorage.setItem('flashttoo_sponsor_session', JSON.stringify(updated)) } catch {}
          }
        }).catch(() => {})
      }
    } catch {}
  }, [])

  // El toque de afuera que cierra el menú de los tres puntos (notificaciones,
  // idioma, etc.) no debería "atravesar" y disparar también lo que esté
  // debajo (ej. abrir el perfil de un tatuador) — ese primer toque solo
  // cierra el menú, hace falta un segundo toque para lo de abajo.
  const suppressNextClickRef = useRef(false)
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        if (langOpen) suppressNextClickRef.current = true
        setLangOpen(false); setMenuLangOpen(false)
      }
      if (stylesRef.current && !stylesRef.current.contains(e.target as Node)) setStylesOpen(false)
      if (artistMenuRef.current && !artistMenuRef.current.contains(e.target as Node)) setArtistMenuOpen(false)
      if (studioMenuRef.current && !studioMenuRef.current.contains(e.target as Node)) setStudioMenuOpen(false)
      if (sponsorMenuRef.current && !sponsorMenuRef.current.contains(e.target as Node)) setSponsorMenuOpen(false)
    }
    const onClickCapture = (e: MouseEvent) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false
        e.stopPropagation()
        e.preventDefault()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('click', onClickCapture, true)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('click', onClickCapture, true)
    }
  }, [langOpen])

  // Disponibilidad del artista seleccionado (solo cuando hay perfil abierto)
  useEffect(() => {
    if (!selected) { setSelectedHasAvail(false); setSelectedAvailSlots([]); return }
    setAvailLoading(true)
    fetch(`/api/flash/availability?artist_id=${selected.id}`)
      .then(r => r.json())
      .then(d => {
        const slots = Array.isArray(d.artist?.availability) ? d.artist.availability : []
        const today = new Date().toISOString().slice(0, 10)
        setSelectedAvailSlots(slots)
        setSelectedHasAvail(slots.some((s: {date:string}) => s.date >= today))
      })
      .catch(() => { setSelectedHasAvail(false); setSelectedAvailSlots([]) })
      .finally(() => setAvailLoading(false))
  }, [selected?.id])

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
    fetch('/api/features').then(r => r.json()).then(d => { if (d.artist_gallery === true) setGalleryEnabled(true); if (d.events_country_filter === true) setEventsCountryFilter(true); if (d.registration_open === false) setRegistrationOpen(false); if (d.show_insumos === false) setShowInsumos(false); if (d.show_contact_info === false) setShowContactInfo(false); if (d.maintenance_mode === true) setMaintenanceMode(true); if (d.show_click_counters === true) setShowClickCounters(true) }).catch(() => {})
    fetch('/api/secret-card').then(r => r.json()).then(d => {
      if (d.card) {
        setSecretCard(d.card)
        ;[d.card.image_url, d.card.back_image_url].forEach((src: string | undefined) => {
          if (src) { const img = new window.Image(); img.src = src }
        })
      }
    }).catch(() => {})
    supabase.from('artists').select('id', { count: 'exact', head: true }).eq('visible', true).then(({ count }) => { if (typeof count === 'number') setTotalActiveArtists(count) })
    fetch('/api/conventions').then(r => r.json()).then(d => { if (Array.isArray(d.conventions)) setConventions(d.conventions) }).catch(() => {})
    fetch('/api/flash-days').then(r => r.json()).then(d => { if (Array.isArray(d.flashDays)) setFlashDays(d.flashDays) }).catch(() => {})
    fetch('/api/studios').then(r => r.json()).then(d => { if (Array.isArray(d.studios)) setStudios(shuffle(d.studios)) }).catch(() => {})
    supabase.from('settings').select('value').eq('key', 'show_count').single().then(({ data }) => { if (data?.value === true) setShowCount(true) })
  }, [])

  useEffect(() => {
    fetch(`/api/content-cards?lang=${language}`).then(r => r.json()).then(d => { if (Array.isArray(d.cards)) setContentCards(d.cards) }).catch(() => {})
    const phraseDeepLink = new URLSearchParams(window.location.search).get('frase')
    fetch(`/api/phrases?lang=${language}`).then(r => r.json()).then(d => {
      const list = d.phrases ?? []
      setPhrases(list)
      if (phraseDeepLink) {
        history.replaceState({}, '', '/')
        history.pushState({}, '', '/')
        const target = list.find((p: Phrase) => p.id === phraseDeepLink)
        if (target) { openPhrase(target, 'external'); return }
        fetch(`/api/phrases/${phraseDeepLink}`).then(r => r.json()).then(d2 => {
          if (d2.phrase) openPhrase(d2.phrase, 'external')
        }).catch(() => {})
      } else {
        setPhrase(list[0] ?? null)
      }
    }).catch(() => {})
  }, [language])

  useEffect(() => {
    if (activeTag === null) return
    fetch(`/api/phrases?lang=${language}&tag=${encodeURIComponent(activeTag)}`).then(r => r.json()).then(d => {
      const list = d.phrases ?? []
      setPhrases(list)
      setPhrase(list[0] ?? null)
    }).catch(() => {})
  }, [activeTag, language])

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

  const openModal = useCallback((artist: Artist) => {
    setSelected(artist)
    const alreadyLiked = localStorage.getItem(`liked_${artist.id}`) === '1'
    setLiked(alreadyLiked)
    setLocalLikes((artist.likes ?? 0) + (alreadyLiked ? 1 : 0))
    setStylesExpanded(false)
    trackView(artist.id)
    const slug = artist.instagram ? artist.instagram.replace('@', '') : artist.id
    window.history.pushState({}, '', `/?artista=${slug}`)
    ;[artist.gallery_photo_1, artist.gallery_photo_2, artist.gallery_photo_3].forEach(src => {
      if (src) { const img = new window.Image(); img.src = src }
    })
  }, [])

  // Deep link: abre el panel de estudio si la URL tiene ?estudio=slug
  // Si viene de /completar-estudio, lee el auth del sessionStorage
  useEffect(() => {
    if (studioDeepLinkHandled.current) return
    const slug = new URLSearchParams(window.location.search).get('estudio')
    if (slug) {
      studioDeepLinkHandled.current = true
      const pending = sessionStorage.getItem('flashttoo_studio_auth')
      if (pending) {
        try {
          const auth = JSON.parse(pending)
          sessionStorage.removeItem('flashttoo_studio_auth')
          if (auth.slug === slug) {
            setStudioAuth({ slug: auth.slug, auth_email: auth.auth_email, access_token: auth.access_token })
            openStudio(slug, true)
            return
          }
        } catch { /* ignorar */ }
      }
      setSelectedStudioSlug(slug)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link: si viene de /completar-marca, abre la sesión de sponsor y su menú
  useEffect(() => {
    if (sponsorDeepLinkHandled.current) return
    const slug = new URLSearchParams(window.location.search).get('marca')
    if (!slug) return
    sponsorDeepLinkHandled.current = true
    const pending = sessionStorage.getItem('flashttoo_sponsor_auth')
    if (!pending) return
    try {
      const auth = JSON.parse(pending)
      sessionStorage.removeItem('flashttoo_sponsor_auth')
      if (auth.slug === slug) {
        const session = { slug: auth.slug, name: auth.name, logo_url: null, active: false, access_token: auth.access_token, refresh_token: auth.refresh_token }
        localStorage.setItem('flashttoo_sponsor_session', JSON.stringify(session))
        setLoggedSponsor(session)
        setSponsorMenuOpen(true)
      }
    } catch { /* ignorar */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link: link de invitación de tatuador — abre el registro directo con el token
  useEffect(() => {
    const invite = new URLSearchParams(window.location.search).get('invite')
    if (!invite) return
    setAuthInviteToken(invite)
    setShowAuthModal(true)
  }, [])

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
        ? supabase.from('artists').select('*').eq('id', id).maybeSingle()
        : supabase.from('artists').select('*').or(`instagram.ilike.${id},instagram.ilike.@${id}`).maybeSingle()
      query.then(({ data }) => { if (data) openModal(data as Artist) })
    }
  }, [artists, loading, openModal])

  // Evento disparado desde la galería para abrir un artista sin navegar
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (!id) return
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const artist = isUuid
        ? artists.find(a => a.id === id)
        : artists.find(a => a.instagram?.replace('@', '') === id)
      if (artist) {
        openModal(artist)
        window.dispatchEvent(new CustomEvent('artist-opened'))
      } else {
        const query = isUuid
          ? supabase.from('artists').select('*').eq('id', id).maybeSingle()
          : supabase.from('artists').select('*').or(`instagram.ilike.${id},instagram.ilike.@${id}`).maybeSingle()
        query.then(({ data }) => {
          if (data) openModal(data as Artist)
          window.dispatchEvent(new CustomEvent('artist-opened'))
        })
      }
    }
    window.addEventListener('open-artist', handler)
    return () => window.removeEventListener('open-artist', handler)
  }, [artists, openModal])

  // Cargar preview del Flashbook cuando se abre un perfil con alias
  useEffect(() => {
    setFlashPreview(null)
    if (!selected?.flashbook_alias) return
    fetch(`/api/flash/preview?artist_id=${selected.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.count > 0) setFlashPreview(d) })
      .catch(() => {})
  }, [selected?.id])

  useEffect(() => {
    if (!editOpen) return
    const el = editPanelRef.current
    if (!el) return
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }, [editOpen])

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
      setMigrateMode(true)
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

  const resetMigrate = () => { setMigrateMode(false); setMigrateSent(false); setMigrateEmail(''); setMigratePassword(''); setMigrateTyc(false); setMigrateError('') }

  const closeModal = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelected(null)
      setEditOpen(false)
      setEditKey('')
      setEditKeyError('')
      setMigrateMode(false); setMigrateSent(false); setMigrateEmail(''); setMigratePassword(''); setMigrateTyc(false); setMigrateError('')
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
    setMigrateMode(false); setMigrateSent(false); setMigrateEmail(''); setMigratePassword(''); setMigrateTyc(false); setMigrateError('')
    const studioSlug = selectedStudioSlugRef.current
    if (studioSlug) window.history.pushState({}, '', `/?estudio=${studioSlug}`)
    else window.history.pushState({}, '', '/')
  }, [])

  const openStudio = useCallback((slug: string, keepAuth = false) => {
    if (!keepAuth) setStudioAuth(null)
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
        if (phraseOpen) { setPhraseOpen(false); return }
        if (selectedAd) { setSelectedAd(null); return }
        if (selectedContent) { setSelectedContent(null); return }
        if (selected) { closeModalFull(); return }
        if (selectedStudioSlug) { closeStudio() }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [closeModalFull, closeStudio, selected, selectedContent, selectedAd, selectedStudioSlug])

  phraseOpenRef.current = phraseOpen

  // Boton atras nativo para cerrar el modal de frase
  useEffect(() => {
    if (!phraseOpen) return
    const h = () => { setPhraseOpen(false) }
    window.addEventListener('popstate', h)
    return () => {
      window.removeEventListener('popstate', h)
    }
  }, [phraseOpen])

  // Botón atrás del celular: cierra el modal sin tocar el historial (el browser ya lo hizo)
  useEffect(() => {
    const h = () => {
      if (fullscreenRef.current) return
      if (migrateDocRef.current) return
      if (phraseOpenRef.current) return
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

  const loadPhraseComments = useCallback(async (phraseId: string) => {
    setLoadingComments(true)
    try {
      const r = await fetch(`/api/phrases/${phraseId}/comments`)
      const d = await r.json()
      if (Array.isArray(d.comments)) setPhraseComments(d.comments)
    } finally {
      setLoadingComments(false)
    }
  }, [])

  const handleFdFlyer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setFdPreview(URL.createObjectURL(file))
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
      canvas.toBlob(blob => { if (blob) setFdFile(new File([blob], 'flyer.webp', { type: 'image/webp' })) }, 'image/webp', 0.88)
    }
    img.src = URL.createObjectURL(file)
  }

  const addFlashDay = async () => {
    if (!fdFile || !fdDate || !loggedStudio) return
    setAddingFd(true); setFdError('')
    try {
      const fd = new FormData()
      fd.append('file', fdFile)
      fd.append('path', `flash-day-${loggedStudio.slug}-${Date.now()}.webp`)
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!up.ok) throw new Error('Error al subir flyer')
      const { url } = await up.json()
      const r = await fetch(`/api/studios/${loggedStudio.slug}/flash-days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: loggedStudio.access_token, flyer_url: url, date: fdDate }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error')
      setFlashDays(prev => [...prev, { ...d.flashDay, studio_slug: loggedStudio.slug, studio_name: loggedStudio.name }].sort((a, b) => a.date.localeCompare(b.date)))
      setStudioFlashDays(prev => [...prev, d.flashDay].sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date)))
      setFdDate(''); setFdFile(null); setFdPreview(null)
    } catch (e: unknown) {
      setFdError(e instanceof Error ? e.message : 'Error')
    } finally { setAddingFd(false) }
  }

  const removeStudioFlashDay = async (id: string) => {
    if (!loggedStudio) return
    const r = await fetch(`/api/studios/${loggedStudio.slug}/flash-days`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: loggedStudio.access_token, id }),
    })
    if (r.ok) {
      setStudioFlashDays(prev => prev.filter(f => f.id !== id))
      setFlashDays(prev => prev.filter(f => f.id !== id))
    }
  }

  const openPhrase = useCallback((target?: Phrase, source: 'internal' | 'external' = 'internal') => {
    const p = target ?? phrase
    if (!p) return
    setPhrase(p)
    setPhraseOpen(true)
    setReplyingTo(null)
    setReplyText('')
    loadPhraseComments(p.id)
    history.pushState({ phraseOpen: true }, '', '/')
    fetch(`/api/phrases/${p.id}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source }) }).catch(() => {})
  }, [phrase, loadPhraseComments])

  // Evento disparado desde cultura para abrir un artículo
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (!id) return
      const target = phrases.find(p => p.id === id)
      if (target) { openPhrase(target); return }
      fetch(`/api/phrases/${id}`).then(r => r.json()).then(d => {
        if (d.phrase) openPhrase(d.phrase)
      }).catch(() => {})
    }
    window.addEventListener('open-phrase', handler)
    return () => window.removeEventListener('open-phrase', handler)
  }, [phrases, openPhrase])

  function getGuestCount(phraseId: string): number {
    try { return JSON.parse(localStorage.getItem('flashttoo_phrase_comments') || '{}')[phraseId] || 0 } catch { return 0 }
  }
  function incGuestCount(phraseId: string) {
    try {
      const d = JSON.parse(localStorage.getItem('flashttoo_phrase_comments') || '{}')
      d[phraseId] = (d[phraseId] || 0) + 1
      localStorage.setItem('flashttoo_phrase_comments', JSON.stringify(d))
    } catch {}
  }

  const submitComment = useCallback(async (parentId?: string) => {
    if (!phrase || submittingComment) return
    const text = parentId ? replyText.trim() : commentText.trim()
    if (!text) return
    const isIdentified = !!(loggedArtist || loggedStudio)
    if (!isIdentified && getGuestCount(phrase.id) >= 3) return
    if (!isIdentified && !guestName.trim()) return
    setSubmittingComment(true)
    setCommentError('')
    try {
      const body: Record<string, string> = { content: text }
      if (loggedArtist) body.access_token = loggedArtist.access_token
      else if (loggedStudio) body.access_token = loggedStudio.access_token
      else { body.guest_name = guestName.trim(); body.guest_emoji = guestEmoji }
      if (parentId) body.parent_id = parentId
      let r = await fetch(`/api/phrases/${phrase.id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (r.status === 401 && loggedArtist) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const updated = { ...loggedArtist, access_token: session.access_token }
          setLoggedArtist(updated)
          try { localStorage.setItem('flashttoo_artist_session', JSON.stringify(updated)) } catch {}
          body.access_token = session.access_token
          r = await fetch(`/api/phrases/${phrase.id}/comments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          })
        }
      }
      const d = await r.json()
      if (!r.ok) { setCommentError(d.error || 'Error al comentar'); return }
      if (d.comment) {
        setPhraseComments(prev => [d.comment, ...prev])
        if (parentId) { setReplyingTo(null); setReplyText('') }
        else {
          setCommentText('')
          if (!loggedArtist) incGuestCount(phrase.id)
          setPhrase(prev => prev ? {
            ...prev,
            recent_commenters: [{ id: d.comment.id, emoji: d.comment.guest_emoji, photo_url: d.comment.artist_photo_url }, ...prev.recent_commenters].slice(0, 3),
            comment_count: prev.comment_count + 1
          } : prev)
        }
      }
    } finally {
      setSubmittingComment(false)
    }
  }, [phrase, commentText, replyText, guestName, guestEmoji, loggedArtist, submittingComment])

  const hasFilters = country.trim() || city.trim() || activeStyles.length > 0

  if (maintenanceMode) return (
    <main style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 36, opacity: 0.9 }} />
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 1.7, maxWidth: 260 }}>
        La página no está disponible en este momento.<br />Probá más tarde.
      </p>
    </main>
  )

  return (
    <main
      style={{ background: '#000', minHeight: '100vh', paddingBottom: 40 }}
      onTouchStart={e => {
        if (communityOpen || fullscreenImg) return
        const t = e.touches[0]
        communitySwipeRef.current = { startX: t.clientX, startY: t.clientY }
      }}
      onTouchEnd={e => {
        if (!communitySwipeRef.current || communityOpen || fullscreenImg) return
        const t = e.changedTouches[0]
        const dx = communitySwipeRef.current.startX - t.clientX
        const dy = Math.abs(communitySwipeRef.current.startY - t.clientY)
        communitySwipeRef.current = null
        if (dx > 60 && dy < 60) setCommunityOpen(true)
      }}
    >

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="ft-topbar sticky top-0 z-30"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Logo + agregar + idioma */}
        <div className="max-w-7xl mx-auto px-5 pt-4 pb-3 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logoprincipal.svg" alt="Flashttoo" className="h-7 shrink-0" onClick={handleLogoTap} style={{ cursor: 'default' }} />
          <div className="flex items-center gap-2 shrink-0">
            {/* Studio session button */}
            {loggedStudio && (
              <div ref={studioMenuRef} className="relative">
                <button
                  onClick={() => setStudioMenuOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#efff42', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#000', flexShrink: 0 }}>
                    {loggedStudio.logo_url
                      /* eslint-disable-next-line @next/next/no-img-element */
                      ? <img src={loggedStudio.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : loggedStudio.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loggedStudio.name.split(' ')[0]}</span>
                </button>
                {studioMenuOpen && (
                  <div className="absolute right-0 mt-2 rounded-xl z-50"
                    style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.9)', minWidth: 200, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#efff42' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{loggedStudio.name}</p>
                      {!loggedStudio.visible && (
                        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>{t('phrases', 'studio_review_short', 'Perfil en revisión')}</p>
                      )}
                    </div>
                    {loggedStudio.expires_at && (
                      <button
                        onClick={() => { setStudioMenuOpen(false); setStudioSubscriptionOpen(true) }}
                        style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                        {t('sponsor_menu', 'subscription', 'Suscripción')}
                      </button>
                    )}
                    {/* Ver perfil */}
                    <button
                      onClick={() => { setStudioMenuOpen(false); openStudio(loggedStudio.slug) }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('estudio', 'view_profile', 'Ver perfil')}
                    </button>
                    {/* Convocatoria */}
                    <button
                      onClick={() => {
                        setStudioMenuOpen(false)
                        fetch(`/api/studios/${loggedStudio.slug}`).then(r => r.json()).then(d => {
                          setHiringActive(d.studio?.hiring ?? false)
                          setHiringRole(d.studio?.hiring_role === 'residente' ? 'residente' : 'guest artist')
                          setShowHiringModal(true)
                        }).catch(() => setShowHiringModal(true))
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('estudio', 'hiring_title', 'Convocatoria')}
                    </button>
                    {/* Flash day */}
                    <button
                      onClick={() => {
                        setStudioMenuOpen(false); setShowFlashDayModal(true)
                        fetch(`/api/studios/${loggedStudio.slug}/flash-days`).then(r => r.json()).then(d => setStudioFlashDays(d.flashDays ?? [])).catch(() => {})
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('estudio', 'publish_flash_day', 'Publicar Flash Day')}
                    </button>
                    {/* Editar perfil */}
                    <button
                      onClick={async () => {
                        setStudioMenuOpen(false)
                        let token = loggedStudio.access_token
                        if (loggedStudio.refresh_token) {
                          try {
                            const r = await fetch('/api/auth/refresh', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ refresh_token: loggedStudio.refresh_token }),
                            })
                            if (r.ok) {
                              const d = await r.json()
                              token = d.access_token
                              const updated = { ...loggedStudio, access_token: d.access_token, refresh_token: d.refresh_token }
                              setLoggedStudio(updated)
                              try { localStorage.setItem('flashttoo_studio_session', JSON.stringify(updated)) } catch {}
                            }
                          } catch {}
                        }
                        setStudioAuth({ slug: loggedStudio.slug, auth_email: null, access_token: token })
                        openStudio(loggedStudio.slug, true)
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('artist_menu', 'edit_profile', 'Editar perfil')}
                    </button>
                    <button
                      onClick={() => {
                        try { localStorage.removeItem('flashttoo_studio_session') } catch {}
                        setLoggedStudio(null)
                        setStudioMenuOpen(false)
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'rgba(255,100,100,0.7)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('artist_menu', 'logout', 'Cerrar sesión')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sponsor session button */}
            {loggedSponsor && (
              <div ref={sponsorMenuRef} className="relative">
                <button
                  onClick={() => setSponsorMenuOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: loggedSponsor.logo_url ? '#000' : '#efff42', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#000', flexShrink: 0 }}>
                    {loggedSponsor.logo_url
                      /* eslint-disable-next-line @next/next/no-img-element */
                      ? <img src={loggedSponsor.logo_url} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      : loggedSponsor.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loggedSponsor.name.split(' ')[0]}</span>
                </button>
                {sponsorMenuOpen && (
                  <div className="absolute right-0 mt-2 rounded-xl z-50"
                    style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.9)', minWidth: 200, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#efff42' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{loggedSponsor.name}</p>
                      {!loggedSponsor.active && (
                        loggedSponsor.expires_at && new Date(loggedSponsor.expires_at) < new Date() ? (
                          <p style={{ fontSize: 11, color: '#b91c1c', fontWeight: 700, marginTop: 2 }}>{t('phrases', 'sponsor_blocked_short', 'Perfil bloqueado — suscripción vencida')}</p>
                        ) : (
                          <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>{t('phrases', 'sponsor_review_short', 'Perfil en revisión')}</p>
                        )
                      )}
                    </div>
                    {loggedSponsor.expires_at && (
                      <button
                        onClick={() => { setSponsorMenuOpen(false); setSponsorSubscriptionOpen(true) }}
                        style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                        {t('sponsor_menu', 'subscription', 'Suscripción')}
                      </button>
                    )}
                    <button
                      onClick={() => { setSponsorMenuOpen(false); setSponsorOffersOpen(true) }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('sponsor_menu', 'offers', 'Pedido Flash')}
                    </button>
                    <button
                      onClick={() => {
                        try { localStorage.removeItem('flashttoo_sponsor_session') } catch {}
                        setLoggedSponsor(null)
                        setSponsorMenuOpen(false)
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'rgba(255,100,100,0.7)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('artist_menu', 'logout', 'Cerrar sesión')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Artist session avatar or Ingresar button */}
            {!loggedStudio && loggedArtist ? (
              <div ref={artistMenuRef} className="relative">
                <button
                  onClick={() => setArtistMenuOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                  {loggedArtist.photo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={loggedArtist.photo_url} alt={loggedArtist.name}
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#efff42', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#000', flexShrink: 0 }}>
                      {initialsOf(loggedArtist.name)}
                    </div>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loggedArtist.name.split(' ')[0]}</span>
                </button>
                {artistMenuOpen && loggedArtist.status === 'pending' ? (
                  <div className="absolute right-0 mt-2 rounded-xl z-50"
                    style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.9)', minWidth: 200, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#efff42' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{loggedArtist.name}</p>
                    </div>
                    <div style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {t('artist_menu', 'profile_pending', 'Perfil en revisión')}
                    </div>
                    <button
                      onClick={() => {
                        try { localStorage.removeItem('flashttoo_artist_session') } catch {}
                        setLoggedArtist(null)
                        setArtistMenuOpen(false)
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'rgba(255,100,100,0.7)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('artist_menu', 'logout', 'Cerrar sesión')}
                    </button>
                  </div>
                ) : artistMenuOpen && (
                  <div className="absolute right-0 mt-2 rounded-xl z-50"
                    style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.9)', minWidth: 200, overflow: 'hidden' }}>
                    {/* Name header */}
                    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#efff42' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{loggedArtist.name}</p>
                    </div>
                    {loggedArtist.flashbook_alias ? (
                      <a href={`/flash/${loggedArtist.flashbook_alias}`}
                        onClick={() => setArtistMenuOpen(false)}
                        style={{ display: 'block', padding: '12px 16px', textDecoration: 'none', color: '#efff42', fontSize: 13, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {t('artist_menu', 'view_flashbook', 'Ver mi Flashbook')}
                      </a>
                    ) : (
                      <div style={{ display: 'block', padding: '12px 16px', color: 'rgba(255,255,255,0.25)', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {t('artist_menu', 'view_flashbook', 'Ver mi Flashbook')}
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        setArtistMenuOpen(false)
                        let a = artists.find(x => x.id === loggedArtist.id)
                        if (!a) {
                          const { data } = await supabase.from('artists').select('*').eq('id', loggedArtist.id).single()
                          if (data) { a = data; setArtists(prev => [...prev, data]) }
                        }
                        if (a) setSelected(a)
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('artist_menu', 'view_profile', 'Ver mi perfil')}
                    </button>
                    <button
                      onClick={async () => {
                        if (!loggedArtist.flashbook_alias) return
                        const url = `${window.location.origin}/flash/${loggedArtist.flashbook_alias}`
                        await navigator.clipboard.writeText(url).catch(() => {})
                        setFlashLinkCopied(true)
                        setTimeout(() => setFlashLinkCopied(false), 2000)
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: !loggedArtist.flashbook_alias ? 'rgba(255,255,255,0.25)' : flashLinkCopied ? 'rgba(239,255,66,0.7)' : 'rgba(255,255,255,0.75)', fontSize: 13, cursor: loggedArtist.flashbook_alias ? 'pointer' : 'default', textAlign: 'left' }}>
                      {flashLinkCopied ? t('artist_menu', 'link_copied', '¡Link copiado!') : t('artist_menu', 'copy_link', 'Copiar link del Flashbook')}
                    </button>
                    <button
                      onClick={async () => {
                        setArtistMenuOpen(false)
                        let a = artists.find(x => x.id === loggedArtist.id)
                        if (!a) {
                          const { data } = await supabase.from('artists').select('*').eq('id', loggedArtist.id).single()
                          if (data) { a = data; setArtists(prev => [...prev, data]) }
                        }
                        if (a) {
                          setSelected(a)
                          setAuthAccessToken(loggedArtist.access_token)
                          setEditing(true)
                        }
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('artist_menu', 'edit_profile', 'Editar perfil')}
                    </button>
                    <a href="/flash/edit"
                      onClick={() => setArtistMenuOpen(false)}
                      style={{ display: 'block', padding: '12px 16px', textDecoration: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {t('artist_menu', 'edit_flashbook', 'Editar Flashbook')}
                    </a>
                    <button
                      onClick={() => {
                        setArtistMenuOpen(false)
                        setTurnosOpen(true)
                        setTurnosSelectedDay(null)
                        setTurnosViewMonth({year:new Date().getFullYear(),month:new Date().getMonth()})
                        if (loggedArtist) {
                          fetch(`/api/flash/availability?artist_id=${loggedArtist.id}`)
                            .then(r => r.json())
                            .then(d => { if (Array.isArray(d.artist?.availability)) setTurnosSlots(d.artist.availability) })
                            .catch(() => {})
                        }
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('artist_menu', 'turnos_libres', 'Turnos libres')}
                    </button>
                    <button
                      onClick={() => {
                        try { localStorage.removeItem('flashttoo_artist_session') } catch {}
                        setLoggedArtist(null)
                        setArtistMenuOpen(false)
                      }}
                      style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'rgba(255,100,100,0.7)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                      {t('artist_menu', 'logout', 'Cerrar sesión')}
                    </button>
                  </div>
                )}
              </div>
            ) : !loggedStudio && !loggedSponsor ? (
              <button
                onClick={() => { if (registrationOpen) { setShowAuthModal(true) } else { setShowRegistrationClosed(true) } }}
                className="text-xs font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: '#efff42', color: '#000' }}>
                {t('inicio', 'add_artist', 'Ingresar')}
              </button>
            ) : null}
            {/* Menú tres puntos */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => { setLangOpen(v => !v); setMenuLangOpen(false) }}
                className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
                style={{ width: 28, height: 36, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1 }}>
                ⋮
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-1 rounded-xl z-50"
                  style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.8)', minWidth: 180, overflow: 'hidden' }}>
                  {/* Idioma */}
                  {languages.length > 1 && (
                    <>
                      <button
                        onClick={() => setMenuLangOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:opacity-80"
                        style={{ color: 'rgba(255,255,255,0.8)' }}>
                        <span>{t('inicio', 'menu_language', 'Idioma')}</span>
                        <span style={{ fontSize: 9, opacity: 0.45 }}>{menuLangOpen ? '▲' : '▼'}</span>
                      </button>
                      {menuLangOpen && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          {languages.map(l => (
                            <button key={l.code}
                              onClick={() => { setLanguage(l.code); setLangOpen(false); setMenuLangOpen(false) }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left"
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
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    </>
                  )}
                  {/* Notificaciones — visibilidad controlada desde tintatxm (settings
                      push_notifications_visible), sin necesitar redeploy */}
                  {pushNotificationsVisible && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && (
                    <>
                      <button
                        onClick={togglePush}
                        disabled={pushLoading}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:opacity-80 disabled:opacity-50"
                        style={{ color: 'rgba(255,255,255,0.8)' }}>
                        <span>{t('inicio', 'menu_notifications', 'Notificaciones')}</span>
                        <span className="relative rounded-full transition-colors"
                          style={{ width: 32, height: 18, background: pushEnabled ? '#efff42' : 'rgba(255,255,255,0.15)', flexShrink: 0 }}>
                          <span className="absolute rounded-full bg-white transition-transform"
                            style={{ width: 14, height: 14, top: 2, left: pushEnabled ? 16 : 2 }} />
                        </span>
                      </button>
                      <div className="px-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2">
                          <input
                            value={pushCountry}
                            onChange={e => { setPushCountry(e.target.value); if (e.target.value.trim()) setPushCountryMissing(false) }}
                            onBlur={() => { if (pushEnabled) savePushCountry() }}
                            placeholder={t('inicio', 'push_country_placeholder', 'Tu país')}
                            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-xs"
                            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${pushCountryMissing ? 'rgba(255,100,100,0.5)' : 'rgba(255,255,255,0.12)'}`, color: '#fff', outline: 'none' }} />
                          {savingPushCountry && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>...</span>}
                        </div>
                        {pushCountryMissing ? (
                          <p style={{ fontSize: 10, color: 'rgba(255,120,120,0.75)', lineHeight: 1.5, marginTop: 6 }}>
                            {t('inicio', 'push_country_required', 'Escribí tu país antes de activar las notificaciones')}
                          </p>
                        ) : (
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, marginTop: 6 }}>
                            {t('inicio', 'push_country_note', 'Te avisamos cuando tatuadores de tu país publiquen algo nuevo.')}
                          </p>
                        )}
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, marginTop: 4 }}>
                          {isIOS
                            ? t('inicio', 'push_install_note_ios', 'En iPhone: tocá el ícono de Compartir (⬆️) y elegí "Agregar a pantalla de inicio".')
                            : t('inicio', 'push_install_note', 'En el celular, instalá la app para recibirlas.')}
                        </p>
                        {installPrompt && (
                          <button onClick={installApp}
                            style={{ marginTop: 6, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(239,255,66,0.35)', background: 'rgba(239,255,66,0.1)', color: '#efff42', cursor: 'pointer' }}>
                            {t('inicio', 'install_app_btn', 'Instalar app')}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  {/* Reportar */}
                  <button
                    onClick={() => { setShowReport(true); setLangOpen(false) }}
                    className="w-full flex items-center px-4 py-3 text-sm text-left hover:opacity-80"
                    style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {t('inicio', 'menu_report', 'Reportar')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Búsqueda + estilos apilados — solo aparece cuando ya hay una búsqueda activa (viene del asistente) */}
        {hasFilters && (
        <div className="max-w-7xl mx-auto px-5 pb-3 flex flex-col gap-2">

          {(country || city) && (
            <p style={{ fontSize: 13, color: '#38bdf8', lineHeight: 1.7, padding: '4px 2px', margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
              {[city, country].filter(Boolean).join(', ')}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            {/* Dropdown estilos */}
            <div ref={stylesRef} className="relative">
              <button onClick={() => setStylesOpen(v => !v)} className="flex items-center flex-wrap gap-1.5">
                {activeStyles.length > 0 ? activeStyles.map(s => (
                  <span key={s} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'transparent', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>
                    {s}
                  </span>
                )) : (
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'transparent', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>
                    {t('inicio', 'styles_placeholder', 'Estilos de tatuaje')}
                  </span>
                )}
                <span style={{ fontSize: 9, color: '#efff42' }}>{stylesOpen ? '▲' : '▼'}</span>
              </button>

              {stylesOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 rounded-xl overflow-y-auto"
                  style={{ width: 260, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', maxHeight: 300 }}>
                  <div className="grid grid-cols-2">
                    {allStyles.map(s => {
                      const on = activeStyles.includes(s)
                      return (
                        <button key={s} onClick={() => { toggleStyle(s); setStylesOpen(false) }}
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
                      {t('inicio', 'clear_style', 'quitar estilo')}
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
                setCountry(''); setCity(''); setStyles([])
              }}
                className="text-xs px-3 py-1 rounded-full transition-all"
                style={{ border: '1px solid rgba(255,80,80,0.25)', color: 'rgba(255,100,100,0.5)' }}>
                {t('inicio', 'clear_filters', 'limpiar todo')}
              </button>
            )}
          </div>
        </div>
        )}
      </header>

      {!loading && showCount && totalActiveArtists !== null && (
        <div className="max-w-7xl mx-auto px-5 pt-4 pb-1">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>
            {totalActiveArtists} {totalActiveArtists !== 1 ? t('inicio', 'count_plural', 'tatuadores') : t('inicio', 'count_singular', 'tatuador')}
          </p>
        </div>
      )}

      {/* Banner filtro por tag */}
      {activeTag && (
        <div style={{ padding: '8px 20px', background: 'rgba(239,255,66,0.07)', borderBottom: '1px solid rgba(239,255,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#efff42', fontWeight: 600 }}>#{activeTag}</span>
          <button onClick={() => { setActiveTag(null); fetch(`/api/phrases?lang=${language}`).then(r => r.json()).then(d => { const list = d.phrases ?? []; setPhrases(list); setPhrase(list[0] ?? null) }).catch(() => {}) }}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ quitar filtro</button>
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
              let phraseIdx = 0
              blocks.forEach((block, i) => {
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
                              <div className="absolute top-2 right-2">
                                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#000', background: '#efff42', padding: '2px 5px', borderRadius: 4 }}>{t('inicio', 'studio_badge', 'Estudio')}</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0">
                                <div style={{ padding: '4px 8px 4px' }}>
                                  <p className="text-white font-bold leading-tight" style={{ fontSize: 11, overflowWrap: 'break-word' }}>{item.data.name}</p>
                                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{item.data.city}</p>
                                </div>
                                {item.data.hiring && (
                                  <div style={{ background: '#efff42', padding: '1px 8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: 8, fontWeight: 600, color: '#000', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.data.hiring_role === 'residente' ? t('inicio', 'hiring_resident_badge', 'Se busca Residente') : t('inicio', 'hiring_guest_badge', 'Se busca Guest Artist')}</span>
                                  </div>
                                )}
                                {!item.data.hiring && <div style={{ height: 3, background: '#efff42', borderRadius: '0 0 12px 12px' }} />}
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
                            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#000', background: '#efff42', padding: '2px 5px', borderRadius: 4 }}>{t('inicio', 'studio_badge', 'Estudio')}</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0">
                            <div style={{ padding: '8px 12px 8px' }}>
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
                            {!s.hiring && <div style={{ height: 3, background: '#efff42', borderRadius: '0 0 12px 12px' }} />}
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
                            <span style={{ fontSize: 8, color: 'rgba(239,255,66,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('inicio', 'ad_badge', 'Publicidad')}</span>
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
                if ((i + 1) % CHUNK === 0) {
                  const currentPhrase = !isActiveSearch && phraseIdx < phrases.length ? phrases[phraseIdx] : null
                  if (currentPhrase) {
                    phraseIdx++
                    nodes.push(
                      <button key={`phrase-${currentPhrase.id}-${i}`}
                        onClick={() => openPhrase(currentPhrase)}
                        className="relative overflow-hidden"
                        style={{ gridColumn: '1 / span 2', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid #efff42', cursor: 'pointer', background: '#111' }}>
                        <div style={{ paddingBottom: '66.5%' }} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={currentPhrase.image_url} alt="Frase" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
                        <div className="absolute bottom-2 left-3 flex items-center" style={{ gap: 6 }}>
                          {currentPhrase.recent_commenters.length > 0 && (
                            <div style={{ display: 'flex' }}>
                              {currentPhrase.recent_commenters.slice(0, 3).map((c, ci) => (
                                <div key={c.id} style={{
                                  width: 22, height: 22, borderRadius: '50%',
                                  border: '2px solid rgba(0,0,0,0.7)',
                                  marginLeft: ci > 0 ? -7 : 0,
                                  background: '#222',
                                  overflow: 'hidden',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, flexShrink: 0,
                                  animation: 'phraseFloat 2.4s ease-in-out infinite',
                                  animationDelay: `${ci * 0.3}s`,
                                }}>
                                  {c.photo_url
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <span>{c.emoji || '💬'}</span>
                                  }
                                </div>
                              ))}
                            </div>
                          )}
                          {currentPhrase.comment_count > 3 && (
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600, letterSpacing: '0.02em' }}>
                              +{currentPhrase.comment_count - 3}
                            </span>
                          )}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            background: 'rgba(0,0,0,0.55)', borderRadius: 20,
                            padding: '3px 8px',
                          }}>
                            {[0, 0.22, 0.44].map((delay, di) => (
                              <span key={di} style={{
                                width: 4, height: 4, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.85)',
                                display: 'inline-block',
                                animation: 'typingDot 1.2s ease-in-out infinite',
                                animationDelay: `${delay}s`,
                              }} />
                            ))}
                          </div>
                        </div>
                      </button>
                    )
                  } else if (cardIdx < activeCards.length) {
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
          style={{ zIndex: 80, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', animation: 'fadeInYellow 0.22s ease' }}
          onClick={closeModal}>

          <div className="flex justify-center items-start min-h-full pb-64 sm:px-4 sm:pt-6">
          <div className="flex flex-col w-full sm:max-w-sm" style={{ gap: 10 }} onClick={e => e.stopPropagation()}>
          <div style={{ background: '#111', borderRadius: '0 0 20px 20px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
          <div className="relative w-full overflow-hidden">

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
                  {(stylesExpanded ? selected.styles : selected.styles.slice(0, 3)).map(s => (
                    <span key={s} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'transparent', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>
                      {s}
                    </span>
                  ))}
                  {!stylesExpanded && selected.styles.length > 3 && (
                    <button onClick={() => setStylesExpanded(true)}
                      style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                      +{selected.styles.length - 3}
                    </button>
                  )}
                </div>
              )}

              {selected.bio && (
                <BioText text={selected.bio} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }} />
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )
              })()}

              {/* Stats + Like */}
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <StatItem label={t('artista', 'stat_views', 'visitas')}   value={selected.profile_views ?? 0} />
                    {showClickCounters && <StatItem label="Instagram" value={selected.instagram_clicks ?? 0} />}
                    {showClickCounters && selected.whatsapp && <StatItem label="WhatsApp" value={selected.whatsapp_clicks ?? 0} />}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {selectedHasAvail && (
                      <button type="button" onClick={() => { setAvailPopOpen(v => { if (!v) { setAvailPhotoIdx(i => i + 1); setAvailArtistName(selected.name); setAvailArtistPhoto(selected.photo_url ?? null); setAvailArtistGallery([selected.gallery_photo_1??null,selected.gallery_photo_2??null,selected.gallery_photo_3??null]); const tod=new Date().toISOString().slice(0,10); const near=selectedAvailSlots.filter(s=>s.date>=tod).sort((a,b)=>a.date.localeCompare(b.date))[0]; if(near){const[y,m]=near.date.split('-').map(Number);setAvailSelectedDay(near.date);setAvailViewMonth({year:y,month:m-1})}else{setAvailSelectedDay(null);setAvailViewMonth({year:new Date().getFullYear(),month:new Date().getMonth()})} } return !v }) }}
                        style={{ fontSize: 11, fontWeight: 700, color: availPopOpen ? '#38bdf8' : '#000', background: availPopOpen ? 'rgba(56,189,248,0.12)' : '#38bdf8', border: 'none', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {t('turnos_libres', 'titulo', 'Turnos libres')}
                      </button>
                    )}
                    <button type="button" onClick={() => setContactOpen(v => !v)}
                      style={{ fontSize: 11, fontWeight: 700, color: contactOpen ? '#38bdf8' : '#000', background: contactOpen ? 'rgba(56,189,248,0.12)' : '#38bdf8', border: 'none', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {t('artista', 'contact_label', 'Contacto')}
                    </button>
                  </div>
                  <button onClick={toggleLike}
                    className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
                    style={{ background: liked ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${liked ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                    <span style={{ fontSize: 16, color: liked ? '#efff42' : 'rgba(255,255,255,0.3)', lineHeight: 1 }}>{liked ? '♥' : '♡'}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: liked ? '#efff42' : 'rgba(255,255,255,0.3)' }}>{fmt(localLikes)}</span>
                  </button>
                </div>
                {!selected.auth_email && (
                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={() => { if (migrateMode) { setEditOpen(v => !v) } else { setEditOpen(v => !v); setEditKey(''); setEditKeyError('') } }}
                      className="flex items-center justify-center px-3 py-1 rounded-full transition-all"
                      style={{ color: editOpen ? 'rgba(239,255,66,0.6)' : 'rgba(255,255,255,0.18)', fontSize: 20, letterSpacing: '-2px', lineHeight: 1 }}>
                      ···
                    </button>
                  </div>
                )}
              </div>


            </div>
          </div>

          {/* Flashbook preview */}
          {flashPreview && flashPreview.count > 0 && (
            <>
              <div style={{ height: 3, background: '#000' }} />
              <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Flashbook</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#efff42' }}>{flashPreview.count} flash tattoo{flashPreview.count !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, padding: 2 }}>
                  {flashPreview.photos.slice(0, 3).map((url, i) => (
                    <div key={i} style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 8 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(4px)', transform: 'scale(1.05)', display: 'block' }} />
                    </div>
                  ))}
                </div>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 12px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#efff42', textAlign: 'center', lineHeight: 1.4 }}>
                    {flashPreview.count} {flashPreview.count !== 1 ? t('flashbook_preview', 'available_many', 'flash tattoos disponibles') : t('flashbook_preview', 'available_one', 'flash tattoo disponible')}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.4 }}>{t('flashbook_preview', 'ask_link', 'Pedile el link al artista para verlos')}</p>
                  {flashPreview.whatsapp && (
                    <a
                      href={`https://wa.me/${flashPreview.whatsapp}?text=${encodeURIComponent(t('flashbook_preview', 'wa_msg', 'Hola {name}! Vi tu perfil en Flashttoo y me gustaría ver tu Flashbook.').replace('{name}', selected?.name ?? ''))}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 11, fontWeight: 800, color: '#000', background: '#efff42', padding: '7px 16px', borderRadius: 20, textDecoration: 'none', display: 'inline-block' }}>
                      {t('flashbook_preview', 'ask_wa', 'Pedir por WhatsApp')}
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Próximas fechas */}
          {(() => {
            const today = new Date().toISOString().slice(0, 10)
            const upcoming = (selected.visits || []).filter(v => v.to >= today).sort((a, b) => a.from.localeCompare(b.from))
            if (!upcoming.length) return null
            return (
              <>
                <div style={{ height: 3, background: '#000' }} />
                <div style={{ padding: 16 }}>
                  <p style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 10 }}>{t('artista', 'upcoming_dates', 'Próximas fechas')}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {upcoming.map((v, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: 22, fontWeight: 800, color: '#efff42', lineHeight: 1, display: 'block' }}>
                                {new Date(v.from + 'T12:00:00').getDate()}
                              </span>
                              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(239,255,66,0.5)', letterSpacing: '0.06em', display: 'block', marginTop: 2 }}>
                                {new Date(v.from + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short' })}
                              </span>
                            </div>
                            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>hasta</span>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: 22, fontWeight: 800, color: '#efff42', lineHeight: 1, display: 'block' }}>
                                {new Date(v.to + 'T12:00:00').getDate()}
                              </span>
                              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(239,255,66,0.5)', letterSpacing: '0.06em', display: 'block', marginTop: 2 }}>
                                {new Date(v.to + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{v.city}</p>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(239,255,66,0.72)', marginTop: 3 }}>{v.country}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          })()}

          {/* Contacto */}
          </div>{/* end unified card */}

          {/* Panel edición — justo debajo del perfil */}
          {editOpen && !selected.auth_email && (
            <div ref={editPanelRef} style={{ background: '#efff42', borderRadius: 20, padding: '20px 20px 24px', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>

              {/* Paso 1: ingresar clave */}
              {!migrateMode && (
                <>
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
                </>
              )}

              {/* Paso 2: form de migración (clave correcta) */}
              {migrateMode && !migrateSent && !migrateDoc && (
                <>
                  <p style={{ color: '#000', fontWeight: 800, fontSize: 12, marginBottom: 4 }}>{t('artista', 'migrate_title', 'Tu perfil está desactualizado')}</p>
                  <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                    {t('artista', 'migrate_desc', 'En agosto de 2026 modificamos el ingreso a editar, para mejor manejo y seguridad de la plataforma. El acceso ahora es con mail y contraseña. Para no perder tu perfil ya armado, ingresá los datos abajo:')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="email"
                      placeholder={t('ingresar', 'email_placeholder', 'Tu email')}
                      value={migrateEmail}
                      onChange={e => { setMigrateEmail(e.target.value); setMigrateError('') }}
                      className="w-full py-2.5 px-3 outline-none rounded-xl"
                      style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.15)', color: '#000', fontSize: 13 }}
                    />
                    <input
                      type="password"
                      placeholder={t('ingresar', 'password_placeholder', 'Contraseña (mín. 8 caracteres)')}
                      value={migratePassword}
                      onChange={e => { setMigratePassword(e.target.value); setMigrateError('') }}
                      className="w-full py-2.5 px-3 outline-none rounded-xl"
                      style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.15)', color: '#000', fontSize: 13 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={migrateTyc} onChange={e => setMigrateTyc(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>
                        {t('ingresar', 'tyc_prefix', 'Al registrarme acepto los')}{' '}
                        <button type="button" onClick={() => setMigrateDoc('terms')} style={{ color: '#000', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit' }}>{t('ingresar', 'tyc_terms', 'Términos y condiciones')}</button>
                        {' '}{t('ingresar', 'tyc_and', 'y la')}{' '}
                        <button type="button" onClick={() => setMigrateDoc('privacy')} style={{ color: '#000', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit' }}>{t('ingresar', 'tyc_privacy', 'Política de privacidad')}</button>.
                      </span>
                    </label>
                    {migrateError && <p style={{ fontSize: 11, color: 'rgba(160,0,0,0.8)' }}>{migrateError}</p>}
                    <button
                      disabled={migrateLoading}
                      onClick={async () => {
                        if (!migrateTyc) { setMigrateError(t('ingresar', 'error_tyc', 'Tenés que aceptar los términos para continuar')); return }
                        if (!migrateEmail) { setMigrateError(t('ingresar', 'error_email_required', 'Ingresá tu email')); return }
                        if (migratePassword.length < 8) { setMigrateError(t('ingresar', 'error_password_short', 'La contraseña debe tener al menos 8 caracteres')); return }
                        setMigrateLoading(true); setMigrateError('')
                        const r = await fetch('/api/auth/migrate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: migrateEmail, password: migratePassword, artist_id: selected.id, edit_key: editKeyVerified }),
                        })
                        const d = await r.json()
                        setMigrateLoading(false)
                        if (!r.ok) { setMigrateError(d.error || 'Error al procesar'); return }
                        setMigrateSent(true)
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
                      style={{ background: '#000', color: '#efff42' }}>
                      {migrateLoading ? t('ingresar', 'sending', 'Enviando...') : t('artista', 'migrate_continue_btn', 'Continuar →')}
                    </button>
                  </div>
                </>
              )}

              {/* Paso 3: mail enviado */}
              {migrateSent && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#000', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{t('artista', 'migrate_sent_title', 'Revisá tu mail')}</p>
                  <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: 12, lineHeight: 1.6 }}>
                    {t('artista', 'migrate_sent_desc', 'Te enviamos un link a')} <strong>{migrateEmail}</strong>.<br />
                    {t('artista', 'migrate_sent_desc2', 'Hacé click en el link para activar tu nuevo acceso.')}
                  </p>
                  <p style={{ color: 'rgba(0,0,0,0.4)', fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
                    {t('ingresar', 'registered_spam', 'Revisá también la carpeta de spam.')}
                  </p>
                </div>
              )}

            </div>
          )}

          {/* Aviso perfil desactivado — cuando cerró el panel sin migrar */}
          {migrateMode && !editOpen && !migrateSent && (
            <div style={{ background: '#efff42', borderRadius: 16, padding: '16px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', marginTop: 4 }}>
              <p style={{ color: '#000', fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{t('artista', 'migrate_title', 'Tu perfil está desactualizado')}</p>
              <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                {t('artista', 'migrate_banner_desc', 'Para poder editar tu perfil, actualizá el acceso con mail y contraseña. No perdés nada de lo que tenés armado.')}
              </p>
              <button
                onClick={() => setEditOpen(true)}
                style={{ background: '#000', color: '#efff42', fontWeight: 700, fontSize: 12, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%' }}>
                {t('artista', 'migrate_complete_btn', 'Actualizar acceso →')}
              </button>
            </div>
          )}

          {/* Sección entrevista — tarjeta amarilla separada debajo de todo */}
          {(() => {
            const iv = (selected.interview ?? {}) as Record<string, string>
            const answered = INTERVIEW_QUESTIONS.filter(q => iv[q.key]?.trim())
            if (!answered.length) return null
            return (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, marginTop: 8, padding: '22px 20px 24px' }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(239,255,66,0.5)', textTransform: 'uppercase', marginBottom: 20 }}>
                  {t('artista', 'meet_artist', 'Conocé a')} {selected.name}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {answered.map(q => (
                    <div key={q.key} style={{ paddingLeft: 14, borderLeft: '2px solid rgba(239,255,66,0.2)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(239,255,66,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, lineHeight: 1.4 }}>
                        {t('historia', q.key, q.label)}
                      </p>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
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

      {/* ── TÉRMINOS / PRIVACIDAD FULLSCREEN (migración) ─────── */}
      {migrateDoc && (
        <div className="fixed inset-0 flex flex-col" style={{ background: '#000', zIndex: 200 }}>
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => setMigrateDoc(null)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
            <p className="text-sm font-bold text-white">
              {migrateDoc === 'terms' ? t('terminos', 'title', 'Términos y Condiciones') : t('privacidad', 'title', 'Política de privacidad')}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {migrateDoc === 'terms' ? t('terminos', 'content', '') : t('privacidad', 'content', '')}
          </div>
        </div>
      )}

      {/* ── AUTH MODAL ───────────────────────────────────────── */}
      {showAuthModal && (
        <ArtistAuthModal
          inviteToken={authInviteToken}
          onClose={() => { setShowAuthModal(false); setAuthInviteToken(undefined) }}
          onStudioLoggedIn={(studio, access_token, refresh_token) => {
            setShowAuthModal(false)
            setStudioAuth({ slug: studio.slug, auth_email: studio.auth_email, access_token })
            const ss = { slug: studio.slug, name: studio.name, logo_url: studio.logo_url ?? null, visible: studio.visible ?? false, expires_at: studio.expires_at ?? null, access_token, refresh_token: refresh_token ?? '' }
            try { localStorage.setItem('flashttoo_studio_session', JSON.stringify(ss)) } catch {}
            setLoggedStudio(ss)
            setStudioMenuOpen(true)
          }}
          onSponsorLoggedIn={(sponsor, access_token, refresh_token) => {
            setShowAuthModal(false)
            const ss = { slug: sponsor.slug, name: sponsor.name, logo_url: sponsor.logo_url ?? null, active: sponsor.active ?? false, expires_at: sponsor.expires_at ?? null, access_token, refresh_token: refresh_token ?? '' }
            try { localStorage.setItem('flashttoo_sponsor_session', JSON.stringify(ss)) } catch {}
            setLoggedSponsor(ss)
            setSponsorMenuOpen(true)
          }}
          onLoggedIn={async (artist) => {
            setShowAuthModal(false)
            let a = artists.find(x => x.id === artist.id)
            if (!a) {
              const { data } = await supabase.from('artists').select('*').eq('id', artist.id).single()
              if (data) { a = data; setArtists(prev => [...prev, data]) }
            }
            if (a) {
              const session = {
                id: a.id,
                name: a.name,
                photo_url: a.photo_url ?? null,
                slug: a.slug,
                city: a.city ?? null,
                country: a.country ?? null,
                access_token: artist.access_token ?? '',
                refresh_token: artist.refresh_token ?? '',
                flashbook_alias: a.flashbook_alias ?? null,
              }
              try { localStorage.setItem('flashttoo_artist_session', JSON.stringify(session)) } catch {}
              setLoggedArtist(session)
              setArtistMenuOpen(true)
            }
          }}
        />
      )}

      {sponsorOffersOpen && loggedSponsor && (
        <SponsorOffersModal
          accessToken={loggedSponsor.access_token}
          refreshToken={loggedSponsor.refresh_token}
          onTokenRefreshed={tokens => {
            setLoggedSponsor(prev => {
              if (!prev) return prev
              const updated = { ...prev, access_token: tokens.access_token, refresh_token: tokens.refresh_token }
              try { localStorage.setItem('flashttoo_sponsor_session', JSON.stringify(updated)) } catch {}
              return updated
            })
          }}
          onClose={() => setSponsorOffersOpen(false)}
        />
      )}

      {/* ── REGISTRO CERRADO ──────────────────────────────────── */}
      {showRegistrationClosed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowRegistrationClosed(false)}>
          <div className="max-w-xs w-full rounded-2xl p-6 text-center"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 28, marginBottom: 12 }}>✦</p>
            <p className="font-bold text-white text-base mb-2">{t('inicio', 'reg_closed_title', 'En este momento no estamos aceptando nuevos registros')}</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{t('inicio', 'reg_closed_msg', 'Intentá de nuevo más tarde o escribinos por Instagram.')}</p>
            <button onClick={() => setShowRegistrationClosed(false)}
              className="mt-5 text-xs font-bold px-5 py-2 rounded-lg"
              style={{ background: '#efff42', color: '#000' }}>
              {t('global', 'close', 'Cerrar')}
            </button>
          </div>
        </div>
      )}

{/* ── PANEL DE REPORTE ─────────────────────────────────── */}
      {showHiringModal && loggedStudio && (
        <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowHiringModal(false) }}>
          <div className="w-full rounded-t-2xl p-6 flex flex-col gap-4" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', maxWidth: 480, margin: '0 auto' }}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-base">{t('estudio', 'hiring_title', 'Convocatoria')}</span>
              <button onClick={() => setShowHiringModal(false)}
                style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, marginTop: -8 }}>{t('estudio', 'hiring_desc', 'Mostrá un cartel en el feed avisando que tu estudio busca guest artist o residente.')}</p>

            {/* Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setHiringActive(v => !v)}
                style={{ width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', background: hiringActive ? '#efff42' : 'rgba(255,255,255,0.12)', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: hiringActive ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: hiringActive ? '#000' : 'rgba(255,255,255,0.5)', transition: 'left 0.15s' }} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                {hiringActive ? t('estudio', 'hiring_active', 'Convocatoria activa') : t('estudio', 'hiring_enable', 'Activar convocatoria')}
              </span>
            </div>

            {/* Roles */}
            {hiringActive && (
              <div style={{ display: 'flex', gap: 8 }}>
                {(['guest artist', 'residente'] as const).map(role => (
                  <button key={role} onClick={() => setHiringRole(role)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${hiringRole === role ? '#efff42' : 'rgba(255,255,255,0.1)'}`, background: hiringRole === role ? 'rgba(239,255,66,0.1)' : 'transparent', color: hiringRole === role ? '#efff42' : 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    {role === 'guest artist' ? t('estudio', 'hiring_guest', 'Guest Artist') : t('estudio', 'hiring_resident', 'Residente')}
                  </button>
                ))}
              </div>
            )}

            <button onClick={async () => {
              setSavingHiring(true)
              await fetch(`/api/studios/${loggedStudio.slug}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: loggedStudio.access_token, hiring: hiringActive, hiring_role: hiringRole }),
              })
              setSavingHiring(false)
              setShowHiringModal(false)
            }} disabled={savingHiring}
              style={{ width: '100%', padding: '13px', borderRadius: 10, background: '#efff42', color: '#000', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: savingHiring ? 0.5 : 1 }}>
              {savingHiring ? t('estudio', 'saving', 'Guardando...') : t('estudio', 'save_btn', 'Guardar')}
            </button>
          </div>
        </div>
      )}

      {showFlashDayModal && loggedStudio && (
        <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowFlashDayModal(false); setFdFile(null); setFdPreview(null); setFdDate(''); setFdError('') } }}>
          <div className="w-full rounded-t-2xl p-6 flex flex-col gap-4" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', maxWidth: 480, margin: '0 auto' }}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-base">Flash Day</span>
              <button onClick={() => { setShowFlashDayModal(false); setFdFile(null); setFdPreview(null); setFdDate(''); setFdError('') }}
                style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, marginTop: -8 }}>{t('estudio', 'flash_days_desc', 'Subí el flyer y la fecha. Aparece en la sección de Eventos de Flashttoo.')}</p>

            {/* Flash days publicados */}
            {studioFlashDays.length > 0 && (
              <div className="flex flex-col gap-2">
                {studioFlashDays.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.flyer_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                    <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                      {new Date(f.date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <button onClick={() => removeStudioFlashDay(f.id)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>
                ))}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
              </div>
            )}

            {/* Formulario — solo si no hay flash days publicados */}
            {studioFlashDays.length === 0 && (
              <>
                <label style={{ cursor: 'pointer' }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFdFlyer} />
                  {fdPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fdPreview} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10 }} />
                  ) : (
                    <div style={{ width: '100%', height: 140, borderRadius: 10, border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                      {t('estudio', 'upload_flyer', '+ Subir flyer')}
                    </div>
                  )}
                </label>

                <input type="date" value={fdDate} onChange={e => setFdDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, outline: 'none' }} />

                {fdError && <p style={{ fontSize: 12, color: 'rgba(255,100,100,0.8)' }}>{fdError}</p>}

                <button onClick={addFlashDay} disabled={!fdFile || !fdDate || addingFd}
                  style={{ width: '100%', padding: '13px', borderRadius: 10, background: fdFile && fdDate ? '#efff42' : 'rgba(255,255,255,0.08)', color: fdFile && fdDate ? '#000' : 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 14, border: 'none', cursor: fdFile && fdDate ? 'pointer' : 'default' }}>
                  {addingFd ? t('estudio', 'publishing', 'Publicando...') : t('estudio', 'publish_flash_day', 'Publicar Flash Day')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowReport(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#111', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 540, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="font-bold text-white text-base">{t('inicio', 'report_title', 'Reportar')}</span>
              <button onClick={() => setShowReport(false)}
                className="flex items-center justify-center"
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>
                ×
              </button>
            </div>
            <div className="px-5 py-5 flex flex-col gap-5">
              <div>
                <p className="text-sm font-semibold text-white mb-1">{t('inicio', 'report_stolen_title', 'Foto robada')}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{t('inicio', 'report_stolen_desc', 'La imagen del perfil no pertenece a este tatuador o tiene derechos de autor.')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{t('inicio', 'report_fake_title', 'Perfil falso')}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{t('inicio', 'report_fake_desc', 'Este perfil suplanta la identidad de otro tatuador.')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{t('inicio', 'report_wrong_title', 'Información incorrecta')}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{t('inicio', 'report_wrong_desc', 'Los datos del perfil son falsos o erróneos.')}</p>
              </div>
            </div>
            <div className="px-5 pb-7 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)', lineHeight: 1.75 }}>
                {t('inicio', 'report_footer', 'Para reportar cualquiera de estos casos u otro que consideres necesario, escribinos a')}{' '}
                <a href="mailto:soporte.flashttoo@gmail.com" style={{ color: '#efff42', textDecoration: 'none' }}>soporte.flashttoo@gmail.com</a>.{' '}
                {t('inicio', 'report_footer2', 'Respondemos lo antes posible y tomamos acción inmediata.')}
              </p>
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
            .secret-back  { transform: rotateY(0deg); border-radius: 10px; }
            .secret-front { transform: rotateY(180deg); border-radius: 10px; }
            .secret-info-top { opacity: 0; animation: infoTop 0.7s ease forwards; animation-delay: 2.5s; }
            .secret-info-bot { opacity: 0; animation: infoBot 0.7s ease forwards; animation-delay: 2.5s; }
            @keyframes secretBgFade { from { background: transparent; } to { background: #000; } }
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
            <div style={{ perspective: 1200, width: '100%', animation: 'secretBgFade 0.7s ease forwards', animationDelay: '2.5s' }}>
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
                <span style={{ fontSize: 9, color: 'rgba(239,255,66,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t('inicio', 'ad_badge', 'Publicidad')}</span>
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
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{t('inicio', 'ad_edit_key', 'Clave de edición')}</p>
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
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#efff42', letterSpacing: '0.08em' }}>{t('inicio', 'ad_edit_title', 'EDITAR PUBLICIDAD')}</p>
                    {/* Métricas */}
                    <div className="flex gap-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <p style={{ fontSize: 22, fontWeight: 700, color: '#efff42', lineHeight: 1 }}>{selectedAd.clicks}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{t('inicio', 'ad_clicks_label', 'clicks')}</p>
                      </div>
                      {selectedAd.expires_at && (
                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: 16 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1, color: new Date(selectedAd.expires_at) < new Date() ? '#f87171' : 'rgba(255,255,255,0.55)' }}>
                            {new Date(selectedAd.expires_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{t('inicio', 'ad_expires_label', 'vence')}</p>
                        </div>
                      )}
                    </div>
                    {/* Foto */}
                    <div>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t('inicio', 'ad_photo_label', 'Foto')}</p>
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
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{t('inicio', 'ad_change_photo', 'cambiar foto')}</span>
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
                      { label: t('inicio', 'ad_field_title', 'Nombre / título'), key: 'title' },
                      { label: t('artista', 'city_label', 'Ciudad'), key: 'city' },
                      { label: t('artista', 'country_label', 'País'), key: 'country' },
                      { label: 'Instagram', key: 'instagram' },
                      { label: 'WhatsApp', key: 'whatsapp' },
                      { label: t('inicio', 'ad_field_website', 'Sitio web'), key: 'website' },
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
                      {savingAdEdit ? t('ingresar', 'sending', 'Enviando...') : t('inicio', 'save_btn', 'Guardar')}
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

      {availPopOpen && (() => {
        const MES_K = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
        const MES_F = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        const MN = MES_K.map((k, i) => t('meses', k, MES_F[i]))
        const DL = ['L','M','X','J','V','S','D']
        const { year, month } = availViewMonth
        const firstDay = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const todayAv = new Date(); todayAv.setHours(0,0,0,0)
        const cells: (number|null)[] = []
        for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null)
        for (let d = 1; d <= daysInMonth; d++) cells.push(d)
        const pad = (n:number) => String(n).padStart(2,'0')
        const selSlot = availSelectedDay ? selectedAvailSlots.find(s => s.date === availSelectedDay) : null
        const today = new Date().toISOString().slice(0,10)
        const hasFuture = selectedAvailSlots.some(s => s.date >= today)
        return (
          <div style={{ position:'fixed', inset:0, zIndex:120, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px' }}
            onClick={() => setAvailPopOpen(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ position:'relative', width:'100%', maxWidth:340, border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'20px 18px', boxShadow:'0 24px 60px rgba(0,0,0,0.9)', animation:'slideUpModal 0.38s cubic-bezier(0.22,0.61,0.36,1)', overflow:'hidden', background:'rgba(18,18,20,0.78)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)' }}>
              <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
              <div style={{ position:'relative' }}>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <p style={{ fontSize:15, fontWeight:800, color:'#f0f0ee', margin:0 }}>{t('turnos_libres', 'titulo', 'Turnos libres')}</p>
                  {availArtistName && <p style={{ fontSize:11, color:'#efff42', marginTop:2, fontWeight:600, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{availArtistName}</p>}
                </div>
                <button type="button" onClick={() => setAvailPopOpen(false)}
                  style={{ fontSize:18, color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>

              {availLoading && (
                <div style={{ display:'flex', justifyContent:'center', padding:'24px 0' }}>
                  <div style={{ width:20, height:20, border:'2px solid rgba(239,255,66,0.2)', borderTop:'2px solid #efff42', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}
              {!availLoading && !hasFuture && (
                <div style={{ textAlign:'center', padding:'20px 0 8px' }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.5)' }}>{t('turnos_libres', 'ocupados', 'El artista ya ocupó los turnos')}</p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:4 }}>{t('turnos_libres', 'consultar_fechas', 'Consultale directamente para nuevas fechas')}</p>
                </div>
              )}

              {/* Nav mes */}
              {hasFuture && <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <button type="button" onClick={() => setAvailViewMonth(v => { const d = new Date(v.year,v.month-1); return {year:d.getFullYear(),month:d.getMonth()} })}
                  style={{ background:'rgba(255,255,255,0.06)', border:'none', color:'rgba(255,255,255,0.5)', fontSize:16, cursor:'pointer', padding:'5px 10px', borderRadius:8, lineHeight:1 }}>‹</button>
                <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{MN[month]} {year}</span>
                <button type="button" onClick={() => setAvailViewMonth(v => { const d = new Date(v.year,v.month+1); return {year:d.getFullYear(),month:d.getMonth()} })}
                  style={{ background:'rgba(255,255,255,0.06)', border:'none', color:'rgba(255,255,255,0.5)', fontSize:16, cursor:'pointer', padding:'5px 10px', borderRadius:8, lineHeight:1 }}>›</button>
              </div>}

              {/* Días semana */}
              {hasFuture && <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:3 }}>
                {DL.map(d => <div key={d} style={{ textAlign:'center', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.2)', padding:'2px 0' }}>{d}</div>)}
              </div>}

              {/* Grilla */}
              {hasFuture && <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:12 }}>
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />
                  const dateStr = `${year}-${pad(month+1)}-${pad(day)}`
                  const isPast = new Date(year,month,day) < todayAv
                  const slot = selectedAvailSlots.find(s => s.date === dateStr)
                  const isAvail = !!slot
                  const isSel = availSelectedDay === dateStr
                  return (
                    <button key={i} type="button" disabled={isPast||!isAvail}
                      onClick={() => setAvailSelectedDay(isSel ? null : dateStr)}
                      style={{ aspectRatio:'1', borderRadius:7, fontSize:11, fontWeight:isAvail?800:400,
                        border: isSel ? '2px solid #efff42' : isAvail ? '1px solid rgba(239,255,66,0.4)' : 'none',
                        background: isAvail ? 'rgba(239,255,66,0.12)' : 'transparent',
                        color: isPast ? 'rgba(255,255,255,0.08)' : isAvail ? '#efff42' : 'rgba(255,60,60,0.6)',
                        cursor: isAvail&&!isPast ? 'pointer' : 'default' }}>
                      {day}
                    </button>
                  )
                })}
              </div>}

              {/* Horarios */}
              {hasFuture && selSlot && (
                <div style={{ padding:'10px 12px', background:'rgba(239,255,66,0.06)', border:'1px solid rgba(239,255,66,0.15)', borderRadius:10 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'rgba(239,255,66,0.7)', marginBottom:8 }}>{availSelectedDay!.split('-').reverse().slice(0,2).join('/')} — {t('turnos_libres', 'horarios_disponibles', 'Horarios disponibles')}</p>
                  {selSlot.times.length > 0
                    ? <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {selSlot.times.map(t => <span key={t} style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:7, background:'rgba(239,255,66,0.12)', border:'1px solid rgba(239,255,66,0.25)', color:'#efff42' }}>{t}</span>)}
                      </div>
                    : <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>Consultar horario</p>}
                </div>
              )}
              </div>{/* /zIndex wrapper */}
            </div>
          </div>
        )
      })()}

      {contactOpen && selected && (() => {
        const menuRow = { display:'flex', alignItems:'center', gap:14, padding:'13px 18px', cursor:'pointer', textDecoration:'none', width:'100%', background:'none', border:'none', textAlign:'left' as const }
        const menuIcon = { width:18, height:18, flexShrink:0, opacity:0.5 }
        const menuLabel = { fontSize:15, fontWeight:300, color:'rgba(255,255,255,0.85)', flex:1, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
        const menuArrow = { fontSize:12, color:'rgba(255,255,255,0.2)' }
        return (
          <div style={{ position:'fixed', inset:0, zIndex:120, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 12px' }}
            onClick={() => setContactOpen(false)}>
            <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
            <div onClick={e => e.stopPropagation()}
              style={{ width:'100%', maxWidth:360, borderRadius:20, boxShadow:'0 24px 60px rgba(0,0,0,0.9)', animation:'slideUpModal 0.38s cubic-bezier(0.22,0.61,0.36,1)', overflow:'hidden', background:'rgba(18,18,20,0.78)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.08)' }}>

              {/* Header */}
              <div style={{ padding:'16px 18px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.9)', margin:0, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{selected.name}</p>
                <button onClick={() => setContactOpen(false)}
                  style={{ fontSize:16, color:'rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>

              {/* Grupo contacto */}
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:14, margin:'0 10px', overflow:'hidden' }}>
                {selected.instagram && (
                  <a href={`https://instagram.com/${selected.instagram.replace('@','')}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={() => { trackClick(selected.id, 'instagram'); setContactOpen(false) }}
                    style={menuRow}>
                    <svg style={menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
                    <span style={menuLabel}>Instagram</span>
                  </a>
                )}
                {showContactInfo && selected.whatsapp && (
                  <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${selected.name}, te encontré en Flashttoo 👋`)}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={() => { trackClick(selected.id, 'whatsapp'); setContactOpen(false) }}
                    style={menuRow}>
                    <svg style={menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    <span style={menuLabel}>WhatsApp</span>
                  </a>
                )}
                {selected.email && (
                  <>
                    <button onClick={() => { navigator.clipboard.writeText(selected.email!); setEmailCopied(true); setTimeout(() => { setEmailCopied(false); setContactOpen(false) }, 2000) }}
                      style={menuRow}>
                      <svg style={menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
                      <span style={{ ...menuLabel, color: emailCopied ? 'rgba(239,255,66,0.9)' : 'rgba(255,255,255,0.85)' }}>{emailCopied ? '¡Mail copiado!' : 'Email'}</span>
                      {emailCopied && <span style={{ fontSize:13, color:'rgba(239,255,66,0.5)' }}>✓</span>}
                    </button>
                  </>
                )}
              </div>

              {/* Separador + Compartir */}
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:14, margin:'8px 10px 10px', overflow:'hidden' }}>
                <button onClick={() => { shareArtist(); setContactOpen(false) }} style={menuRow}>
                  <svg style={menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  <span style={{ ...menuLabel, color: copied ? 'rgba(239,255,66,0.9)' : 'rgba(255,255,255,0.85)' }}>{copied ? '¡Copiado!' : t('artista', 'share_profile', 'Compartir perfil')}</span>
                  {copied && <span style={{ fontSize:13, color:'rgba(239,255,66,0.5)' }}>✓</span>}
                </button>
              </div>

            </div>
          </div>
        )
      })()}

      {/* Modal suscripción del sponsor */}
      {sponsorSubscriptionOpen && loggedSponsor?.expires_at && (
        <div style={{ position:'fixed', inset:0, zIndex:120, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 12px' }}
          onClick={() => setSponsorSubscriptionOpen(false)}>
          <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div onClick={e => e.stopPropagation()}
            style={{ width:'100%', maxWidth:360, borderRadius:20, boxShadow:'0 24px 60px rgba(0,0,0,0.9)', animation:'slideUpModal 0.38s cubic-bezier(0.22,0.61,0.36,1)', overflow:'hidden', background:'rgba(18,18,20,0.78)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ padding:'16px 18px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.9)', margin:0, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{t('sponsor_menu', 'subscription', 'Suscripción')}</p>
              <button onClick={() => setSponsorSubscriptionOpen(false)}
                style={{ fontSize:16, color:'rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
            <div style={{ padding: '4px 18px 22px' }}>
              <p style={{ fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                {new Date(loggedSponsor.expires_at) < new Date()
                  ? t('sponsor_menu', 'subscription_expired', 'Su suscripción venció el')
                  : t('sponsor_menu', 'subscription_ends', 'Su suscripción se cancelará el')}{' '}
                <span style={{ fontWeight: 700, color: '#efff42' }}>
                  {new Date(loggedSponsor.expires_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal suscripción del estudio */}
      {studioSubscriptionOpen && loggedStudio?.expires_at && (
        <div style={{ position:'fixed', inset:0, zIndex:120, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 12px' }}
          onClick={() => setStudioSubscriptionOpen(false)}>
          <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div onClick={e => e.stopPropagation()}
            style={{ width:'100%', maxWidth:360, borderRadius:20, boxShadow:'0 24px 60px rgba(0,0,0,0.9)', animation:'slideUpModal 0.38s cubic-bezier(0.22,0.61,0.36,1)', overflow:'hidden', background:'rgba(18,18,20,0.78)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ padding:'16px 18px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.9)', margin:0, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{t('sponsor_menu', 'subscription', 'Suscripción')}</p>
              <button onClick={() => setStudioSubscriptionOpen(false)}
                style={{ fontSize:16, color:'rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
            <div style={{ padding: '4px 18px 22px' }}>
              <p style={{ fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                {new Date(loggedStudio.expires_at) < new Date()
                  ? t('sponsor_menu', 'subscription_expired', 'Su suscripción venció el')
                  : t('sponsor_menu', 'subscription_ends', 'Su suscripción se cancelará el')}{' '}
                <span style={{ fontWeight: 700, color: '#efff42' }}>
                  {new Date(loggedStudio.expires_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {turnosOpen && loggedArtist && (() => {
        const la = loggedArtist!
        const MES_K2 = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
        const MES_F2 = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        const MONTH_NAMES_T = MES_K2.map((k, i) => t('meses', k, MES_F2[i]))
        const DAY_LABELS_T = ['L','M','X','J','V','S','D']
        const TIMES_T = Array.from({length:24}, (_,i) => `${String(i).padStart(2,'0')}:00`)
        const { year, month } = turnosViewMonth
        const firstDay = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const todayT = new Date(); todayT.setHours(0,0,0,0)
        const cells: (number|null)[] = []
        for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null)
        for (let d = 1; d <= daysInMonth; d++) cells.push(d)
        const pad = (n:number) => String(n).padStart(2,'0')
        const selSlot = turnosSelectedDay ? turnosSlots.find(s => s.date === turnosSelectedDay) : null
        const selTimes = selSlot?.times ?? []
        const availCount = turnosSlots.filter(s => s.date >= new Date().toISOString().slice(0,10)).length

        function toggleDay(dateStr: string) {
          const has = turnosSlots.find(s => s.date === dateStr)
          if (has) { setTurnosSlots(prev => prev.filter(s => s.date !== dateStr)); if (turnosSelectedDay === dateStr) setTurnosSelectedDay(null) }
          else { setTurnosSlots(prev => [...prev, {date:dateStr, times:[]}]); setTurnosSelectedDay(dateStr) }
        }
        function toggleTime(t: string) {
          if (!turnosSelectedDay) return
          setTurnosSlots(prev => prev.map(s => s.date === turnosSelectedDay
            ? {...s, times: s.times.includes(t) ? s.times.filter(x => x !== t) : [...s.times, t].sort()}
            : s))
        }
        async function save() {
          setTurnosSaving(true); setTurnosSaveError('')
          try {
            let token = la.access_token
            let r = await fetch('/api/flash/availability', {
              method: 'PATCH',
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({access_token: token, artist_id: la.id, slots: turnosSlots}),
            })
            if (r.status === 401 && la.refresh_token) {
              // Esta app no usa la sesión del cliente supabase (el login es server-side
              // y el token vencido se refresca a mano vía /api/auth/refresh, mismo
              // patrón que ya usan community/studio/sponsor) — sin esto, el único
              // modo de recuperarse de un token vencido era cerrar sesión y volver a entrar.
              const ref = await fetch('/api/auth/refresh', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: la.refresh_token }),
              })
              if (ref.ok) {
                const tokens = await ref.json()
                token = tokens.access_token
                const updated = { ...la, access_token: tokens.access_token, refresh_token: tokens.refresh_token }
                setLoggedArtist(updated)
                try { localStorage.setItem('flashttoo_artist_session', JSON.stringify(updated)) } catch {}
                r = await fetch('/api/flash/availability', {
                  method: 'PATCH',
                  headers: {'Content-Type':'application/json'},
                  body: JSON.stringify({access_token: token, artist_id: la.id, slots: turnosSlots}),
                })
              }
            }
            if (!r.ok) { const d = await r.json().catch(()=>({})); setTurnosSaveError(d.error || `Error ${r.status}`) }
            else { const d = await r.json().catch(()=>({})); if (Array.isArray(d.availability)) setTurnosSlots(d.availability); setTurnosSaved(true); setTimeout(() => setTurnosSaved(false), 2500) }
          } catch { setTurnosSaveError('Error de conexión') }
          setTurnosSaving(false)
        }
        function copyLink() {
          const n = (la.name || '').toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '')
          const slug = la.flashbook_alias ?? `turnoslibresy${n}-${la.id}`
          navigator.clipboard.writeText(`${window.location.origin}/disponibilidad/${slug}`)
          setTurnosCopied(true); setTimeout(() => setTurnosCopied(false), 2000)
        }

        return (
          <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 16px'}}
            onClick={() => setTurnosOpen(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{width:'100%',maxWidth:400,background:'#111',border:'1px solid rgba(255,255,255,0.09)',borderRadius:20,padding:'0 0 32px',boxShadow:'0 24px 60px rgba(0,0,0,0.8)',animation:'slideUpModal 0.45s cubic-bezier(0.22,0.61,0.36,1)',maxHeight:'90dvh',overflowY:'auto'}}>

              {/* Handle */}
              <div style={{display:'flex',justifyContent:'center',padding:'12px 0 0'}}>
                <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.12)'}} />
              </div>

              {/* Header */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px 0'}}>
                <div>
                  <p style={{fontSize:17,fontWeight:800,color:'#f0f0ee',margin:0}}>{t('turnos_libres', 'titulo', 'Turnos libres')}</p>
                  {availCount > 0
                    ? <p style={{fontSize:11,color:'rgba(239,255,66,0.6)',marginTop:2}}>{availCount} {availCount===1?t('turnos_libres','dia_disponible','día disponible'):t('turnos_libres','dias_disponibles','días disponibles')}</p>
                    : <p style={{fontSize:11,color:'rgba(255,255,255,0.2)',marginTop:2}}>{t('turnos_libres','sin_dias','Sin días marcados')}</p>}
                </div>
                <button type="button" onClick={() => setTurnosOpen(false)}
                  style={{fontSize:20,color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.06)',border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,flexShrink:0}}>×</button>
              </div>

              <div style={{padding:'16px 20px 0'}}>
                <p style={{fontSize:11,color:'rgba(255,255,255,0.2)',marginBottom:18,lineHeight:1.5}}>Marcá los días en amarillo. Los días en rojo aparecen como ocupados.</p>

                {/* Nav mes */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <button type="button" onClick={() => setTurnosViewMonth(v => { const d = new Date(v.year,v.month-1); return {year:d.getFullYear(),month:d.getMonth()} })}
                    style={{background:'rgba(255,255,255,0.06)',border:'none',color:'rgba(255,255,255,0.5)',fontSize:18,cursor:'pointer',padding:'6px 12px',borderRadius:8,lineHeight:1}}>‹</button>
                  <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>{MONTH_NAMES_T[month]} {year}</span>
                  <button type="button" onClick={() => setTurnosViewMonth(v => { const d = new Date(v.year,v.month+1); return {year:d.getFullYear(),month:d.getMonth()} })}
                    style={{background:'rgba(255,255,255,0.06)',border:'none',color:'rgba(255,255,255,0.5)',fontSize:18,cursor:'pointer',padding:'6px 12px',borderRadius:8,lineHeight:1}}>›</button>
                </div>

                {/* Días semana */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:4}}>
                  {DAY_LABELS_T.map(d => <div key={d} style={{textAlign:'center',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.2)',letterSpacing:'0.08em',padding:'3px 0'}}>{d}</div>)}
                </div>

                {/* Grilla */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:16}}>
                  {cells.map((day, i) => {
                    if (!day) return <div key={i} />
                    const dateStr = `${year}-${pad(month+1)}-${pad(day)}`
                    const isPast = new Date(year,month,day) < todayT
                    const slot = turnosSlots.find(s => s.date === dateStr)
                    const isSelected = turnosSelectedDay === dateStr
                    const isAvail = !!slot
                    return (
                      <button key={i} type="button" disabled={isPast}
                        onClick={() => { setTurnosSelectedDay(isSelected ? null : dateStr); if (!isAvail) toggleDay(dateStr) }}
                        style={{aspectRatio:'1',borderRadius:9,fontSize:12,fontWeight:isAvail?800:400,
                          border: isSelected ? '2px solid #efff42' : isAvail ? '1px solid rgba(239,255,66,0.35)' : '1px solid rgba(255,255,255,0.06)',
                          background: isAvail ? 'rgba(239,255,66,0.13)' : 'rgba(255,30,30,0.08)',
                          color: isPast ? 'rgba(255,255,255,0.1)' : isAvail ? '#efff42' : 'rgba(255,255,255,0.28)',
                          cursor: isPast ? 'default' : 'pointer',
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1}}>
                        {day}
                        {slot && slot.times.length > 0 && <span style={{fontSize:7,color:'rgba(239,255,66,0.55)',lineHeight:1}}>·{slot.times.length}</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Editor horarios */}
                {turnosSelectedDay && turnosSlots.find(s => s.date === turnosSelectedDay) && (
                  <div style={{marginBottom:16,padding:'14px',background:'rgba(239,255,66,0.05)',border:'1px solid rgba(239,255,66,0.15)',borderRadius:12}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <p style={{fontSize:12,fontWeight:700,color:'rgba(239,255,66,0.8)'}}>
                        {turnosSelectedDay.split('-').reverse().slice(0,2).join('/')} — {t('turnos_libres','horarios','Horarios')}
                      </p>
                      <button type="button" onClick={() => toggleDay(turnosSelectedDay)}
                        style={{fontSize:10,color:'rgba(255,80,80,0.7)',background:'none',border:'1px solid rgba(255,80,80,0.25)',borderRadius:6,padding:'3px 9px',cursor:'pointer'}}>
                        {t('turnos_libres','quitar_dia','Quitar día')}
                      </button>
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                      {TIMES_T.map(hr => {
                        const on = selTimes.includes(hr)
                        return (
                          <button key={hr} type="button" onClick={() => toggleTime(hr)}
                            style={{fontSize:12,fontWeight:700,padding:'6px 11px',borderRadius:8,border:`1px solid ${on?'rgba(239,255,66,0.5)':'rgba(255,255,255,0.1)'}`,background:on?'rgba(239,255,66,0.15)':'rgba(255,255,255,0.04)',color:on?'#efff42':'rgba(255,255,255,0.35)',cursor:'pointer'}}>
                            {hr}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {turnosSaveError && <p style={{fontSize:11,color:'#f87171',marginBottom:8}}>{turnosSaveError}</p>}

                <div style={{display:'flex',gap:8}}>
                  <button type="button" onClick={copyLink}
                    style={{flex:1,padding:'11px',background:turnosCopied?'rgba(100,220,100,0.1)':'rgba(255,255,255,0.06)',border:`1px solid ${turnosCopied?'rgba(100,220,100,0.3)':'rgba(255,255,255,0.1)'}`,borderRadius:10,fontSize:12,fontWeight:700,color:turnosCopied?'rgba(100,220,100,0.8)':'rgba(255,255,255,0.5)',cursor:'pointer'}}>
                    {turnosCopied ? t('turnos_libres','copiado','✓ Copiado') : t('turnos_libres','copiar_link','Copiar link')}
                  </button>
                  <button type="button" onClick={save} disabled={turnosSaving}
                    style={{flex:2,padding:'11px',background:turnosSaved?'rgba(100,220,100,0.15)':'#efff42',border:'none',borderRadius:10,fontSize:13,fontWeight:800,color:turnosSaved?'rgba(100,220,100,0.9)':'#000',cursor:'pointer',opacity:turnosSaving?0.6:1}}>
                    {turnosSaving ? t('turnos_libres','guardando','Guardando…') : turnosSaved ? t('turnos_libres','guardado','✓ Guardado') : t('turnos_libres','guardar','Guardar')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {editing && selected && (
        <EditPanel
          artist={selected}
          prefilledKey={editKeyVerified}
          accessToken={authAccessToken}
          onClose={() => { setEditing(false); setEditKeyVerified(''); setAuthAccessToken('') }}
          onSaved={(updated) => {
            setSelected(updated)
            setArtists(prev => prev.map(a => a.id === updated.id ? updated : a))
            setEditing(false)
            setEditKeyVerified('')
            setAuthAccessToken('')
          }}
          onDeleted={() => {
            setEditing(false)
            setEditKeyVerified('')
            setAuthAccessToken('')
            setSelected(null)
            setArtists(prev => prev.filter(a => a.id !== selected.id))
          }}
        />
      )}

      {selectedStudioSlug && (
        <StudioPanel
          slug={selectedStudioSlug}
          onClose={() => { closeStudio(); setStudioAuth(null) }}
          onOpenArtist={(artist) => openModal(artist)}
          accessToken={studioAuth?.access_token}
          refreshToken={loggedStudio?.refresh_token ?? undefined}
          authEmail={studioAuth?.auth_email ?? undefined}
          showClickCounters={showClickCounters}
        />
      )}

      <CulturaVideoModal />

      {showSearchWizard && (
        <SearchWizardModal
          allStyles={allStyles}
          lang={language}
          onClose={() => { setShowSearchWizard(false); setSearchWizardSeen(true) }}
          onSearch={(c, ci, styles) => {
            setCountry(c); setCity(ci); setStyles(styles)
            setShowSearchWizard(false)
            window.dispatchEvent(new CustomEvent('close-search-overlays'))
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}

      {/* ConventionModal desactivado temporalmente */}
      <SponsorsBannerV2 city={city} country={country} conventions={conventions} flashDays={flashDays} onOpenStudio={openStudio} showEventsCountryFilter={eventsCountryFilter} showInsumos={showInsumos} onOverlayChange={setInsumoOpen} onOpenSearchWizard={() => setShowSearchWizard(true)} pulseSearchWizard={!searchWizardSeen} />

      {/* ── MODAL FRASE ─────────────────────────────────────────── */}
      {phraseOpen && phrase && !!phrase.tags?.length && (
        <div style={{ position: 'fixed', top: 0, left: 'max(0px, calc(50% - 40rem))', right: 'max(0px, calc(50% - 40rem))', zIndex: 85, background: 'rgba(10,10,10,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logoprincipal.svg" alt="Flashttoo" onClick={() => history.back()} style={{ height: 28, opacity: 0.9, flexShrink: 0, cursor: 'pointer' }} />
          <span style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#efff42', pointerEvents: 'none' }}>cultura</span>
          <div style={{ width: 32, height: 32, flexShrink: 0 }} />
        </div>
      )}

      {phraseOpen && phrase && (
        <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 80, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setPhraseOpen(false) } }}>
          <div className="flex justify-center items-start min-h-full pb-40" style={{ paddingTop: phrase.tags?.length ? 57 : 0 }} onClick={e => e.stopPropagation()}>
            <div className="w-full" style={{ maxWidth: 480 }}>

              {/* Imagen + Descripción superpuesta */}
              <div className="relative w-full" style={{ background: '#111' }}>
                <div style={{ paddingBottom: '66.5%', position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={phrase.image_url} alt="Frase" className="absolute inset-0 w-full h-full object-cover" />
                  <button onClick={() => { setPhraseOpen(false) }}
                    className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1, paddingRight: 1, zIndex: 2 }}>
                    ←
                  </button>
                  <button onClick={() => {
                    const url = `${window.location.origin}/articulo/${phrase.id}`
                    if (navigator.share) {
                      navigator.share({ url }).catch(() => {})
                    } else {
                      navigator.clipboard.writeText(url)
                    }
                  }}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(239,255,66,0.3)', zIndex: 2 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#efff42" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  </button>
                </div>
                {phrase.description && (
                  <div style={{
                    background: '#18181b',
                    padding: '18px 20px 20px',
                    marginTop: -20,
                    position: 'relative',
                    zIndex: 1,
                    borderTop: '2.5px solid #efff42',
                  }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginBottom: phrase.tags?.length ? 10 : 14 }}>
                      {formatPhraseDate(phrase.created_at)}
                      {phraseReadingTime(phrase.description) !== null && ` · ${phraseReadingTime(phrase.description)} min`}
                    </p>
                    {phrase.tags && phrase.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                        {phrase.tags.map(tag => (
                          <button key={tag} onClick={() => { setPhraseOpen(false); setActiveTag(tag) }}
                            style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 9px', background: 'rgba(239,255,66,0.1)', border: '1px solid rgba(239,255,66,0.25)', borderRadius: 20, color: '#efff42', cursor: 'pointer', textTransform: 'lowercase' }}>
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                    {renderPhraseContent(phrase.description)}
                  </div>
                )}
              </div>

              {/* Comentarios */}
              <div style={{ padding: '12px 0 0' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', padding: '0 16px 10px' }}>
                  {phraseComments.length > 0 ? `${phraseComments.length} ${phraseComments.length !== 1 ? t('phrases', 'comments_plural', 'comentarios') : t('phrases', 'comments_singular', 'comentario')}` : t('phrases', 'no_comments', 'Sin comentarios aún')}
                </p>
                {loadingComments ? (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '0 16px 12px' }}>{t('phrases', 'loading', 'cargando...')}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {phraseComments.filter(c => !c.parent_id).map(c => {
                      const replies = phraseComments.filter(r => r.parent_id === c.id)
                      return (
                        <div key={c.id}>
                          {/* comentario principal */}
                          <div style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            {c.artist_slug ? (
                              <a href={`/?artista=${c.artist_slug}`} style={{ width: 32, height: 32, borderRadius: '50%', background: '#222', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none' }}>
                                {c.artist_photo_url
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  ? <img src={c.artist_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : <span style={{ fontSize: 11, fontWeight: 800, color: '#000' }}>{c.artist_name?.slice(0,2).toUpperCase()}</span>}
                              </a>
                            ) : c.studio_slug ? (
                              <a href={`/?estudio=${c.studio_slug}`} style={{ width: 32, height: 32, borderRadius: '50%', background: '#efff42', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#000', textDecoration: 'none' }}>
                                {c.studio_logo_url
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  ? <img src={c.studio_logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : c.studio_name?.slice(0,2).toUpperCase()}
                              </a>
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#222', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                                <span>{c.guest_emoji || '😊'}</span>
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                                {c.artist_slug
                                  ? <a href={`/?artista=${c.artist_slug}`} style={{ color: '#efff42', textDecoration: 'none' }}>{c.artist_name}</a>
                                  : c.studio_slug
                                  ? <a href={`/?estudio=${c.studio_slug}`} style={{ color: '#efff42', textDecoration: 'none' }}>{c.studio_name}</a>
                                  : <span style={{ color: 'rgba(255,255,255,0.7)' }}>{c.guest_name}</span>}
                              </p>
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: 4 }}>{c.content}</p>
                              <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                                style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.05em' }}>
                                {replyingTo === c.id ? t('phrases', 'cancel', 'cancelar') : t('phrases', 'reply', 'responder')}
                              </button>
                            </div>
                          </div>
                          {/* respuestas */}
                          {replies.map(r => (
                            <div key={r.id} style={{ display: 'flex', gap: 10, padding: '8px 16px 8px 58px', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.025)' }}>
                              {r.artist_slug ? (
                                <a href={`/?artista=${r.artist_slug}`} style={{ width: 24, height: 24, borderRadius: '50%', background: '#222', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, textDecoration: 'none' }}>
                                  {r.artist_photo_url
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    ? <img src={r.artist_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <span style={{ fontSize: 9, fontWeight: 800, color: '#000' }}>{r.artist_name?.slice(0,2).toUpperCase()}</span>}
                                </a>
                              ) : r.studio_slug ? (
                                <a href={`/?estudio=${r.studio_slug}`} style={{ width: 24, height: 24, borderRadius: '50%', background: '#efff42', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#000', textDecoration: 'none' }}>
                                  {r.studio_logo_url
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    ? <img src={r.studio_logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : r.studio_name?.slice(0,2).toUpperCase()}
                                </a>
                              ) : (
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#222', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                  <span>{r.guest_emoji || '😊'}</span>
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                                  {r.artist_slug
                                    ? <a href={`/?artista=${r.artist_slug}`} style={{ color: '#efff42', textDecoration: 'none' }}>{r.artist_name}</a>
                                    : r.studio_slug
                                    ? <a href={`/?estudio=${r.studio_slug}`} style={{ color: '#efff42', textDecoration: 'none' }}>{r.studio_name}</a>
                                    : <span style={{ color: 'rgba(255,255,255,0.5)' }}>{r.guest_name}</span>}
                                </p>
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{r.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Formulario sticky */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a', position: 'sticky', bottom: 0 }}>
                {/* banner "respondiendo a" */}
                {replyingTo && (() => {
                  const parent = phraseComments.find(c => c.id === replyingTo)
                  const name = parent?.artist_name || parent?.guest_name || ''
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'rgba(255,230,0,0.08)', borderBottom: '1px solid rgba(255,230,0,0.15)' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,230,0,0.8)', letterSpacing: '0.03em' }}>↩ {t('phrases', 'replying_to', 'Respondiendo a')} <strong>{name}</strong></span>
                      <button onClick={() => { setReplyingTo(null); setReplyText('') }}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  )
                })()}
                <div style={{ padding: '12px 16px' }}>
                  {loggedStudio && !loggedStudio.visible ? (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{t('phrases', 'studio_review', 'Tu perfil está en revisión. Podrás comentar cuando esté activo.')}</p>
                  ) : !loggedArtist && !loggedStudio && getGuestCount(phrase.id) >= 3 ? (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{t('phrases', 'limit_reached', 'Alcanzaste el límite de comentarios')}</p>
                  ) : (
                    <>
                      {!loggedArtist && !loggedStudio && !replyingTo && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                            {GUEST_EMOJIS.map(e => (
                              <button key={e} onClick={() => setGuestEmoji(e)}
                                style={{ width: 32, height: 32, borderRadius: '50%', background: guestEmoji === e ? 'rgba(239,255,66,0.15)' : 'rgba(255,255,255,0.05)', border: guestEmoji === e ? '1px solid rgba(239,255,66,0.5)' : '1px solid transparent', fontSize: 16, cursor: 'pointer' }}>
                                {e}
                              </button>
                            ))}
                          </div>
                          <input
                            value={guestName}
                            onChange={e => setGuestName(e.target.value)}
                            placeholder={t('phrases', 'guest_name', 'Tu nombre')}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', marginBottom: 8 }}
                          />
                        </div>
                      )}
                      {!loggedArtist && !loggedStudio && replyingTo && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                            {GUEST_EMOJIS.map(e => (
                              <button key={e} onClick={() => setGuestEmoji(e)}
                                style={{ width: 30, height: 30, borderRadius: '50%', background: guestEmoji === e ? 'rgba(239,255,66,0.15)' : 'rgba(255,255,255,0.05)', border: guestEmoji === e ? '1px solid rgba(239,255,66,0.5)' : '1px solid transparent', fontSize: 15, cursor: 'pointer' }}>
                                {e}
                              </button>
                            ))}
                          </div>
                          <input
                            value={guestName}
                            onChange={e => setGuestName(e.target.value)}
                            placeholder={t('phrases', 'guest_name', 'Tu nombre')}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${guestName.trim() ? 'rgba(255,255,255,0.08)' : 'rgba(255,230,0,0.3)'}`, borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 12, outline: 'none' }}
                          />
                        </div>
                      )}
                      {loggedArtist && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#222', overflow: 'hidden', flexShrink: 0 }}>
                            {loggedArtist.photo_url
                              /* eslint-disable-next-line @next/next/no-img-element */
                              ? <img src={loggedArtist.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#000', background: '#efff42' }}>{initialsOf(loggedArtist.name)}</div>
                            }
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{loggedArtist.name.split(' ')[0]}</span>
                        </div>
                      )}
                      {loggedStudio && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#efff42', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#000' }}>
                            {loggedStudio.logo_url
                              /* eslint-disable-next-line @next/next/no-img-element */
                              ? <img src={loggedStudio.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : loggedStudio.name.slice(0,2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{loggedStudio.name.split(' ')[0]}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <textarea
                          value={replyingTo ? replyText : commentText}
                          onChange={e => replyingTo ? setReplyText(e.target.value) : (setCommentText(e.target.value), setCommentError(''))}
                          placeholder={!loggedArtist && !loggedStudio && !guestName.trim() ? t('phrases', 'name_first', 'Primero poné tu nombre') : (replyingTo ? t('phrases', 'reply_placeholder', 'Tu respuesta…') : t('phrases', 'comment_placeholder', 'Escribí un comentario...'))}
                          disabled={!!(!loggedArtist && !loggedStudio && !guestName.trim())}
                          rows={2}
                          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'none', opacity: (!loggedArtist && !loggedStudio && !guestName.trim()) ? 0.4 : 1 }}
                        />
                        <button
                          onClick={() => replyingTo ? submitComment(replyingTo) : submitComment()}
                          disabled={submittingComment || !(replyingTo ? replyText.trim() : commentText.trim())}
                          style={{ background: '#efff42', color: '#000', fontWeight: 700, fontSize: 12, padding: '0 14px', borderRadius: 8, border: 'none', cursor: 'pointer', opacity: (!(replyingTo ? replyText.trim() : commentText.trim()) || submittingComment) ? 0.4 : 1 }}>
                          {submittingComment ? '...' : '→'}
                        </button>
                      </div>
                      {commentError && <p style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>{commentError}</p>}
                    </>
                  )}
                </div>
              </div>

              {/* Siguiente artículo */}
              {(() => {
                const idx = phrases.findIndex(p => p.id === phrase.id)
                const next = phrases[(idx + 1) % phrases.length]
                if (!next || next.id === phrase.id) return null
                return (
                  <div style={{ padding: '18px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>{t('phrases', 'next', 'Siguiente')}</p>
                    <button onClick={() => openPhrase(next)} style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={next.image_url} alt="" style={{ width: 52, height: 52, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {next.description && (() => {
                          const titleLine = next.description.split('\n').find(l => l.startsWith('# '))
                          return titleLine
                            ? <p style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', lineHeight: 1.3, marginBottom: 2 }}>{titleLine.slice(2)}</p>
                            : null
                        })()}
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{formatPhraseDate(next.created_at)}</p>
                      </div>
                      <span style={{ color: '#efff42', fontSize: 16, flexShrink: 0 }}>→</span>
                    </button>
                  </div>
                )
              })()}

            </div>
          </div>
        </div>
      )}

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
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', cursor: fullscreenPhotos.length > 1 ? 'grab' : 'default' }}>

          <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          {/* Modal card */}
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 420, borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.08)', background: '#0a0a0a', animation: 'slideUpModal 0.85s cubic-bezier(0.16,1,0.3,1)' }}>

            {/* Tira horizontal con todas las fotos */}
            <div style={{ overflow: 'hidden', width: '100%' }}>
              <div style={{
                display: 'flex',
                width: `${fullscreenPhotos.length * 100}%`,
                transform: `translateX(calc(-${fullscreenIdx} * ${100 / fullscreenPhotos.length}% + ${fsDragX}px))`,
                transition: fsDragging ? 'none' : 'transform 0.28s ease',
                willChange: 'transform',
              }}>
                {fullscreenPhotos.map((src, i) => (
                  <div key={i} style={{ width: `${100 / fullscreenPhotos.length}%`, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0a0a' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" draggable={false} style={{ width: '100%', maxHeight: '72vh', display: 'block', objectFit: 'contain', userSelect: 'none' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Dots */}
            {fullscreenPhotos.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0', background: '#0a0a0a' }}>
                {fullscreenPhotos.map((_, i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', transition: 'background 0.2s', background: i === fullscreenIdx ? '#fff' : 'rgba(255,255,255,0.25)' }} />
                ))}
              </div>
            )}

            {/* Cerrar */}
            <button
              onClick={e => { e.stopPropagation(); history.back() }}
              style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── PANEL COMUNIDAD (swipe izquierda) ─────────────────────── */}
      {!communityOpen && !insumoOpen && !showReport && !selectedStudioSlug && (
        <button
          onClick={() => setCommunityOpen(true)}
          style={{ position: 'fixed', right: 0, top: '58%', transform: 'translateY(-50%)', zIndex: 65, background: 'rgba(239,255,66,0.22)', border: '1px solid rgba(239,255,66,0.35)', borderRight: 'none', borderRadius: '12px 0 0 12px', padding: '14px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#efff42" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}


      {communityOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 96, display: 'flex' }}
          onTouchStart={e => { communitySwipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY } }}
          onTouchEnd={e => {
            if (!communitySwipeRef.current) return
            const dx = e.changedTouches[0].clientX - communitySwipeRef.current.startX
            const dy = Math.abs(e.changedTouches[0].clientY - communitySwipeRef.current.startY)
            communitySwipeRef.current = null
            if (dx > 60 && dy < 60) setCommunityOpen(false)
          }}>
          <div style={{ flex: '0 0 12%', background: 'rgba(0,0,0,0.55)' }} onClick={() => setCommunityOpen(false)} />
          <div style={{ flex: 1, minWidth: 0, maxWidth: 500, height: '100%', background: '#0a0a0a', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.07)', animation: 'slideInRight 0.22s ease', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <CommunityPanel
                onClose={() => setCommunityOpen(false)}
                lang={language}
                highlightPostId={highlightPostId}
                anonCountry={pushEnabled ? pushCountry : undefined}
                loggedArtist={loggedArtist ? { id: loggedArtist.id, name: loggedArtist.name, photo_url: loggedArtist.photo_url, slug: loggedArtist.slug, city: loggedArtist.city ?? undefined, country: loggedArtist.country ?? undefined, flashbook_alias: loggedArtist.flashbook_alias, access_token: loggedArtist.access_token, refresh_token: loggedArtist.refresh_token, status: loggedArtist.status } : null}
                loggedStudio={loggedStudio ? { slug: loggedStudio.slug, name: loggedStudio.name, logo_url: loggedStudio.logo_url, visible: loggedStudio.visible, expires_at: loggedStudio.expires_at ?? null, access_token: loggedStudio.access_token, refresh_token: loggedStudio.refresh_token, city: loggedStudio.city ?? undefined, country: loggedStudio.country ?? undefined } : null}
                loggedSponsor={loggedSponsor}
                onArtistTokenRefreshed={tokens => {
                  setLoggedArtist(prev => {
                    if (!prev) return prev
                    const updated = { ...prev, access_token: tokens.access_token, refresh_token: tokens.refresh_token }
                    try { localStorage.setItem('flashttoo_artist_session', JSON.stringify(updated)) } catch {}
                    return updated
                  })
                }}
                onSponsorTokenRefreshed={tokens => {
                  setLoggedSponsor(prev => {
                    if (!prev) return prev
                    const updated = { ...prev, access_token: tokens.access_token, refresh_token: tokens.refresh_token }
                    try { localStorage.setItem('flashttoo_sponsor_session', JSON.stringify(updated)) } catch {}
                    return updated
                  })
                }}
                onStudioTokenRefreshed={tokens => {
                  setLoggedStudio(prev => {
                    if (!prev) return prev
                    const updated = { ...prev, access_token: tokens.access_token, refresh_token: tokens.refresh_token }
                    try { localStorage.setItem('flashttoo_studio_session', JSON.stringify(updated)) } catch {}
                    return updated
                  })
                }}
                onOpenArtist={id => {
                  setCommunityOpen(false)
                  const local = artists.find(x => x.id === id)
                  if (local) { openModal(local) }
                  else {
                    supabase.from('artists').select('*').eq('id', id).maybeSingle()
                      .then(({ data }) => { if (data) openModal(data as Artist) })
                  }
                }}
                onOpenStudio={slug => { setCommunityOpen(false); openStudio(slug) }}
                onOpenSponsor={slug => { setCommunityOpen(false); window.dispatchEvent(new CustomEvent('open-sponsor', { detail: slug })) }}
                onOpenAvailability={(artist_id, artist_name, artist_photo) => {
                  setAvailPopOpen(true)
                  setAvailPhotoIdx(0)
                  setAvailSelectedDay(null)
                  setAvailViewMonth({year:new Date().getFullYear(),month:new Date().getMonth()})
                  setAvailArtistName(artist_name)
                  setAvailArtistPhoto(artist_photo)
                  setAvailArtistGallery([])
                  setSelectedAvailSlots([])
                  setAvailLoading(true)
                  fetch(`/api/flash/availability?artist_id=${artist_id}`)
                    .then(r => r.json())
                    .then(d => {
                      const slots = Array.isArray(d.artist?.availability) ? d.artist.availability : []
                      setSelectedAvailSlots(slots)
                      const tod = new Date().toISOString().slice(0, 10)
                      const near = slots.filter((s:{date:string}) => s.date >= tod).sort((a:{date:string},b:{date:string}) => a.date.localeCompare(b.date))[0]
                      if (near) {
                        const [y, m] = near.date.split('-').map(Number)
                        setAvailSelectedDay(near.date)
                        setAvailViewMonth({ year: y, month: m - 1 })
                      }
                    }).catch(() => {}).finally(() => setAvailLoading(false))
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </main>
  )
}

