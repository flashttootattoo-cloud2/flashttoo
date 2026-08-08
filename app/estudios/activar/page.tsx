'use client'

import { useState } from 'react'
import Link from 'next/link'

const iCls = 'w-full py-2.5 px-4 text-sm text-white outline-none rounded-lg'
const iStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }

export default function ActivarEstudio() {
  const [step, setStep] = useState<'key' | 'form' | 'done'>('key')
  const [key, setKey] = useState('')
  const [keyError, setKeyError] = useState('')
  const [checking, setChecking] = useState(false)

  const [form, setForm] = useState({ name: '', city: '', country: '', description: '', whatsapp: '', website: '' })
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [terms, setTerms] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [studioId, setStudioId] = useState('')

  const verifyKey = async () => {
    if (!key.trim()) return
    setChecking(true); setKeyError('')
    const r = await fetch(`/api/estudios/activar?key=${key.trim().toUpperCase()}`)
    const d = await r.json()
    setChecking(false)
    if (!r.ok) { setKeyError('Clave incorrecta. Verificá que la copiaste bien.'); return }
    setStudioId(d.studio.id)
    setForm({
      name: d.studio.name && d.studio.name !== d.studio.instagram ? d.studio.name : '',
      city: d.studio.city || '',
      country: d.studio.country || '',
      description: d.studio.description || '',
      whatsapp: d.studio.whatsapp || '',
      website: d.studio.website || '',
    })
    if (d.studio.logo_url) setLogoPreview(d.studio.logo_url)
    if (d.studio.visible) { setStep('done'); return }
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
    if (!terms) { setSaveError('Debés aceptar los términos y la política de privacidad.'); return }
    if (!form.name.trim()) { setSaveError('El nombre del estudio es obligatorio.'); return }
    setSaving(true); setSaveError('')
    try {
      let logo_url: string | null = null
      if (logo) {
        const fd = new FormData()
        fd.append('file', logo)
        fd.append('path', `studio-logos/${Date.now()}.webp`)
        const r = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!r.ok) throw new Error('Error al subir el logo')
        logo_url = (await r.json()).url
      }
      const res = await fetch('/api/estudios/activar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim().toUpperCase(), ...form, logo_url, terms }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setStep('done')
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#000', color: '#fff' }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/" style={{ fontSize: 18, fontWeight: 900, color: '#efff42', letterSpacing: '-0.02em', textDecoration: 'none' }}>
          flashttoo
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm flex flex-col gap-6">

          {step === 'key' && (
            <>
              <div>
                <p className="text-xl font-bold text-white mb-1">Activar perfil de estudio</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Ingresá la clave de 10 caracteres que te enviamos para activar y completar tu perfil.
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
                {checking ? 'Verificando...' : 'Continuar →'}
              </button>
            </>
          )}

          {step === 'form' && (
            <>
              <div>
                <p className="text-xl font-bold text-white mb-1">Completá tu perfil</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Al guardar tu estudio quedará visible en flashttoo.
                </p>
              </div>

              {/* Logo */}
              <label className="cursor-pointer block">
                <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Logo</p>
                <div className="rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ height: 120, background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="" style={{ maxHeight: 110, maxWidth: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>Subir logo</span>
                  }
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </label>

              {/* Nombre */}
              <div>
                <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Nombre del estudio *</p>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Black Needle Studio" className={iCls} style={iStyle} />
              </div>

              {/* Ciudad / País */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Ciudad</p>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Buenos Aires" className={iCls} style={iStyle} />
                </div>
                <div>
                  <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>País</p>
                  <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    placeholder="Argentina" className={iCls} style={iStyle} />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Descripción</p>
                <textarea value={form.description} rows={3}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Contá algo sobre tu estudio..."
                  className={iCls} style={{ ...iStyle, resize: 'none', lineHeight: 1.6 }} />
              </div>

              {/* WhatsApp */}
              <div>
                <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>WhatsApp</p>
                <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+54 9 11 1234 5678" className={iCls} style={iStyle} />
              </div>

              {/* Web */}
              <div>
                <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Sitio web</p>
                <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://..." className={iCls} style={iStyle} />
              </div>

              {/* T&C */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)}
                  className="mt-0.5 shrink-0" style={{ accentColor: '#efff42', width: 16, height: 16 }} />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                  Acepto los{' '}
                  <Link href="/terminos" target="_blank" style={{ color: '#efff42', textDecoration: 'underline' }}>términos y condiciones</Link>
                  {' '}y la{' '}
                  <Link href="/privacidad" target="_blank" style={{ color: '#efff42', textDecoration: 'underline' }}>política de privacidad</Link>
                  {' '}de flashttoo.
                </p>
              </label>

              {saveError && <p className="text-xs" style={{ color: '#f87171' }}>{saveError}</p>}

              <button onClick={save} disabled={saving || !terms || !form.name.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ background: '#efff42', color: '#000' }}>
                {saving ? 'Guardando...' : 'Activar perfil →'}
              </button>
            </>
          )}

          {step === 'done' && (
            <div className="text-center flex flex-col gap-5">
              <p className="text-4xl">🎉</p>
              <div>
                <p className="text-xl font-bold text-white mb-2">¡Tu estudio está activo!</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Ya aparecés en flashttoo. Podés volver a editar tu perfil en cualquier momento usando la misma clave.
                </p>
              </div>
              <Link href="/"
                className="w-full py-3 rounded-xl font-bold text-sm text-center"
                style={{ background: '#efff42', color: '#000', textDecoration: 'none', display: 'block' }}>
                Ver flashttoo →
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
