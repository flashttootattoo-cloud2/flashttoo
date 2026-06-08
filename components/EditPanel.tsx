'use client'

import { useState, useEffect } from 'react'
import { type Artist } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

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
  const [photo, setPhoto]     = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState('')
  const [stylesOpen, setStylesOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [deleteError, setDeleteError] = useState('')

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
    else { setKeyError('Clave incorrecta') }
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

  const save = async () => {
    setSaving(true); setSaveError('')
    try {
      let photo_url = artist.photo_url
      if (photo) {
        const path = `${Date.now()}.webp`
        const { error: upErr } = await supabase.storage.from('artist-photos').upload(path, photo, { contentType: 'image/webp' })
        if (upErr) throw upErr
        const { data } = supabase.storage.from('artist-photos').getPublicUrl(path)
        photo_url = data.publicUrl
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

              {saveError && <p className="text-xs" style={{ color: '#f87171' }}>{saveError}</p>}

              <button onClick={save} disabled={saving}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ background: '#efff42', color: '#000' }}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>

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
