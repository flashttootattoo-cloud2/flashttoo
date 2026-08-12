'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/contexts/TranslationContext'

const iCls = 'w-full py-2.5 px-4 text-sm text-white outline-none rounded-lg'
const iStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }

export default function ActivarEstudio() {
  const { t, language, setLanguage, languages } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuLangOpen, setMenuLangOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const lang = new URLSearchParams(window.location.search).get('lang')
    if (lang) setLanguage(lang)
  }, [setLanguage])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false); setMenuLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const [step, setStep] = useState<'key' | 'form' | 'done'>('key')
  const [key, setKey] = useState('')
  const [keyError, setKeyError] = useState('')
  const [checking, setChecking] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [instagram, setInstagram] = useState('')

  const [form, setForm] = useState({ name: '', city: '', country: '', description: '', whatsapp: '', website: '' })
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [terms, setTerms] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)


  const verifyKey = async () => {
    if (!key.trim()) return
    setChecking(true); setKeyError('')
    const r = await fetch(`/api/estudios/activar?key=${key.trim().toUpperCase()}`)
    const d = await r.json()
    setChecking(false)
    if (!r.ok) { setKeyError(t('estudio_activacion', 'key_error', 'Clave incorrecta. Verificá que la copiaste bien.')); return }
    setInstagram(d.studio.instagram || '')
    setIsEdit(!!d.studio.visible)
    setForm({
      name: d.studio.name && d.studio.name !== d.studio.instagram ? d.studio.name : '',
      city: d.studio.city || '',
      country: d.studio.country || '',
      description: d.studio.description || '',
      whatsapp: d.studio.whatsapp || '',
      website: d.studio.website || '',
    })
    if (d.studio.logo_url) setLogoPreview(d.studio.logo_url)
    setStep('form')
  }

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    const img = new window.Image()
    img.onload = () => {
      const MAX = 600; let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => { if (blob) setLogo(new File([blob], 'logo.webp', { type: 'image/webp' })) }, 'image/webp', 0.85)
    }
    img.src = URL.createObjectURL(file)
  }

  const save = async () => {
    if (!isEdit && !terms) { setSaveError(t('estudio_activacion', 'error_terms', 'Debés aceptar los términos y la política de privacidad.')); return }
    if (!form.name.trim()) { setSaveError(t('estudio_activacion', 'error_name', 'El nombre del estudio es obligatorio.')); return }
    setSaving(true); setSaveError(''); setSaved(false)
    try {
      let logo_url: string | null = null
      if (logo) {
        const fd = new FormData()
        fd.append('file', logo)
        fd.append('path', `studio-logos/${Date.now()}.webp`)
        const r = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!r.ok) throw new Error(t('estudio_activacion', 'error_logo_upload', 'Error al subir el logo'))
        logo_url = (await r.json()).url
      }
      const res = await fetch('/api/estudios/activar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim().toUpperCase(), ...form, logo_url, terms: isEdit ? true : terms }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      if (isEdit) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
      else { setStep('done') }
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : t('estudio_activacion', 'error_save', 'Error al guardar'))
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#000', color: '#fff' }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 26 }} />
        </Link>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => { setMenuOpen(v => !v); setMenuLangOpen(false) }}
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 36, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 rounded-xl z-50"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.8)', minWidth: 180, overflow: 'hidden' }}>
              {languages.length > 1 && (
                <>
                  <button
                    onClick={() => setMenuLangOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-left"
                    style={{ color: 'rgba(255,255,255,0.8)' }}>
                    <span>{t('inicio', 'menu_language', 'Idioma')}</span>
                    <span style={{ fontSize: 9, opacity: 0.45 }}>{menuLangOpen ? '▲' : '▼'}</span>
                  </button>
                  {menuLangOpen && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {languages.map(l => (
                        <button key={l.code}
                          onClick={() => { setLanguage(l.code); setMenuOpen(false); setMenuLangOpen(false) }}
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
              <button
                onClick={() => { setShowReport(true); setMenuOpen(false) }}
                className="w-full flex items-center px-4 py-3 text-sm text-left"
                style={{ color: 'rgba(255,255,255,0.8)' }}>
                {t('inicio', 'menu_report', 'Reportar')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm flex flex-col gap-6">

          {step === 'key' && (
            <>
              <div>
                <p className="text-xl font-bold text-white mb-1">{t('estudio_activacion', 'title_key', 'Perfil de estudio')}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  {t('estudio_activacion', 'subtitle_key', 'Ingresá tu clave de 10 caracteres para activar o editar tu perfil.')}
                </p>
              </div>
              <div>
                <input
                  autoFocus
                  value={key}
                  onChange={e => { setKey(e.target.value.toUpperCase()); setKeyError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') verifyKey() }}
                  placeholder="XXXXXXXXXX"
                  className={iCls}
                  style={{ ...iStyle, letterSpacing: '0.2em', textAlign: 'center', fontSize: 20, fontWeight: 700, border: `1px solid ${keyError ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}` }}
                />
                {keyError && <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>{keyError}</p>}
              </div>
              <button onClick={verifyKey} disabled={!key.trim() || checking}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ background: '#efff42', color: '#000' }}>
                {checking ? t('estudio_activacion', 'btn_checking', 'Verificando...') : t('estudio_activacion', 'btn_continue', 'Continuar →')}
              </button>
            </>
          )}

          {step === 'form' && (
            <>
              <div>
                <p className="text-xl font-bold text-white mb-1">
                  {isEdit ? t('estudio_activacion', 'form_title_edit', 'Editar perfil') : t('estudio_activacion', 'form_title_new', 'Completá tu perfil')}
                </p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  {isEdit ? t('estudio_activacion', 'form_subtitle_edit', 'Editá los datos de tu estudio y guardá los cambios.') : t('estudio_activacion', 'form_subtitle_new', 'Al guardar tu estudio quedará visible en flashttoo.')}
                </p>
              </div>

              {/* Instagram — fijo, no editable */}
              <div>
                <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('estudio_activacion', 'label_instagram', 'Instagram')}
                </p>
                <input readOnly value={instagram ? `@${instagram}` : ''}
                  className={iCls}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', cursor: 'default' }} />
              </div>

              {/* Logo */}
              <label className="cursor-pointer block">
                <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('estudio_activacion', 'label_logo', 'Logo')}
                </p>
                <div className="rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ height: 120, background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                  {logoPreview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={logoPreview} alt="" style={{ maxHeight: 110, maxWidth: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>{t('estudio_activacion', 'logo_placeholder', 'Subir logo')}</span>
                  }
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </label>

              {/* Nombre */}
              <div>
                <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('estudio_activacion', 'label_name', 'Nombre del estudio *')}
                </p>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t('estudio_activacion', 'name_placeholder', 'Ej: Black Needle Studio')} className={iCls} style={iStyle} />
              </div>

              {/* Ciudad / País */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {t('estudio_activacion', 'label_city', 'Ciudad')}
                  </p>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder={t('estudio_activacion', 'city_placeholder', 'Buenos Aires')} className={iCls} style={iStyle} />
                </div>
                <div>
                  <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {t('estudio_activacion', 'label_country', 'País')}
                  </p>
                  <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    placeholder={t('estudio_activacion', 'country_placeholder', 'Argentina')} className={iCls} style={iStyle} />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('estudio_activacion', 'label_description', 'Descripción')}
                </p>
                <textarea value={form.description} rows={3}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t('estudio_activacion', 'description_placeholder', 'Contá algo sobre tu estudio...')}
                  className={iCls} style={{ ...iStyle, resize: 'none', lineHeight: 1.6 }} />
              </div>

              {/* WhatsApp */}
              <div>
                <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('estudio_activacion', 'label_whatsapp', 'WhatsApp')}
                </p>
                <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+54 9 11 1234 5678" className={iCls} style={iStyle} />
              </div>

              {/* Web */}
              <div>
                <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('estudio_activacion', 'label_website', 'Sitio web')}
                </p>
                <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://..." className={iCls} style={iStyle} />
              </div>

              {/* T&C solo en primer acceso */}
              {!isEdit && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)}
                    className="mt-0.5 shrink-0" style={{ accentColor: '#efff42', width: 16, height: 16 }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                    {t('estudio_activacion', 'terms_prefix', 'Acepto los')}{' '}
                    <Link href="/terminos" target="_blank" style={{ color: '#efff42', textDecoration: 'underline' }}>
                      {t('estudio_activacion', 'terms_link1', 'términos y condiciones')}
                    </Link>
                    {' '}{t('estudio_activacion', 'terms_and', 'y la')}{' '}
                    <Link href="/privacidad" target="_blank" style={{ color: '#efff42', textDecoration: 'underline' }}>
                      {t('estudio_activacion', 'terms_link2', 'política de privacidad')}
                    </Link>
                    {' '}{t('estudio_activacion', 'terms_suffix', 'de flashttoo.')}
                  </p>
                </label>
              )}

              {saveError && <p className="text-xs" style={{ color: '#f87171' }}>{saveError}</p>}
              {saved && <p className="text-xs font-bold" style={{ color: '#4ade80' }}>{t('estudio_activacion', 'saved_msg', '✓ Cambios guardados')}</p>}

              <button onClick={save} disabled={saving || (!isEdit && !terms) || !form.name.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ background: '#efff42', color: '#000' }}>
                {saving
                  ? t('estudio_activacion', 'btn_saving', 'Guardando...')
                  : isEdit
                    ? t('estudio_activacion', 'btn_save', 'Guardar cambios')
                    : t('estudio_activacion', 'btn_activate', 'Activar perfil →')}
              </button>
            </>
          )}

          {step === 'done' && (
            <div className="text-center flex flex-col items-center gap-5">
              {logoPreview
                ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt=""
                    style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }} />
                ) : (
                  <div style={{ width: 96, height: 96, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Logoprincipal.svg" alt="" style={{ height: 28, opacity: 0.25 }} />
                  </div>
                )
              }
              <div>
                <p className="text-xl font-bold text-white mb-2">{t('estudio_activacion', 'done_title', '¡Tu estudio está activo!')}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  {t('estudio_activacion', 'done_msg', 'Ya aparecés en flashttoo. Podés editar tu perfil en cualquier momento volviendo aquí con tu clave.')}
                </p>
              </div>
              <Link href="/"
                className="w-full py-3 rounded-xl font-bold text-sm text-center"
                style={{ background: '#efff42', color: '#000', textDecoration: 'none', display: 'block' }}>
                {t('estudio_activacion', 'done_btn', 'Ver flashttoo →')}
              </Link>
            </div>
          )}

        </div>
      </div>

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
    </div>
  )
}
