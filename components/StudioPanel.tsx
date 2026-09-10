'use client'

import { useEffect, useRef, useState } from 'react'
import type { Artist } from '@/lib/supabase'
import { useTranslation } from '@/contexts/TranslationContext'

type Studio = {
  id: string; name: string; slug: string; city: string | null; country: string | null
  description: string | null; logo_url: string | null; instagram: string | null
  whatsapp: string | null; website: string | null; profile_views: number
  instagram_clicks: number; whatsapp_clicks: number; website_clicks: number
  likes: number; hiring: boolean; hiring_role: string | null; auth_email?: string | null
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k'
  return String(n)
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5" style={{ width: 52 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{fmt(value)}</span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

export default function StudioPanel({ slug, onClose, onOpenArtist, accessToken, refreshToken, authEmail, adminPass, showClickCounters = false }: {
  slug: string
  onClose: () => void
  onOpenArtist: (artist: Artist) => void
  accessToken?: string
  refreshToken?: string
  authEmail?: string
  adminPass?: string
  showClickCounters?: boolean
}) {
  const { t, language } = useTranslation()
  const authMode = Boolean(accessToken)

  const [studio, setStudio] = useState<Studio | null>(null)
  const [artists, setArtists] = useState<(Artist & { is_owner?: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [heroLoaded, setHeroLoaded] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const authAutoOpenedRef = useRef(false)
  const [keyInput, setKeyInput] = useState('')
  const [keyVerified, setKeyVerified] = useState('')
  const [keyError, setKeyError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const [editForm, setEditForm] = useState({ name: '', description: '', city: '', country: '', instagram: '', whatsapp: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(false)
  const [localLikes, setLocalLikes] = useState(0)
  const [contactOpen, setContactOpen] = useState(false)

  const [igInput, setIgInput] = useState('')
  const [addingArtist, setAddingArtist] = useState(false)
  const [addError, setAddError] = useState('')


  useEffect(() => {
    setLoading(true); setNotFound(false); setStudio(null); setArtists([])
    const headers: Record<string, string> = {}
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    if (adminPass) headers['x-admin-pass'] = adminPass
    fetch(`/api/studios/${slug}`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setStudio(d.studio); setArtists(d.artists || []) })
      .catch(s => { if (s === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }, [slug, accessToken, adminPass])

  // Auto-open edit panel and pre-fill form in auth mode (only on first load)
  useEffect(() => {
    if (!studio || !authMode) return
    if (authAutoOpenedRef.current) return
    authAutoOpenedRef.current = true
    setEditOpen(true)
    setEditForm({ name: studio.name || '', description: studio.description || '', city: studio.city || '', country: studio.country || '', instagram: studio.instagram || '', whatsapp: studio.whatsapp || '', website: studio.website || '' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio, authMode])

  useEffect(() => {
    if (!studio) return
    const alreadyLiked = localStorage.getItem(`liked_studio_${studio.id}`) === '1'
    setLiked(alreadyLiked)
    setLocalLikes((studio.likes ?? 0) + (alreadyLiked ? 1 : 0))
  }, [studio])

  const toggleLike = () => {
    if (!studio) return
    if (liked) {
      localStorage.removeItem(`liked_studio_${studio.id}`)
      setLiked(false); setLocalLikes(n => Math.max(0, n - 1))
      fetch(`/api/studios/${slug}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'unlike' }) }).catch(() => {})
    } else {
      localStorage.setItem(`liked_studio_${studio.id}`, '1')
      setLiked(true); setLocalLikes(n => n + 1)
      fetch(`/api/studios/${slug}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'like' }) }).catch(() => {})
    }
  }

  const shareStudio = async () => {
    const url = `${window.location.origin}/estudio/${slug}`
    if (navigator.share) {
      try { await navigator.share({ title: studio?.name ?? 'Estudio', url }); return } catch { /* canceló */ }
    }
    try { await navigator.clipboard.writeText(url) } catch {
      const el = Object.assign(document.createElement('textarea'), { value: url })
      Object.assign(el.style, { position: 'fixed', opacity: '0' })
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const verifyKey = async () => {
    if (!keyInput.trim()) return
    setVerifying(true); setKeyError('')
    const r = await fetch(`/api/studios/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edit_key: keyInput.trim(), _verify: true }),
    })
    if (r.ok) {
      setKeyVerified(keyInput.trim())
      setEditForm({ name: studio?.name || '', description: studio?.description || '', city: studio?.city || '', country: studio?.country || '', instagram: studio?.instagram || '', whatsapp: studio?.whatsapp || '', website: studio?.website || '' })
    } else { setKeyError(t('estudio', 'wrong_key', 'Clave incorrecta. Si la perdiste, contactanos por Instagram @flashttoo')) }
    setVerifying(false)
  }

  const authKey = () => authMode && accessToken
    ? { access_token: accessToken }
    : { edit_key: keyVerified }


  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    const img = new window.Image()
    img.onload = () => {
      const MAX = 900; let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => { if (blob) setLogoFile(new File([blob], 'logo.webp', { type: 'image/webp' })) }, 'image/webp', 0.85)
    }
    img.src = URL.createObjectURL(file)
  }

  const saveEdit = async () => {
    setSaving(true); setSaveError('')

    const buildFd = (token: string) => {
      const fd = new FormData()
      fd.append('access_token', token)
      Object.entries(editForm).forEach(([k, v]) => fd.append(k, v))
      if (logoFile) fd.append('logo', logoFile)
      return fd
    }

    const tryWithKey = () => {
      const fd = new FormData()
      fd.append('edit_key', keyVerified)
      Object.entries(editForm).forEach(([k, v]) => fd.append(k, v))
      if (logoFile) fd.append('logo', logoFile)
      return fd
    }

    let r: Response
    if (authMode && accessToken) {
      r = await fetch(`/api/studios/${slug}`, { method: 'PATCH', body: buildFd(accessToken) })
      if (r.status === 401 && refreshToken) {
        try {
          const ref = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }) })
          if (ref.ok) {
            const { access_token: newToken } = await ref.json()
            r = await fetch(`/api/studios/${slug}`, { method: 'PATCH', body: buildFd(newToken) })
          }
        } catch { /* reintento fallido */ }
      }
    } else {
      r = await fetch(`/api/studios/${slug}`, { method: 'PATCH', body: tryWithKey() })
    }

    const d = await r!.json()
    if (!r!.ok) {
      setSaveError(r!.status === 401 ? 'Sesión expirada. Cerrá y volvé a abrir el perfil.' : (d.error || 'Error al guardar'))
      setSaving(false); return
    }
    setStudio(d.studio); setLogoFile(null); setLogoPreview(null)
    setSaving(false)
    setEditOpen(false); setKeyVerified(''); setKeyInput('')
  }

  const addArtist = async () => {
    if (!igInput.trim()) return
    setAddingArtist(true); setAddError('')
    const r = await fetch(`/api/studios/${slug}/artists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...authKey(), instagram: igInput.trim() }),
    })
    const d = await r.json()
    if (!r.ok) {
      const msg = d.error === 'artist_not_found'
        ? t('estudio', 'add_artist_not_found', `No se encontró ningún artista con @${d.handle || igInput.trim().replace(/^@/, '')} en Flashttoo`)
        : (d.error || 'Error')
      setAddError(msg); setAddingArtist(false); return
    }
    setArtists(prev => [...prev, d.artist]); setIgInput(''); setAddingArtist(false)
  }

  const removeArtist = async (artist_id: string) => {
    const r = await fetch(`/api/studios/${slug}/artists`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...authKey(), artist_id }),
    })
    if (r.ok) setArtists(prev => prev.filter(a => a.id !== artist_id))
  }

  const toggleOwner = async (artist_id: string, currently: boolean) => {
    const is_owner = !currently
    const r = await fetch(`/api/studios/${slug}/artists`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...authKey(), artist_id, is_owner }),
    })
    if (r.ok) setArtists(prev => prev.map(a => ({ ...a, is_owner: is_owner ? a.id === artist_id : (a.is_owner && a.id === artist_id ? false : a.is_owner) })))
  }

  const heroImg = logoPreview || studio?.logo_url || null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#000', overflowY: 'auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes slideUpModal { from{transform:translateY(28px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#efff42', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {notFound && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>{t('estudio', 'not_found', 'Este estudio no existe o no está disponible.')}</p>
          <button onClick={onClose} style={{ color: '#efff42', fontSize: 13, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>{t('global', 'back', '← volver')}</button>
        </div>
      )}

      {!loading && !notFound && studio && (
        <div style={{ paddingBottom: 60, maxWidth: 480, margin: '0 auto' }}>

          {/* HERO */}
          <div style={{ position: 'relative', width: '100%', background: '#0a0a0a' }}>
            <div style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden' }}>
              {heroImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImg} alt={studio.name} onLoad={() => setHeroLoaded(true)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', opacity: heroLoaded ? 1 : 0, transition: 'opacity 0.4s ease' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 80, fontWeight: 900, color: 'rgba(239,255,66,0.08)', letterSpacing: '-0.04em' }}>{initialsOf(studio.name)}</span>
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #111 0%, rgba(0,0,0,0.5) 50%, transparent 100%)' }} />
              <span style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(239,255,66,0.7)', background: 'rgba(0,0,0,0.45)', padding: '5px 10px', borderRadius: 12, backdropFilter: 'blur(8px)' }}>
                {t('estudio', 'badge', 'Estudio')}
              </span>
              <button onClick={onClose}
                style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer' }}>
                ×
              </button>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 20px', zIndex: 10 }}>
                <h1 style={{ fontSize: 'clamp(26px, 7vw, 38px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.05, marginBottom: 5 }}>{studio.name}</h1>
                {(studio.city || studio.country) && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{[studio.city, studio.country].filter(Boolean).join(', ')}</p>
                )}
              </div>
            </div>

            {/* Info card */}
            <div style={{ background: '#111', borderRadius: editOpen ? 0 : '0 0 20px 20px', borderBottom: editOpen ? 'none' : '1px solid rgba(255,255,255,0.05)', boxShadow: editOpen ? 'none' : '0 40px 100px rgba(0,0,0,0.9)', padding: '16px 20px 0' }}>
              {studio.description && (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, marginBottom: 12, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{studio.description}</p>
              )}
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, paddingBottom: 20 }}>
                <div className="flex items-center justify-between">
                  <div className="flex mr-3">
                    <StatItem label={t('estudio', 'stat_views', 'visitas')} value={studio.profile_views ?? 0} />
                    {showClickCounters && <StatItem label="Instagram" value={studio.instagram_clicks ?? 0} />}
                    {showClickCounters && studio.whatsapp && <StatItem label="WhatsApp" value={studio.whatsapp_clicks ?? 0} />}
                    {studio.website  && <StatItem label={t('estudio', 'stat_web', 'Web')} value={studio.website_clicks ?? 0} />}
                  </div>
                  {(studio.instagram || studio.whatsapp || studio.website) && (
                    <button onClick={() => setContactOpen(true)}
                      style={{ fontSize: 11, fontWeight: 700, color: '#000', background: '#38bdf8', border: 'none', borderRadius: 20, padding: '5px 13px', cursor: 'pointer', letterSpacing: '0.04em' }}>
                      Contacto
                    </button>
                  )}
                  <button onClick={toggleLike} className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
                    style={{ background: liked ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${liked ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                    <span style={{ fontSize: 16, color: liked ? '#efff42' : 'rgba(255,255,255,0.3)', lineHeight: 1 }}>{liked ? '♥' : '♡'}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: liked ? '#efff42' : 'rgba(255,255,255,0.3)' }}>{fmt(localLikes)}</span>
                  </button>
                </div>
                {!authMode && !studio?.auth_email && (
                  <div className="mt-2 flex justify-end">
                    <button onClick={() => { setEditOpen(v => !v); setKeyInput(''); setKeyError('') }}
                      className="flex items-center justify-center px-3 py-1 rounded-full transition-all"
                      style={{ color: editOpen ? 'rgba(239,255,66,0.6)' : 'rgba(255,255,255,0.18)', fontSize: 20, letterSpacing: '-2px', lineHeight: 1 }}>
                      ···
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PANEL EDICIÓN */}
          {editOpen && (
            <div style={{ background: '#111', borderRadius: '0 0 20px 20px', padding: '20px 20px 24px', boxShadow: '0 40px 100px rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }}>
              {!keyVerified && !authMode ? (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>{t('estudio', 'manage_title', 'Gestionar estudio')}</p>
                  <input autoFocus value={keyInput} onChange={e => { setKeyInput(e.target.value); setKeyError('') }} onKeyDown={e => { if (e.key === 'Enter') verifyKey() }}
                    placeholder={t('estudio', 'key_placeholder', 'CLAVE DEL ESTUDIO')}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, outline: 'none', background: 'rgba(255,255,255,0.06)', border: `1px solid ${keyError ? 'rgba(255,80,80,0.4)' : 'rgba(255,255,255,0.1)'}`, color: '#fff', letterSpacing: '0.12em', textAlign: 'center', fontSize: 13, fontWeight: 600, boxSizing: 'border-box' }} />
                  {keyError && <p style={{ fontSize: 12, marginTop: 6, textAlign: 'center', color: 'rgba(255,100,100,0.8)' }}>{keyError}</p>}
                  <button onClick={verifyKey} disabled={!keyInput.trim() || verifying}
                    style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 12, background: '#efff42', color: '#000', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', opacity: (!keyInput.trim() || verifying) ? 0.3 : 1 }}>
                    {verifying ? t('estudio', 'verifying', 'Verificando...') : t('estudio', 'enter_btn', 'Entrar →')}
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('estudio', 'edit_title', 'Editar estudio')}</p>

                  {authEmail && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{t('estudio', 'registered_with', 'Cuenta registrada con')}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', wordBreak: 'break-all' }}>{authEmail}</p>
                    </div>
                  )}

                  {/* Foto */}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t('estudio', 'photo_label', 'Foto del estudio')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {(logoPreview || studio.logo_url) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreview || studio.logo_url!} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                      )}
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '6px 14px', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 20, background: 'rgba(255,255,255,0.05)' }}>
                        {t('estudio', 'photo_change', 'Cambiar foto')}
                        <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>{t('estudio', 'photo_hint', 'Usá una imagen cuadrada (1:1) para que se vea sin recorte.')}</p>
                  </div>

                  {/* Campos */}
                  {([
                    { key: 'name',        label: t('estudio', 'field_name', 'Nombre'),      placeholder: t('estudio', 'field_name_placeholder', 'Nombre del estudio') },
                    { key: 'description', label: t('estudio', 'field_description', 'Descripción'), placeholder: t('estudio', 'field_description_placeholder', 'Descripción breve del estudio') },
                    { key: 'city',        label: 'Ciudad',      placeholder: 'Buenos Aires' },
                    { key: 'country',     label: 'País',        placeholder: 'Argentina' },
                    { key: 'instagram',   label: 'Instagram',   placeholder: t('agregar', 'instagram_placeholder', '@usuario') },
                    { key: 'whatsapp',    label: 'WhatsApp',    placeholder: '+54 9 11 1234 5678' },
                    { key: 'website',     label: t('estudio', 'stat_web', 'Web'), placeholder: 'https://tuestudio.com' },
                  ] as const).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</p>
                      {key === 'description' ? (
                        <textarea value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} rows={3} placeholder={placeholder}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      ) : (
                        <input value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                      )}
                    </div>
                  ))}

                  {/* Agregar artista */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{t('estudio', 'add_artist_title', 'Agregar artista por IG')}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5, marginBottom: 10 }}>{t('estudio', 'add_artist_desc', 'El artista ya tiene que tener perfil en Flashttoo.')}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={igInput} onChange={e => setIgInput(e.target.value)} placeholder={t('agregar', 'instagram_placeholder', '@usuario')} onKeyDown={e => e.key === 'Enter' && addArtist()}
                        style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none' }} />
                      <button onClick={addArtist} disabled={addingArtist}
                        style={{ padding: '10px 16px', borderRadius: 12, background: '#efff42', color: '#000', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', opacity: addingArtist ? 0.4 : 1 }}>
                        {addingArtist ? '...' : t('estudio', 'add_btn', 'Agregar')}
                      </button>
                    </div>
                    {addError && <p style={{ color: 'rgba(255,100,100,0.8)', fontSize: 12, marginTop: 6 }}>{addError}</p>}
                  </div>

                  {/* Artistas vinculados */}
                  {artists.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('estudio', 'linked_artists', 'Artistas vinculados')}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {artists.map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.photo_url} alt={a.name} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</p>
                              {a.instagram && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>@{a.instagram?.replace('@', '')}</p>}
                            </div>
                            <button onClick={() => toggleOwner(a.id, !!a.is_owner)} title={a.is_owner ? 'Quitar owner' : 'Marcar como owner'}
                              style={{ background: a.is_owner ? 'rgba(239,255,66,0.15)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: a.is_owner ? '#efff42' : 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 11, fontWeight: 800, padding: '3px 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              owner
                            </button>
                            <button onClick={() => removeArtist(a.id)}
                              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {saveError && <p style={{ color: 'rgba(255,100,100,0.8)', fontSize: 12 }}>{saveError}</p>}
                  <button onClick={saveEdit} disabled={saving}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#efff42', color: '#000', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.4 : 1 }}>
                    {saving ? t('estudio', 'saving', 'Guardando...') : t('estudio', 'save_btn', 'Guardar cambios')}
                  </button>

                  {/* Términos */}
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', textAlign: 'center', lineHeight: 1.6, paddingTop: 8 }}>
                    {t('estudio', 'legal_notice', 'Al usar Flashttoo aceptás nuestros')}{' '}
                    <a href="/terminos" target="_blank" rel="noopener noreferrer"
                      style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'underline' }}>
                      {t('estudio', 'legal_terms', 'Términos y condiciones')}
                    </a>
                    {' '}{t('estudio', 'legal_and', 'y')}{' '}
                    <a href="/privacidad" target="_blank" rel="noopener noreferrer"
                      style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'underline' }}>
                      {t('estudio', 'legal_privacy', 'Política de privacidad')}
                    </a>.
                  </p>

                </div>
              )}
            </div>
          )}

          {/* ARTISTAS */}
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 0' }}>
            {artists.length > 0 ? (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', marginBottom: 14 }}>
                  {artists.length} {artists.length !== 1 ? t('estudio', 'artists_count_many', 'artistas en este estudio') : t('estudio', 'artists_count_one', 'artista en este estudio')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {artists.map(a => (
                    <button key={a.id} onClick={() => onOpenArtist(a)}
                      style={{ display: 'block', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', background: '#111', width: '100%', padding: 0, cursor: 'pointer' }}>
                      <div style={{ paddingBottom: '133%' }} />
                      <div style={{ position: 'absolute', inset: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.photo_url} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.opacity = '0' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />
                        {a.is_owner && (
                          <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#000', background: '#efff42', padding: '2px 5px', borderRadius: 4 }}>
                            owner
                          </span>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px' }}>
                          <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', lineHeight: 1.2, overflowWrap: 'break-word' }}>{a.name}</p>
                          {a.city && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{a.city}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 13, padding: '40px 0' }}>
                {t('estudio', 'no_artists', 'Este estudio aún no tiene artistas vinculados.')}
              </p>
            )}
          </div>


        </div>
      )}

      {/* Modal de contacto iOS-style */}
      {contactOpen && studio && (
        <div onClick={() => setContactOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 65, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, borderRadius: 20, background: 'rgba(18,18,20,0.78)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.08)', animation: 'slideUpModal 0.38s cubic-bezier(0.22,0.61,0.36,1)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '16px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{studio.name}</p>
              <button onClick={() => setContactOpen(false)}
                style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {/* Grupo contacto */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, margin: '0 10px', overflow: 'hidden' }}>
              {studio.instagram && (
                <a href={`https://instagram.com/${studio.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                  onClick={() => { fetch(`/api/studios/${slug}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'instagram' }) }).catch(() => {}); setContactOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', cursor: 'pointer', textDecoration: 'none', width: '100%', background: 'none', border: 'none', textAlign: 'left' as const }}>
                  <svg style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
                  <span style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.85)', flex: 1, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Instagram</span>
                </a>
              )}
              {studio.whatsapp && (
                <a href={`https://wa.me/${studio.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  onClick={() => { fetch(`/api/studios/${slug}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'whatsapp' }) }).catch(() => {}); setContactOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', cursor: 'pointer', textDecoration: 'none', width: '100%', background: 'none', border: 'none', textAlign: 'left' as const }}>
                  <svg style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  <span style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.85)', flex: 1, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>WhatsApp</span>
                </a>
              )}
              {studio.website && (
                <a href={studio.website.startsWith('http') ? studio.website : `https://${studio.website}`} target="_blank" rel="noopener noreferrer"
                  onClick={() => { fetch(`/api/studios/${slug}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'website' }) }).catch(() => {}); setContactOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', cursor: 'pointer', textDecoration: 'none', width: '100%', background: 'none', border: 'none', textAlign: 'left' as const }}>
                  <svg style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  <span style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.85)', flex: 1, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Web</span>
                </a>
              )}
            </div>

            {/* Compartir */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, margin: '8px 10px 10px', overflow: 'hidden' }}>
              <button onClick={() => { shareStudio(); setContactOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', cursor: 'pointer', width: '100%', background: 'none', border: 'none', textAlign: 'left' as const }}>
                <svg style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="#ffffff"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span style={{ fontSize: 15, fontWeight: 300, color: copied ? 'rgba(239,255,66,0.9)' : 'rgba(255,255,255,0.85)', flex: 1, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{copied ? '¡Copiado!' : t('estudio', 'share_btn', 'Compartir perfil')}</span>
                {copied && <span style={{ fontSize: 13, color: 'rgba(239,255,66,0.5)' }}>✓</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
