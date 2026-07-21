'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Artist } from '@/lib/supabase'

type Studio = {
  id: string; name: string; slug: string; city: string | null; country: string | null
  description: string | null; logo_url: string | null; instagram: string | null
  whatsapp: string | null; website: string | null; profile_views: number
  instagram_clicks: number; whatsapp_clicks: number; website_clicks: number
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

export default function StudioPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [studio, setStudio] = useState<Studio | null>(null)
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [heroLoaded, setHeroLoaded] = useState(false)


  // Edit panel
  const [editOpen, setEditOpen] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keyVerified, setKeyVerified] = useState('')
  const [keyError, setKeyError] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Edit form (post key verification)
  const [editForm, setEditForm] = useState({ name: '', description: '', instagram: '', whatsapp: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(false)
  const [localLikes, setLocalLikes] = useState(0)

  useEffect(() => {
    if (!studio) return
    const alreadyLiked = localStorage.getItem(`liked_studio_${studio.id}`) === '1'
    setLiked(alreadyLiked)
    setLocalLikes(alreadyLiked ? 1 : 0)
  }, [studio])

  const toggleLike = () => {
    if (!studio) return
    if (liked) {
      localStorage.removeItem(`liked_studio_${studio.id}`)
      setLiked(false)
      setLocalLikes(n => Math.max(0, n - 1))
    } else {
      localStorage.setItem(`liked_studio_${studio.id}`, '1')
      setLiked(true)
      setLocalLikes(n => n + 1)
    }
  }

  const shareStudio = async () => {
    const url = `${window.location.origin}/estudio/${slug}`
    if (navigator.share) {
      try { await navigator.share({ title: studio?.name ?? 'Estudio', url }); return } catch { /* falló o canceló, cae a clipboard */ }
    }
    try { await navigator.clipboard.writeText(url) } catch {
      const el = Object.assign(document.createElement('textarea'), { value: url })
      Object.assign(el.style, { position: 'fixed', opacity: '0' })
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Add artist
  const [igInput, setIgInput] = useState('')
  const [addingArtist, setAddingArtist] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    router.prefetch('/')
    fetch(`/api/studios/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setStudio(d.studio); setArtists(d.artists || []) })
      .catch(s => { if (s === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }, [slug, router])

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
      setEditForm({
        name: studio?.name || '', description: studio?.description || '',
        instagram: studio?.instagram || '', whatsapp: studio?.whatsapp || '', website: studio?.website || '',
      })
    } else { setKeyError('Clave incorrecta. Si la perdiste, contactanos por Instagram @flashttoo') }
    setVerifying(false)
  }

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
    const fd = new FormData()
    fd.append('edit_key', keyVerified)
    Object.entries(editForm).forEach(([k, v]) => fd.append(k, v))
    if (logoFile) fd.append('logo', logoFile)
    const r = await fetch(`/api/studios/${slug}`, { method: 'PATCH', body: fd })
    const d = await r.json()
    if (!r.ok) { setSaveError(d.error || 'Error al guardar'); setSaving(false); return }
    setStudio(d.studio)
    setLogoFile(null); setLogoPreview(null)
    setSaving(false)
    setEditOpen(false); setKeyVerified(''); setKeyInput('')
  }

  const addArtist = async () => {
    if (!igInput.trim()) return
    setAddingArtist(true); setAddError('')
    const r = await fetch(`/api/studios/${slug}/artists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edit_key: keyVerified, instagram: igInput.trim() }),
    })
    const d = await r.json()
    if (!r.ok) { setAddError(d.error || 'Error'); setAddingArtist(false); return }
    setArtists(prev => [...prev, d.artist])
    setIgInput('')
    setAddingArtist(false)
  }

  const removeArtist = async (artist_id: string) => {
    const r = await fetch(`/api/studios/${slug}/artists`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edit_key: keyVerified, artist_id }),
    })
    if (r.ok) setArtists(prev => prev.filter(a => a.id !== artist_id))
  }

  if (loading) return (
    <main style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#efff42', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )

  if (notFound) return (
    <main style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Este estudio no existe o no está disponible.</p>
      <button onClick={() => router.back()} style={{ color: '#efff42', fontSize: 13, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>← Volver al inicio</button>
    </main>
  )

  if (!studio) return null

  const heroImg = logoPreview || studio.logo_url

  return (
    <main style={{ background: '#000', minHeight: '100vh', paddingBottom: 60 }}>

      {/* ── HERO con info superpuesta ── */}
      <div style={{ position: 'relative', width: '100%', background: '#0a0a0a' }}>

        {/* Imagen */}
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

          {/* Gradiente largo que se funde con el negro */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #111 0%, rgba(0,0,0,0.5) 50%, transparent 100%)' }} />

          {/* Badge + cerrar */}
          <span style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(239,255,66,0.7)', background: 'rgba(0,0,0,0.45)', padding: '5px 10px', borderRadius: 12, backdropFilter: 'blur(8px)' }}>
            Estudio
          </span>
          <button onClick={() => router.back()}
            style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer' }}>
            ×
          </button>

          {/* Nombre + ciudad superpuestos en el gradiente */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 20px', zIndex: 10 }}>
            <h1 style={{ fontSize: 'clamp(26px, 7vw, 38px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.05, marginBottom: 5 }}>
              {studio.name}
            </h1>
            {(studio.city || studio.country) && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                {[studio.city, studio.country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Descripción + tres puntos — card oscura con sombra redondeada */}
        <div style={{
          background: '#111',
          borderRadius: editOpen ? 0 : '0 0 20px 20px',
          borderBottom: editOpen ? 'none' : '1px solid rgba(255,255,255,0.05)',
          boxShadow: editOpen ? 'none' : '0 40px 100px rgba(0,0,0,0.9)',
          padding: '16px 20px 0',
        }}>
          {studio.description && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, marginBottom: 12 }}>
              {studio.description}
            </p>
          )}

          {(studio.instagram || studio.whatsapp || studio.website) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {studio.instagram && (
                <a href={`https://instagram.com/${studio.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                  onClick={() => fetch(`/api/studios/${slug}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'instagram' }) }).catch(() => {})}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>Instagram</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                </a>
              )}
              {studio.whatsapp && (
                <a href={`https://wa.me/${studio.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  onClick={() => fetch(`/api/studios/${slug}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'whatsapp' }) }).catch(() => {})}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>WhatsApp</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                </a>
              )}
              {studio.website && (
                <a href={studio.website.startsWith('http') ? studio.website : `https://${studio.website}`} target="_blank" rel="noopener noreferrer"
                  onClick={() => fetch(`/api/studios/${slug}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'website' }) }).catch(() => {})}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>Web</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                </a>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
            <div className="flex items-center justify-between">
              <div className="flex mr-3">
                <StatItem label="visitas"   value={studio.profile_views ?? 0} />
                <StatItem label="Instagram" value={studio.instagram_clicks ?? 0} />
                {studio.whatsapp && <StatItem label="WhatsApp" value={studio.whatsapp_clicks ?? 0} />}
                {studio.website  && <StatItem label="Web"      value={studio.website_clicks ?? 0} />}
              </div>
              <button onClick={toggleLike}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
                style={{ background: liked ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${liked ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                <span style={{ fontSize: 16, color: liked ? '#efff42' : 'rgba(255,255,255,0.3)', lineHeight: 1 }}>{liked ? '♥' : '♡'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: liked ? '#efff42' : 'rgba(255,255,255,0.3)' }}>{fmt(localLikes)}</span>
              </button>
            </div>
            <div className="mt-2 flex justify-end">
              <button onClick={shareStudio}
                className="flex items-center justify-center w-9 h-9 rounded-full transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${copied ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.08)'}`, color: copied ? 'rgba(239,255,66,0.7)' : 'rgba(255,255,255,0.3)', fontSize: 15 }}>
                {copied ? '✓' : '↑'}
              </button>
            </div>
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => { setEditOpen(v => !v); setKeyInput(''); setKeyError('') }}
                className="flex items-center justify-center px-3 py-1 rounded-full transition-all"
                style={{ color: editOpen ? 'rgba(239,255,66,0.6)' : 'rgba(255,255,255,0.18)', fontSize: 20, letterSpacing: '-2px', lineHeight: 1 }}>
                ···
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── PANEL AMARILLO ── */}
      {editOpen && (
        <div style={{ background: '#efff42', borderRadius: '0 0 20px 20px', padding: '20px 20px 24px', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>

          {!keyVerified ? (
            /* Ingreso de clave */
            <>
              <p style={{ color: '#000', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Gestionar estudio
              </p>
              <input
                autoFocus
                value={keyInput}
                onChange={e => { setKeyInput(e.target.value); setKeyError('') }}
                onKeyDown={e => { if (e.key === 'Enter') verifyKey() }}
                placeholder="CLAVE DEL ESTUDIO"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12, outline: 'none',
                  background: 'rgba(0,0,0,0.1)', border: `1px solid ${keyError ? 'rgba(160,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
                  color: '#000', letterSpacing: '0.12em', textAlign: 'center', fontSize: 13, fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
              {keyError && <p style={{ fontSize: 12, marginTop: 6, textAlign: 'center', color: 'rgba(160,0,0,0.8)' }}>{keyError}</p>}
              <button onClick={verifyKey} disabled={!keyInput.trim() || verifying}
                style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 12, background: '#000', color: '#efff42', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', opacity: (!keyInput.trim() || verifying) ? 0.3 : 1 }}>
                {verifying ? 'Verificando...' : 'Entrar →'}
              </button>
            </>
          ) : (
            /* Panel de edición completo */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ color: '#000', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Editar estudio
              </p>

              {/* Foto */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Foto del estudio</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {(logoPreview || studio.logo_url) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview || studio.logo_url!} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(0,0,0,0.15)' }} />
                  )}
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer', padding: '6px 14px', border: '1.5px solid rgba(0,0,0,0.2)', borderRadius: 20, background: 'rgba(0,0,0,0.06)' }}>
                    Cambiar foto
                    <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
                  </label>
                </div>
                <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 6 }}>Usá una imagen cuadrada (1:1) para que se vea sin recorte.</p>
              </div>

              {/* Campos */}
              {([
                { key: 'name',        label: 'Nombre',      placeholder: 'Nombre del estudio' },
                { key: 'description', label: 'Descripción', placeholder: 'Descripción breve del estudio' },
                { key: 'instagram',   label: 'Instagram',   placeholder: '@usuario' },
                { key: 'whatsapp',    label: 'WhatsApp',    placeholder: '+54 9 11 1234 5678' },
                { key: 'website',     label: 'Web',         placeholder: 'https://tuestudio.com' },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</p>
                  {key === 'description' ? (
                    <textarea value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} rows={3} placeholder={placeholder}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.12)', color: '#000', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  ) : (
                    <input value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.12)', color: '#000', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}

              {saveError && <p style={{ color: 'rgba(160,0,0,0.8)', fontSize: 12 }}>{saveError}</p>}
              <button onClick={saveEdit} disabled={saving}
                style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#000', color: '#efff42', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.4 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>

              {/* Agregar artista */}
              <div style={{ borderTop: '1.5px solid rgba(0,0,0,0.12)', paddingTop: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Agregar artista por IG</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={igInput} onChange={e => setIgInput(e.target.value)} placeholder="@usuario"
                    onKeyDown={e => e.key === 'Enter' && addArtist()}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.12)', color: '#000', fontSize: 14, outline: 'none' }} />
                  <button onClick={addArtist} disabled={addingArtist}
                    style={{ padding: '10px 16px', borderRadius: 12, background: '#000', color: '#efff42', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', opacity: addingArtist ? 0.4 : 1 }}>
                    {addingArtist ? '...' : 'Agregar'}
                  </button>
                </div>
                {addError && <p style={{ color: 'rgba(160,0,0,0.8)', fontSize: 12, marginTop: 6 }}>{addError}</p>}
              </div>

              {/* Lista artistas vinculados */}
              {artists.length > 0 && (
                <div style={{ borderTop: '1.5px solid rgba(0,0,0,0.12)', paddingTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Artistas vinculados</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {artists.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(0,0,0,0.07)', borderRadius: 10 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.photo_url} alt={a.name} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</p>
                          {a.instagram && <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>@{a.instagram?.replace('@', '')}</p>}
                        </div>
                        <button onClick={() => removeArtist(a.id)}
                          style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,0.35)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ARTISTAS ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 0' }}>
        {artists.length > 0 ? (
          <>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', marginBottom: 14 }}>
              {artists.length} artista{artists.length !== 1 ? 's' : ''} en este estudio
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {artists.map(a => (
                <button key={a.id} onClick={() => {
                    sessionStorage.setItem('flashttoo_from_studio', `/estudio/${slug}`)
                    try { sessionStorage.setItem('flashttoo_prefetch_artist', JSON.stringify(a)) } catch {}
                    router.push(`/?artista=${a.id}`)
                  }}
                  style={{ display: 'block', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', background: '#111', width: '100%', padding: 0, cursor: 'pointer' }}>
                  <div style={{ paddingBottom: '133%' }} />
                  <div style={{ position: 'absolute', inset: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.photo_url} alt={a.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.currentTarget.style.opacity = '0' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />
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
            Este estudio aún no tiene artistas vinculados.
          </p>
        )}
      </div>


    </main>
  )
}
