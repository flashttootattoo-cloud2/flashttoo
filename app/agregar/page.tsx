'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { INTERVIEW_QUESTIONS } from '@/lib/interview'
import { useTranslation } from '@/contexts/TranslationContext'

const DEFAULT_STYLES = [
  'Tradicional','Realismo','Blackwork','Acuarela','Geométrico',
  'Japonés','Neo Tradicional','Minimalista','Old School','Dotwork',
  'Fineline','Lettering','Tribal','Biomecánico','Cover-up','Ornamental','Otros',
]

function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const VERIFY_WORDS = [
  'paloma','tigre','luna','sol','flor','río','mar','viento','fuego','piedra',
  'nube','rayo','brisa','selva','arena','perla','coral','cedro','puma','cóndor',
  'alerce','cactus','llama','toro','zorro','nutria','jaguar','ñandú','carpa','garza',
  'álamo','roble','sauce','pino','olivo','menta','tomillo','azahar','canela','vainilla',
  'ámbar','topacio','jaspe','cuarzo','ónice','rubí','jade','ágata','lapislázuli','malaquita',
]

function genVerifyWord() {
  return VERIFY_WORDS[Math.floor(Math.random() * VERIFY_WORDS.length)]
}

export default function AgregarPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    name: '', city: '', country: '', instagram: '', whatsapp: '', email: '', bio: '',
  })
  const BIO_MAX = 280
  const [editKey, setEditKey]   = useState(() => genKey())
  const [keyCopied, setKeyCopied] = useState(false)
  const [allStyles, setAllStyles]   = useState<string[]>(DEFAULT_STYLES)
  const [styles, setStyles]         = useState<string[]>([])
  const [stylesOpen, setStylesOpen] = useState(false)
  const stylesRef = useRef<HTMLDivElement>(null)
  const [igStatus, setIgStatus]     = useState<'idle'|'checking'|'ok'|'taken'>('idle')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [verifyWord] = useState(() => genVerifyWord())
  const [verifyIG, setVerifyIG] = useState('')
  const [verifyWA, setVerifyWA] = useState('')
  const igTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    fetch('/api/features').then(r => r.json()).then(d => {
      if (d.verification_instagram) setVerifyIG(d.verification_instagram)
      if (d.verification_whatsapp) setVerifyWA(d.verification_whatsapp)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handle = form.instagram.trim().replace('@', '')
    if (!handle) { setIgStatus('idle'); return }
    setIgStatus('checking')
    clearTimeout(igTimer.current)
    igTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('artists')
        .select('id')
        .or(`instagram.ilike.${handle},instagram.ilike.@${handle}`)
        .limit(1)
      setIgStatus(data && data.length > 0 ? 'taken' : 'ok')
    }, 600)
    return () => clearTimeout(igTimer.current)
  }, [form.instagram])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (stylesRef.current && !stylesRef.current.contains(e.target as Node)) setStylesOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const [visits, setVisits]       = useState<{ from: string; to: string; city: string; country: string }[]>([])
  const [visitOpen, setVisitOpen] = useState(false)
  const [addingVisit, setAddingVisit] = useState(false)
  const [newVisit, setNewVisit]   = useState({ from: '', to: '', city: '', country: '' })
  const [moderation, setModeration] = useState(false)
  const [photo, setPhoto]       = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [interview, setInterview] = useState<Record<string, string>>({})
  const [interviewOpen, setInterviewOpen] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState<false | 'active' | 'pending'>(false)
  const [error, setError]       = useState('')
  const [galleryEnabled, setGalleryEnabled] = useState(false)
  const [galleryFiles, setGalleryFiles]     = useState<(File | null)[]>([null, null, null])
  const [galleryPreviews, setGalleryPreviews] = useState<(string | null)[]>([null, null, null])

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setModeration(!!d.moderation)).catch(() => {})
    fetch('/api/styles').then(r => r.json()).then(d => { if (d.styles?.length) setAllStyles(d.styles) }).catch(() => {})
    fetch('/api/features').then(r => r.json()).then(d => setGalleryEnabled(!!d.artist_gallery)).catch(() => {})
  }, [])

  const toggleStyle = (s: string) =>
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))

    const img = new window.Image()
    img.onload = () => {
      const MAX = 900
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => { if (blob) setPhoto(new File([blob], 'photo.webp', { type: 'image/webp' })) },
        'image/webp', 0.82
      )
    }
    img.src = URL.createObjectURL(file)
  }

  const handleGalleryPhoto = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setGalleryPreviews(prev => { const next = [...prev]; next[index] = previewUrl; return next })
    const img = new window.Image()
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (blob) {
          const f = new File([blob], `gallery-${index}.webp`, { type: 'image/webp' })
          setGalleryFiles(prev => { const next = [...prev]; next[index] = f; return next })
        }
      }, 'image/webp', 0.82)
    }
    img.src = previewUrl
  }

  const clearGallerySlot = (index: number) => {
    setGalleryFiles(prev => { const next = [...prev]; next[index] = null; return next })
    setGalleryPreviews(prev => { const next = [...prev]; next[index] = null; return next })
  }

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setError('')
    if (!photo) { setError(t('agregar', 'error_photo', 'Agregá una foto')); return }
    if (styles.length === 0) { setError(t('agregar', 'error_styles', 'Elegí al menos un estilo')); return }
    if (!form.instagram.trim()) { setError(t('agregar', 'error_instagram', 'Ingresá tu usuario de Instagram')); return }

    setLoading(true)
    try {
      // Subir foto
      const ext  = photo.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      let photoPublicUrl: string
      try {
        const fd = new FormData(); fd.append('file', photo); fd.append('path', path)
        const r = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!r.ok) throw new Error((await r.json()).error || 'Error al subir foto')
        photoPublicUrl = (await r.json()).url
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al subir foto')
        setLoading(false)
        return
      }

      if (igStatus === 'taken') { setLoading(false); return }

      // Subir fotos de galería
      const galleryUrls: (string | null)[] = [null, null, null]
      for (let i = 0; i < 3; i++) {
        const gf = galleryFiles[i]
        if (gf) {
          try {
            const gPath = `gallery-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.webp`
            const gfd = new FormData(); gfd.append('file', gf); gfd.append('path', gPath)
            const gr = await fetch('/api/upload', { method: 'POST', body: gfd })
            if (gr.ok) galleryUrls[i] = (await gr.json()).url
          } catch { /* continuar sin galería */ }
        }
      }

      // Insertar artista
      const { error: insErr } = await supabase.from('artists').insert({
        name:      form.name.trim(),
        city:      form.city.trim(),
        country:   form.country.trim(),
        styles,
        photo_url: photoPublicUrl,
        instagram: form.instagram.trim() || null,
        whatsapp:  form.whatsapp.trim()  || null,
        email:     form.email.trim()     || null,
        bio:       form.bio.trim()       || null,
        edit_key:  editKey.trim().toUpperCase(),
        status:    moderation ? 'pending' : 'active',
        verification_word: moderation ? verifyWord : null,
        interview: Object.fromEntries(Object.entries(interview).filter(([, v]) => v.trim())),
        visits,
        gallery_photo_1: galleryUrls[0],
        gallery_photo_2: galleryUrls[1],
        gallery_photo_3: galleryUrls[2],
      })
      if (insErr) {
        setError(`Error al guardar: ${insErr.message}`)
        setLoading(false)
        return
      }

      setDone(moderation ? 'pending' : 'active')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setError(`Error inesperado: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  if (done === 'pending') return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm w-full">
        <h2 className="text-xl font-bold mb-2">{t('agregar', 'done_pending_title', 'Perfil en revisión')}</h2>
        <p className="text-white/50 text-sm mb-6">{t('agregar', 'done_pending_msg1', 'Tu perfil fue enviado y está esperando aprobación.')}</p>

        {/* Palabra de verificación */}
        <div className="rounded-2xl p-5 mb-6 text-left" style={{ background: 'rgba(239,255,66,0.06)', border: '1px solid rgba(239,255,66,0.2)' }}>
          <p className="text-xs font-bold mb-1" style={{ color: 'rgba(239,255,66,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Un paso más para activar tu perfil
          </p>
          <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Envianos esta palabra por DM para confirmar que sos vos:
          </p>
          <p className="text-3xl font-black text-center tracking-widest mb-4" style={{ color: '#efff42', letterSpacing: '0.2em' }}>
            {verifyWord}
          </p>
          <div className="flex flex-col gap-2">
            {verifyIG && (
              <a href={`https://ig.me/m/${verifyIG.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', textDecoration: 'none' }}>
                <span>📩</span> Enviar por Instagram DM
              </a>
            )}
            {verifyWA && (
              <a href={`https://wa.me/${verifyWA.replace(/\D/g, '')}?text=${encodeURIComponent(verifyWord)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(37,211,102,0.12)', color: '#25d366', textDecoration: 'none' }}>
                <span>💬</span> Enviar por WhatsApp
              </a>
            )}
          </div>
        </div>

        <Link href="/" className="text-sm text-[#efff42] underline underline-offset-4">{t('agregar', 'done_pending_link', 'Volver al inicio')}</Link>
      </div>
    </main>
  )

  if (done === 'active') return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h2 className="text-xl font-bold mb-2">{t('agregar', 'done_active_title', 'Listo.')}</h2>
        <p className="text-white/50 text-sm mb-6">{t('agregar', 'done_active_msg', 'Tu perfil ya está en el buscador.')}</p>
        <Link href="/" className="text-sm text-[#efff42] underline underline-offset-4">{t('agregar', 'done_active_link', 'Ver buscador')}</Link>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">{t('agregar', 'back', '← volver')}</Link>
          <h1 className="text-xl font-bold mt-3">{t('agregar', 'add_title', 'Agregáte como tatuador/a')}</h1>
          <p className="text-sm text-white/40 mt-1">{t('agregar', 'add_subtitle', 'Completá tu perfil para aparecer en el buscador.')}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Foto */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">{t('agregar', 'photo_label', 'Foto')} *</label>
            <label className="relative cursor-pointer block">
              {preview ? (
                <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white">{t('agregar', 'photo_change', 'cambiar foto')}</span>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 flex flex-col items-center justify-center gap-2 transition-colors">
                  <span className="text-xs text-white/30">{t('agregar', 'photo_upload', 'subir foto')}</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>

          {/* Nombre */}
          <Field label={`${t('agregar', 'name_label', 'Nombre / Apodo')} *`}>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={t('agregar', 'name_placeholder', 'Tu nombre o nombre del estudio')} className={inputCls} />
          </Field>

          {/* Ciudad / País */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t('agregar', 'city_label', 'Ciudad')} *`}>
              <input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="Buenos Aires" className={inputCls} />
            </Field>
            <Field label={`${t('agregar', 'country_label', 'País')} *`}>
              <input required value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                placeholder="Argentina" className={inputCls} />
            </Field>
          </div>

          {/* Estilos — dropdown */}
          <div ref={stylesRef} className="relative">
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-1.5">{t('agregar', 'styles_label', 'Estilos')} *</label>

            {/* Trigger */}
            <button type="button" onClick={() => setStylesOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${stylesOpen ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
              <span style={{ color: styles.length ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                {styles.length === 0 ? t('agregar', 'styles_placeholder', 'Seleccioná estilos...') : styles.join(', ')}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{stylesOpen ? '▲' : '▼'}</span>
            </button>

            {/* Panel desplegable */}
            {stylesOpen && (
              <div className="rounded-xl mt-1 overflow-y-auto"
                style={{
                  background: '#141414',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
                  maxHeight: 280,
                }}>
                <div className="grid grid-cols-2">
                  {allStyles.map((s: string) => {
                    const on = styles.includes(s)
                    return (
                      <button key={s} type="button" onClick={() => toggleStyle(s)}
                        className="flex items-center justify-between px-4 py-3 text-sm transition-all"
                        style={{
                          background: on ? 'rgba(239,255,66,0.1)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          borderRight: '1px solid rgba(255,255,255,0.04)',
                        }}
                        onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}>
                        <span style={{ color: on ? '#efff42' : 'rgba(255,255,255,0.55)', fontWeight: on ? 700 : 400 }}>{s}</span>
                        <span style={{ color: '#efff42', fontSize: 14, opacity: on ? 1 : 0 }}>✓</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tags seleccionados */}
            {styles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {styles.map(s => (
                  <span key={s} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', color: '#efff42' }}>
                    {s}
                    <button type="button" onClick={() => toggleStyle(s)}
                      style={{ color: 'rgba(239,255,66,0.5)', lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Contacto */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/40 uppercase tracking-widest">{t('agregar', 'instagram_label', 'Instagram')} *</label>
              {igStatus === 'checking' && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('agregar', 'ig_checking', 'verificando...')}</span>}
              {igStatus === 'ok'       && <span className="text-xs font-bold" style={{ color: '#4ade80' }}>{t('agregar', 'ig_available', '✓ disponible')}</span>}
              {igStatus === 'taken'    && <span className="text-xs font-bold" style={{ color: '#f87171' }}>{t('agregar', 'ig_taken', '✗ ya registrado')}</span>}
            </div>
            <input
              value={form.instagram}
              onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
              placeholder={t('agregar', 'instagram_placeholder', '@usuario')}
              className={inputCls}
              style={{ borderColor: igStatus === 'taken' ? 'rgba(248,113,113,0.5)' : igStatus === 'ok' ? 'rgba(74,222,128,0.4)' : undefined }}
            />
            {igStatus === 'taken' && (
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(248,113,113,0.7)', marginTop: 6 }}>
                {t('agregar', 'ig_taken_msg', 'Este Instagram ya tiene un perfil en Flashttoo. Si es tuyo y perdiste la clave, escribinos.')}
              </p>
            )}
          </div>
          <Field label={t('agregar', 'whatsapp_label', 'WhatsApp')}>
            <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
              placeholder="+54 9 11 1234 5678" className={inputCls} />
          </Field>
          <Field label={t('agregar', 'email_label', 'Email')}>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder={t('agregar', 'email_placeholder', 'hola@ejemplo.com')} className={inputCls} />
          </Field>

          {/* Bio con contador */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/40 uppercase tracking-widest">{t('agregar', 'bio_label', 'Biografía')}</label>
              <span className="text-xs tabular-nums"
                style={{ color: form.bio.length >= BIO_MAX ? '#f87171' : form.bio.length >= BIO_MAX * 0.85 ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}>
                {form.bio.length}/{BIO_MAX}
              </span>
            </div>
            <textarea
              value={form.bio}
              onChange={e => { if (e.target.value.length <= BIO_MAX) setForm(f => ({ ...f, bio: e.target.value })) }}
              placeholder={t('agregar', 'bio_placeholder', 'Contá algo sobre vos, tu estilo, tu trabajo...')}
              rows={3}
              className={inputCls}
              style={{ resize: 'none', lineHeight: 1.6 }}
            />
          </div>

          {/* Galería de diseños */}
          {galleryEnabled && (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">{t('agregar', 'gallery_label', 'Galería de diseños — opcional')}</label>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
                {t('agregar', 'gallery_desc', 'Hasta 3 fotos de tus mejores trabajos.')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {galleryPreviews[i] ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={galleryPreviews[i]!} alt={`galería ${i + 1}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => clearGallerySlot(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.8)' }}>×</button>
                        <label className="absolute inset-0 cursor-pointer flex items-end justify-center pb-1.5 opacity-0 hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.4)' }}>
                          <span className="text-xs text-white">cambiar</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleGalleryPhoto(i, e)} />
                        </label>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                        <span className="text-2xl" style={{ color: 'rgba(255,255,255,0.15)' }}>+</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleGalleryPhoto(i, e)} />
                      </label>
                    )}
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
                  {t('agregar', 'dates_title', 'Próximas fechas — ¿dónde estarás?')}
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
                  {t('agregar', 'date_expires_note', 'Las fechas se eliminan automáticamente cuando expiran.')}
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
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('agregar', 'date_from', 'Desde')}</p>
                        <input type="date" value={newVisit.from} onChange={e => setNewVisit(v => ({ ...v, from: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('agregar', 'date_to', 'Hasta')}</p>
                        <input type="date" value={newVisit.to} onChange={e => setNewVisit(v => ({ ...v, to: e.target.value }))} className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('agregar', 'date_city', 'Ciudad')}</p>
                        <input value={newVisit.city} onChange={e => setNewVisit(v => ({ ...v, city: e.target.value }))} placeholder="Santiago" className={inputCls} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('agregar', 'date_country', 'País')}</p>
                        <input value={newVisit.country} onChange={e => setNewVisit(v => ({ ...v, country: e.target.value }))} placeholder="Chile" className={inputCls} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setAddingVisit(false); setNewVisit({ from: '', to: '', city: '', country: '' }) }}
                        className="flex-1 py-2 rounded-lg text-xs"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
                        {t('agregar', 'date_cancel', 'Cancelar')}
                      </button>
                      <button type="button"
                        disabled={!newVisit.from || !newVisit.to || !newVisit.city.trim() || !newVisit.country.trim()}
                        onClick={() => { setVisits(prev => [...prev, newVisit]); setNewVisit({ from: '', to: '', city: '', country: '' }); setAddingVisit(false) }}
                        className="flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                        style={{ background: '#efff42', color: '#000' }}>
                        {t('agregar', 'date_add', 'Agregar')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAddingVisit(true)}
                    className="w-full py-2.5 rounded-xl text-xs transition-all"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                    {t('agregar', 'date_add_btn', '+ Agregar fecha')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Entrevista opcional */}
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
              <span className="text-sm font-medium" style={{ color: interviewOpen ? '#efff42' : 'rgba(239,255,66,0.6)' }}>{t('agregar', 'story_title', 'Tu historia — opcional')}</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{interviewOpen ? '▲' : '▼'}</span>
            </button>

            {interviewOpen && (
              <div className="mt-4">
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                  {t('historia', 'intro', 'Respondé las que quieras. Aparecen en tu perfil para que los clientes te conozcan mejor.')}
                </p>
                <div className="flex flex-col gap-4">
                  {INTERVIEW_QUESTIONS.map(q => (
                    <div key={q.key}>
                      <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('historia', q.key, q.label)}</p>
                      <textarea
                        value={interview[q.key] || ''}
                        onChange={e => {
                          if (e.target.value.length <= 300)
                            setInterview(prev => ({ ...prev, [q.key]: e.target.value }))
                        }}
                        rows={2}
                        placeholder={t('historia', 'placeholder', 'Respuesta opcional...')}
                        className={inputCls}
                        style={{ resize: 'none', lineHeight: 1.6 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Clave de edición */}
          <div style={{ background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.2)', borderRadius: 12, padding: '16px' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: '#efff42' }}>
                {t('agregar', 'edit_key_label', 'Clave de edición')}
              </label>
              <button type="button"
                onClick={() => setEditKey(genKey())}
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: 'rgba(239,255,66,0.5)' }}>
                {t('agregar', 'generate_key', 'generar nueva')}
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              {t('agregar', 'edit_key_desc', 'Con esta clave podés editar tu perfil después. Guardala — no se puede recuperar.')}
            </p>
            <div className="flex gap-2">
              <input
                value={editKey}
                onChange={e => setEditKey(e.target.value.toUpperCase().slice(0, 12))}
                className="flex-1 py-2.5 px-4 text-center font-bold text-lg tracking-widest rounded-lg outline-none"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', letterSpacing: '0.2em' }}
              />
              <button type="button"
                onClick={() => { navigator.clipboard.writeText(editKey); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000) }}
                className="px-4 rounded-lg text-xs font-bold transition-all"
                style={{ background: keyCopied ? 'rgba(74,222,128,0.15)' : 'rgba(239,255,66,0.1)', border: `1px solid ${keyCopied ? 'rgba(74,222,128,0.4)' : 'rgba(239,255,66,0.3)'}`, color: keyCopied ? '#4ade80' : '#efff42' }}>
                {keyCopied ? '✓' : t('agregar', 'copy', 'copiar')}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="mt-0.5 shrink-0 accent-[#efff42]"
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              {t('agregar', 'legal_prefix', 'Al registrarte aceptás nuestros')}{' '}
              <Link href="/terminos" onClick={e => e.stopPropagation()} className="underline hover:opacity-80" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {t('agregar', 'legal_terms', 'Términos y condiciones')}
              </Link>{' '}
              {t('agregar', 'legal_and', 'y')}{' '}
              <Link href="/privacidad" onClick={e => e.stopPropagation()} className="underline hover:opacity-80" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {t('agregar', 'legal_privacy', 'Política de privacidad')}
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || igStatus === 'taken' || !termsAccepted}
            className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            style={{ background: '#efff42', color: '#000' }}
          >
            {loading ? t('agregar', 'uploading', 'Subiendo...') : t('agregar', 'submit', 'Agregar al buscador')}
          </button>
        </form>
      </div>
    </main>
  )
}

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/30 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
