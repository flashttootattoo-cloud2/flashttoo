'use client'

import { useState, useEffect } from 'react'
import { type Artist, type Visit } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { INTERVIEW_QUESTIONS } from '@/lib/interview'

const DEFAULT_STYLES = [
  'Tradicional','Realismo','Blackwork','Acuarela','Geométrico',
  'Japonés','Neo Tradicional','Minimalista','Old School','Dotwork',
  'Fineline','Lettering','Tribal','Biomecánico','Cover-up','Ornamental','Otros',
]

const BIO_MAX = 280

interface Props {
  artist: Artist
  onClose: () => void
  onSaved: (updated: Artist) => void
  onDeleted: () => void
  prefilledKey?: string
}

export default function EditPanel({ artist, onClose, onSaved, onDeleted, prefilledKey }: Props) {
  const [step, setStep]       = useState<'key' | 'form'>(prefilledKey ? 'form' : 'key')
  const [key, setKey]         = useState(prefilledKey || '')
  const [keyError, setKeyError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const [form, setForm] = useState({
    name:      artist.name,
    city:      artist.city,
    country:   artist.country,
    instagram: artist.instagram || '',
    whatsapp:  artist.whatsapp  || '',
    email:     artist.email     || '',
    bio:       artist.bio       || '',
  })
  const [allStyles, setAllStyles] = useState<string[]>(DEFAULT_STYLES)
  useEffect(() => {
    fetch('/api/styles').then(r => r.json()).then(d => { if (d.styles?.length) setAllStyles(d.styles) }).catch(() => {})
  }, [])
  const [styles, setStyles]   = useState<string[]>(artist.styles || [])
  const [interview, setInterview] = useState<Record<string, string>>(
    (artist.interview as Record<string, string> | null) ?? {}
  )
  const [interviewOpen, setInterviewOpen] = useState(() =>
    INTERVIEW_QUESTIONS.some(q => !!(artist.interview as Record<string, string> | null)?.[q.key]?.trim())
  )
  const [photo, setPhoto]     = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState('')
  const [stylesOpen, setStylesOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [newKey, setNewKey]         = useState<string | null>(null)
  const [keyCopied, setKeyCopied]   = useState(false)
  const [savingNewKey, setSavingNewKey] = useState(false)
  const [visits, setVisits] = useState<Visit[]>(
    (artist.visits || []).filter(v => v.to >= new Date().toISOString().slice(0, 10))
  )
  const [visitOpen, setVisitOpen] = useState(false)
  const [addingVisit, setAddingVisit] = useState(false)
  const [newVisit, setNewVisit] = useState({ from: '', to: '', city: '', country: '' })
  const [galleryFiles, setGalleryFiles]     = useState<(File | null)[]>([null, null, null])
  const [galleryPreviews, setGalleryPreviews] = useState<(string | null)[]>([
    artist.gallery_photo_1 ?? null,
    artist.gallery_photo_2 ?? null,
    artist.gallery_photo_3 ?? null,
  ])
  const [galleryEnabled, setGalleryEnabled] = useState(false)
  useEffect(() => {
    fetch('/api/features').then(r => r.json()).then(d => setGalleryEnabled(!!d.artist_gallery)).catch(() => {})
  }, [])

  const genKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const saveNewKey = async () => {
    if (!newKey) return
    setSavingNewKey(true)
    const res = await fetch(`/api/artists/${artist.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editKey: key.trim().toUpperCase(), new_edit_key: newKey }),
    })
    if (res.ok) {
      setKey(newKey)
      setNewKey(null)
      setKeyCopied(false)
    }
    setSavingNewKey(false)
  }

  const toggleStyle = (s: string) =>
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const deleteProfile = async () => {
    setDeleting(true); setDeleteError('')
    const res = await fetch(`/api/artists/${artist.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editKey: key }),
    })
    if (res.ok) { onDeleted() }
    else { const d = await res.json(); setDeleteError(d.error || 'Error'); setDeleting(false) }
  }

  const verifyKey = async () => {
    if (!key.trim()) return
    setVerifying(true); setKeyError('')
    const res = await fetch(`/api/artists/${artist.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editKey: key.trim().toUpperCase(), _verify: true }),
    })
    if (res.ok) { setStep('form') }
    else { setKeyError('Clave incorrecta. Si la perdiste, contactanos por Instagram @flashttoo') }
    setVerifying(false)
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPreview(URL.createObjectURL(file))
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
      canvas.toBlob(blob => { if (blob) setPhoto(new File([blob], 'photo.webp', { type: 'image/webp' })) }, 'image/webp', 0.82)
    }
    img.src = URL.createObjectURL(file)
  }

  const handleGalleryPhoto = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setGalleryPreviews(prev => { const n = [...prev]; n[index] = objectUrl; return n })
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
      canvas.toBlob(blob => {
        if (blob) setGalleryFiles(prev => { const n = [...prev]; n[index] = new File([blob!], `gallery-${index}.webp`, { type: 'image/webp' }); return n })
      }, 'image/webp', 0.85)
    }
    img.src = objectUrl
  }

  const clearGallerySlot = (index: number) => {
    setGalleryPreviews(prev => { const n = [...prev]; n[index] = null; return n })
    setGalleryFiles(prev => { const n = [...prev]; n[index] = null; return n })
  }

  const save = async () => {
    setSaving(true); setSaveError('')
    try {
      let photo_url = artist.photo_url
      if (photo) {
        const fd = new FormData()
        fd.append('file', photo)
        fd.append('path', `${Date.now()}.webp`)
        const r = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!r.ok) throw new Error('Error al subir foto')
        photo_url = (await r.json()).url
      }

      // Subir fotos de galería que hayan cambiado
      const galleryUrls: (string | null)[] = [...galleryPreviews]
      for (let i = 0; i < 3; i++) {
        const file = galleryFiles[i]
        if (file) {
          const gfd = new FormData()
          gfd.append('file', file)
          gfd.append('path', `gallery-${artist.id}-${i}-${Date.now()}.webp`)
          const gr = await fetch('/api/upload', { method: 'POST', body: gfd })
          if (gr.ok) galleryUrls[i] = (await gr.json()).url
        }
      }

      const res = await fetch(`/api/artists/${artist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editKey: key.trim().toUpperCase(),
          photo_url,
          ...form,
          instagram: form.instagram.trim() || null,
          whatsapp:  form.whatsapp.trim()  || null,
          email:     form.email.trim()     || null,
          bio:       form.bio.trim()       || null,
          styles,
          interview: Object.fromEntries(
            Object.entries(interview).filter(([, v]) => v.trim())
          ),
          visits,
          gallery_photo_1: galleryUrls[0],
          gallery_photo_2: galleryUrls[1],
          gallery_photo_3: galleryUrls[2],
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      onSaved(d.artist)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  const iCls = 'w-full py-2.5 px-4 text-sm text-white outline-none rounded-lg transition-colors'

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#000' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-sm font-bold text-white">
          {step === 'key' ? 'Editar perfil' : artist.name}
        </p>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors text-xl">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="max-w-sm mx-auto flex flex-col gap-5">

          {/* PASO 1: Clave */}
          {step === 'key' && (
            <>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                Ingresá la clave de edición que recibiste cuando creaste tu perfil.
              </p>
              <div>
                <input
                  autoFocus
                  value={key}
                  onChange={e => { setKey(e.target.value.toUpperCase()); setKeyError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') verifyKey() }}
                  placeholder="XXXXXXXX"
                  className={iCls}
                  style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${keyError ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}`, letterSpacing: '0.15em', textAlign: 'center', fontSize: 18, fontWeight: 700 }}
                />
                {keyError && <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>{keyError}</p>}
              </div>
              <button onClick={verifyKey} disabled={!key.trim() || verifying}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ background: '#efff42', color: '#000' }}>
                {verifying ? 'Verificando...' : 'Continuar →'}
              </button>
            </>
          )}

          {/* PASO 2: Formulario */}
          {step === 'form' && (
            <>
              {/* Foto */}
              <label className="cursor-pointer block">
                <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Foto</p>
                <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom: '80%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview || artist.photo_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <span className="text-xs text-white/60 bg-black/50 px-3 py-1.5 rounded-full">cambiar foto</span>
                  </div>
                </div>
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>

              <Field label="Nombre *">
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Ciudad *">
                  <input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </Field>
                <Field label="País *">
                  <input required value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </Field>
              </div>

              {/* Estilos */}
              <div className="relative">
                <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Estilos</p>
                <button type="button" onClick={() => setStylesOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: styles.length ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                  <span>{styles.length === 0 ? 'Seleccioná estilos...' : `${styles.length} seleccionado${styles.length > 1 ? 's' : ''}`}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{stylesOpen ? '▲' : '▼'}</span>
                </button>
                {stylesOpen && (
                  <div className="rounded-xl mt-1 overflow-y-auto" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 220 }}>
                    <div className="grid grid-cols-2">
                      {allStyles.map((s: string) => {
                        const on = styles.includes(s)
                        return (
                          <button key={s} type="button" onClick={() => toggleStyle(s)}
                            className="flex items-center justify-between px-4 py-2.5 text-sm text-left"
                            style={{ background: on ? 'rgba(239,255,66,0.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.04)', color: on ? '#efff42' : 'rgba(255,255,255,0.55)', fontWeight: on ? 700 : 400 }}>
                            {s} {on && <span style={{ color: '#efff42', fontSize: 12 }}>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <Field label="Instagram">
                <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                  placeholder="@usuario" className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </Field>

              <Field label="WhatsApp">
                <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+54 9 11 1234 5678" className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="hola@ejemplo.com" className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </Field>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Biografía</span>
                  <span className="text-xs tabular-nums" style={{ color: form.bio.length >= BIO_MAX ? '#f87171' : 'rgba(255,255,255,0.2)' }}>
                    {form.bio.length}/{BIO_MAX}
                  </span>
                </div>
                <textarea value={form.bio} rows={3}
                  onChange={e => { if (e.target.value.length <= BIO_MAX) setForm(f => ({ ...f, bio: e.target.value })) }}
                  className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', resize: 'none', lineHeight: 1.6 }} />
              </div>

              {/* Galería de diseños */}
              {galleryEnabled && (
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Galería de diseños — opcional</label>
                  <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
                    Hasta 3 fotos de tus mejores trabajos.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="relative" style={{ paddingBottom: '100%' }}>
                        <div className="absolute inset-0 rounded-xl overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {galleryPreviews[i] ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={galleryPreviews[i]!} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => clearGallerySlot(i)}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center z-10"
                                style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 14, lineHeight: 1 }}>
                                ×
                              </button>
                              <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 flex items-end justify-center pb-2"
                                style={{ background: 'rgba(0,0,0,0.4)' }}>
                                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full">cambiar</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleGalleryPhoto(i, e)} />
                              </label>
                            </>
                          ) : (
                            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer gap-1">
                              <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.15)' }}>+</span>
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>foto {i + 1}</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleGalleryPhoto(i, e)} />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próximas fechas */}
              <div>
                <button
                  type="button"
                  onClick={() => { setVisitOpen(v => !v); setAddingVisit(false) }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: visitOpen
                      ? 'linear-gradient(135deg, rgba(239,255,66,0.16), rgba(239,255,66,0.04))'
                      : 'linear-gradient(135deg, rgba(239,255,66,0.08), rgba(239,255,66,0.015))',
                    border: `1px solid rgba(239,255,66,${visitOpen ? 0.25 : 0.14})`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: visitOpen ? '#efff42' : 'rgba(239,255,66,0.6)' }}>
                      Próximas fechas — ¿dónde estarás?
                    </span>
                    {visits.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(239,255,66,0.15)', color: '#efff42' }}>
                        {visits.length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{visitOpen ? '▲' : '▼'}</span>
                </button>

                {visitOpen && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      Las fechas se eliminan automáticamente cuando expiran.
                    </p>
                    {visits.map((v, i) => (
                      <div key={i} className="flex items-start justify-between px-3 py-2.5 rounded-xl"
                        style={{ background: 'rgba(239,255,66,0.04)', border: '1px solid rgba(239,255,66,0.12)' }}>
                        <div>
                          <p className="text-sm font-medium text-white">{v.city}, {v.country}</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                            {new Date(v.from + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – {new Date(v.to + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <button type="button" onClick={() => setVisits(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20, lineHeight: 1, padding: '0 4px', marginTop: -2 }}>×</button>
                      </div>
                    ))}

                    {addingVisit ? (
                      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Desde</p>
                            <input type="date" value={newVisit.from} onChange={e => setNewVisit(v => ({ ...v, from: e.target.value }))}
                              className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Hasta</p>
                            <input type="date" value={newVisit.to} onChange={e => setNewVisit(v => ({ ...v, to: e.target.value }))}
                              className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Ciudad</p>
                            <input value={newVisit.city} onChange={e => setNewVisit(v => ({ ...v, city: e.target.value }))}
                              placeholder="Santiago" className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>País</p>
                            <input value={newVisit.country} onChange={e => setNewVisit(v => ({ ...v, country: e.target.value }))}
                              placeholder="Chile" className={iCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setAddingVisit(false); setNewVisit({ from: '', to: '', city: '', country: '' }) }}
                            className="flex-1 py-2 rounded-lg text-xs"
                            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
                            Cancelar
                          </button>
                          <button type="button"
                            disabled={!newVisit.from || !newVisit.to || !newVisit.city.trim() || !newVisit.country.trim()}
                            onClick={() => {
                              setVisits(prev => [...prev, newVisit])
                              setNewVisit({ from: '', to: '', city: '', country: '' })
                              setAddingVisit(false)
                            }}
                            className="flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                            style={{ background: '#efff42', color: '#000' }}>
                            Agregar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setAddingVisit(true)}
                        className="w-full py-2.5 rounded-xl text-xs transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                        + Agregar fecha
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Entrevista */}
              <div>
                <button
                  type="button"
                  onClick={() => setInterviewOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: interviewOpen
                      ? 'linear-gradient(135deg, rgba(239,255,66,0.16), rgba(239,255,66,0.04))'
                      : 'linear-gradient(135deg, rgba(239,255,66,0.08), rgba(239,255,66,0.015))',
                    border: `1px solid rgba(239,255,66,${interviewOpen ? 0.25 : 0.14})`,
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: interviewOpen ? '#efff42' : 'rgba(239,255,66,0.6)' }}>Tu historia — opcional</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{interviewOpen ? '▲' : '▼'}</span>
                </button>

                {interviewOpen && (
                  <div className="mt-4">
                    <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                      Respondé las que quieras. Aparecen en tu perfil para que la gente te conozca.
                    </p>
                    <div className="flex flex-col gap-4">
                      {INTERVIEW_QUESTIONS.map(q => (
                        <div key={q.key}>
                          <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{q.label}</p>
                          <textarea
                            value={interview[q.key] || ''}
                            onChange={e => {
                              if (e.target.value.length <= 300)
                                setInterview(prev => ({ ...prev, [q.key]: e.target.value }))
                            }}
                            rows={2}
                            placeholder="Respuesta opcional..."
                            className={iCls}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', resize: 'none', lineHeight: 1.6 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {saveError && <p className="text-xs" style={{ color: '#f87171' }}>{saveError}</p>}

              <button onClick={save} disabled={saving}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ background: '#efff42', color: '#000' }}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>

              {/* Cambiar clave */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Clave de edición</p>
                {newKey === null ? (
                  <button onClick={() => setNewKey(genKey())}
                    className="text-xs px-4 py-2 rounded-lg transition-all"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}>
                    Cambiar clave
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-lg p-3" style={{ background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.2)' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#efff42' }}>⚠ Guardá esta clave antes de confirmar</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>Sin ella no vas a poder editar ni eliminar tu perfil.</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 py-2.5 px-4 rounded-lg text-center font-bold font-mono tracking-widest"
                        style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.25)', color: '#efff42', fontSize: 20, letterSpacing: '0.15em' }}>
                        {newKey}
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(newKey); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000) }}
                        className="px-4 rounded-lg text-xs font-bold shrink-0 transition-all"
                        style={{ background: keyCopied ? 'rgba(74,222,128,0.15)' : 'rgba(239,255,66,0.1)', border: `1px solid ${keyCopied ? 'rgba(74,222,128,0.4)' : 'rgba(239,255,66,0.3)'}`, color: keyCopied ? '#4ade80' : '#efff42' }}>
                        {keyCopied ? '✓' : 'copiar'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setNewKey(null); setKeyCopied(false) }}
                        className="flex-1 py-2 rounded-lg text-xs"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
                        Cancelar
                      </button>
                      <button onClick={saveNewKey} disabled={savingNewKey}
                        className="flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                        style={{ background: '#efff42', color: '#000' }}>
                        {savingNewKey ? '...' : 'Confirmar cambio'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Eliminar perfil */}
              {!deleteConfirm ? (
                <button onClick={() => setDeleteConfirm(true)}
                  className="w-full py-2.5 rounded-xl text-xs transition-all mt-1"
                  style={{ border: '1px solid rgba(255,80,80,0.18)', color: 'rgba(255,100,100,0.45)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,80,80,0.4)'; e.currentTarget.style.color = 'rgba(255,100,100,0.8)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,80,80,0.18)'; e.currentTarget.style.color = 'rgba(255,100,100,0.45)' }}>
                  Eliminar perfil
                </button>
              ) : (
                <div className="rounded-xl p-4 mt-1" style={{ background: 'rgba(255,60,60,0.06)', border: '1px solid rgba(255,80,80,0.25)' }}>
                  <p className="text-sm font-bold mb-1" style={{ color: '#f87171' }}>¿Eliminar tu perfil?</p>
                  <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Esta acción no se puede deshacer.</p>
                  {deleteError && <p className="text-xs mb-2" style={{ color: '#f87171' }}>{deleteError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => { setDeleteConfirm(false); setDeleteError('') }}
                      className="flex-1 py-2 rounded-lg text-xs font-bold"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                      Cancelar
                    </button>
                    <button onClick={deleteProfile} disabled={deleting}
                      className="flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                      style={{ background: 'rgba(255,60,60,0.8)', color: '#fff' }}>
                      {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-center gap-4 pt-2 pb-1">
            <a href="/terminos" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em', textDecoration: 'none' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.2)' }}>
              Términos y condiciones
            </a>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)' }}>·</span>
            <a href="/privacidad" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em', textDecoration: 'none' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.2)' }}>
              Política de privacidad
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
      {children}
    </div>
  )
}
