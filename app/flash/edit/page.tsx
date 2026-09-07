'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

type Label  = { id: string; letter: string; x: number; y: number; tattooed: boolean }
type Design = { id: string; photo_url: string; medidas: string; position: number; labels: Label[] }
type Session = { id: string; name: string; photo_url: string | null; slug: string; access_token: string; refresh_token?: string; flashbook_alias: string | null }

async function tryRefreshSession(s: Session): Promise<Session | null> {
  if (!s.refresh_token) return null
  try {
    const r = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    })
    if (!r.ok) return null
    const d = await r.json()
    const updated = { ...s, access_token: d.access_token, refresh_token: d.refresh_token }
    localStorage.setItem('flashttoo_artist_session', JSON.stringify(updated))
    return updated
  } catch { return null }
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export default function FlashbookEditPage() {
  const { t } = useTranslation()
  const [session, setSession] = useState<Session | null | 'loading'>('loading')
  const [designs, setDesigns] = useState<Design[]>([])
  const [loadingDesigns, setLoadingDesigns] = useState(false)

  // Alias
  const [alias, setAlias] = useState('')
  const [aliasInput, setAliasInput] = useState('')
  const [aliasAvailable, setAliasAvailable] = useState<boolean | null>(null)
  const [aliasChecking, setAliasChecking] = useState(false)
  const [aliasSaving, setAliasSaving] = useState(false)
  const [aliasSaved, setAliasSaved] = useState(false)
  const aliasCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // WhatsApp flashbook
  const [waInput, setWaInput] = useState('')
  const [waSaved, setWaSaved] = useState(false)
  const [waSaving, setWaSaving] = useState(false)

  // Upload
  const [uploading, setUploading] = useState(false)
  const [flashLimit, setFlashLimit] = useState(10)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Medidas per design (local edits)
  const [medidasMap, setMedidasMap] = useState<Record<string, string>>({})
  const [medidasOriginal, setMedidasOriginal] = useState<Record<string, string>>({})
  const [savingMedidas, setSavingMedidas] = useState<Record<string, boolean>>({})
  const [savingAll, setSavingAll] = useState(false)

  // Label editor
  const [labelEditing, setLabelEditing] = useState<string | null>(null)
  const [labelsDraft, setLabelsDraft]   = useState<Label[]>([])
  const [savingLabels, setSavingLabels] = useState(false)
  const imgContainerRef = useRef<HTMLDivElement | null>(null)
  const draggingLabel   = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null)

  // Collapsible sections
  const [pitchOpen, setPitchOpen] = useState(false)
  const [aliasOpen, setAliasOpen] = useState(false)
  const [waOpen, setWaOpen] = useState(false)
  const [artistSlug, setArtistSlug] = useState('')

  // Deleting
  const [deleting, setDeleting] = useState<string | null>(null)

  // Error/toast
  const [toast, setToast] = useState('')
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // Load flash limit from features
  useEffect(() => {
    fetch('/api/features').then(r => r.json()).then(d => {
      if (typeof d.flash_limit === 'number') setFlashLimit(d.flash_limit)
    }).catch(() => {})
  }, [])

  // Load session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('flashttoo_artist_session')
      if (saved) {
        const s: Session = JSON.parse(saved)
        setSession(s)
        setAlias(s.flashbook_alias ?? '')
        setAliasInput(s.flashbook_alias ?? '')
      } else {
        setSession(null)
      }
    } catch {
      setSession(null)
    }
  }, [])

  // Load designs when session is ready
  useEffect(() => {
    if (!session || session === 'loading') return
    setLoadingDesigns(true)
    fetch(`/api/flash/designs?artist_id=${session.id}&access_token=${session.access_token}`)
      .then(async r => {
        if (r.status === 401) {
          const refreshed = await tryRefreshSession(session)
          if (refreshed) { setSession(refreshed); return }
          localStorage.removeItem('flashttoo_artist_session')
          setSession(null)
          throw new Error('Sesión expirada')
        }
        const d = await r.json()
        if (!r.ok) {
          throw new Error(d.error || 'Error al cargar')
        }
        setDesigns(d.designs ?? [])
        const map: Record<string, string> = {}
        for (const des of (d.designs ?? [])) map[des.id] = des.medidas ?? ''
        setMedidasMap(map)
        setMedidasOriginal(map)
        if (d.flashbook_alias) { setAlias(d.flashbook_alias); setAliasInput(d.flashbook_alias) }
        if (d.flashbook_whatsapp) setWaInput(d.flashbook_whatsapp)
        if (d.slug) setArtistSlug(d.slug)
      })
      .catch(e => showToast(e.message || 'Error al cargar diseños'))
      .finally(() => setLoadingDesigns(false))
  }, [session])

  // Alias availability check (debounced)
  function onAliasInput(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9._-]/g, '')
    setAliasInput(clean)
    setAliasAvailable(null)
    setAliasSaved(false)
    if (aliasCheckRef.current) clearTimeout(aliasCheckRef.current)
    if (!clean || clean === alias) { setAliasAvailable(clean === alias ? true : null); return }
    setAliasChecking(true)
    aliasCheckRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/flash/alias?check=${clean}&artist_id=${(session as Session).id}`)
        const d = await r.json()
        setAliasAvailable(d.available)
      } catch {
        setAliasAvailable(null)
      } finally {
        setAliasChecking(false)
      }
    }, 500)
  }

  async function saveAlias() {
    if (!session || session === 'loading') return
    setAliasSaving(true)
    const r = await fetch('/api/flash/alias', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: session.access_token, artist_id: session.id, alias: aliasInput }),
    })
    const d = await r.json()
    setAliasSaving(false)
    if (!r.ok) { showToast(d.error || 'Error al guardar'); return }
    setAlias(d.alias)
    setAliasSaved(true)
    try {
      const saved = localStorage.getItem('flashttoo_artist_session')
      if (saved) {
        const s = JSON.parse(saved)
        s.flashbook_alias = d.alias
        localStorage.setItem('flashttoo_artist_session', JSON.stringify(s))
      }
    } catch {}
    showToast('¡Alias guardado!')
  }

  async function saveWA() {
    if (!session || session === 'loading') return
    setWaSaving(true)
    const r = await fetch('/api/flash/alias', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: session.access_token, artist_id: session.id, flashbook_whatsapp: waInput }),
    })
    setWaSaving(false)
    if (!r.ok) { showToast('Error al guardar'); return }
    setWaSaved(true)
    setTimeout(() => setWaSaved(false), 2000)
    showToast('¡WhatsApp guardado!')
  }

  async function uploadDesign(file: File) {
    if (!session || session === 'loading') return
    if (designs.length >= flashLimit) { showToast(`Límite de ${flashLimit} diseños alcanzado`); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('artist_id', session.id)
    fd.append('access_token', session.access_token)
    const r = await fetch('/api/flash/designs', { method: 'POST', body: fd })
    const d = await r.json()
    setUploading(false)
    if (!r.ok) { showToast(d.error || 'Error al subir'); return }
    setDesigns(prev => [...prev, d.design])
    setMedidasMap(prev => ({ ...prev, [d.design.id]: d.design.medidas ?? '' }))
  }

  async function saveMedidas(id: string) {
    if (!session || session === 'loading') return
    setSavingMedidas(prev => ({ ...prev, [id]: true }))
    const r = await fetch(`/api/flash/designs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: session.access_token, medidas: medidasMap[id] }),
    })
    setSavingMedidas(prev => ({ ...prev, [id]: false }))
    if (!r.ok) showToast('Error al guardar medidas')
  }

  async function saveAll() {
    if (!session || session === 'loading') return
    const changed = designs.filter(d => medidasMap[d.id] !== medidasOriginal[d.id])
    if (changed.length === 0) { showToast('Sin cambios'); return }
    setSavingAll(true)
    await Promise.all(changed.map(d =>
      fetch(`/api/flash/designs/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session.access_token, medidas: medidasMap[d.id] }),
      })
    ))
    setSavingAll(false)
    setMedidasOriginal({ ...medidasMap })
    showToast('¡Guardado!')
  }

  async function deleteDesign(id: string) {
    if (!session || session === 'loading') return
    setDeleting(id)
    const r = await fetch(`/api/flash/designs/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: session.access_token }),
    })
    setDeleting(null)
    if (!r.ok) { showToast('Error al eliminar'); return }
    setDesigns(prev => prev.filter(d => d.id !== id))
    setMedidasMap(prev => { const m = { ...prev }; delete m[id]; return m })
  }

  // Loading state
  if (session === 'loading') {
    return (
      <main style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#efff42', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    )
  }

  // Not logged in
  if (!session) {
    return (
      <main style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Iniciá sesión para editar tu Flashbook</p>
        <a href="/" style={{ color: '#efff42', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>Volver a Flashttoo →</a>
      </main>
    )
  }

  const aliasChanged = aliasInput !== alias
  const isClearingAlias = aliasInput === '' && alias !== ''
  const canSaveAlias = aliasChanged && !aliasSaving && (isClearingAlias || (aliasAvailable === true && !aliasChecking))

  // Label helpers
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  function nextLetter(labels: Label[]) {
    const used = new Set(labels.map(l => l.letter))
    for (const c of LETTERS) if (!used.has(c)) return c
    return null
  }
  function uid() { return Math.random().toString(36).slice(2, 8) }

  function openLabelEditor(designId: string) {
    const d = designs.find(x => x.id === designId)
    setLabelsDraft(d?.labels ?? [])
    setLabelEditing(designId)
  }

  async function saveLabels() {
    if (!session || session === 'loading' || !labelEditing) return
    setSavingLabels(true)
    try {
      const r = await fetch(`/api/flash/designs/${labelEditing}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: (session as Session).access_token, labels: labelsDraft }),
      })
      if (!r.ok) { showToast(t('flashbook_edit', 'label_err_save', 'Error al guardar etiquetas')); return }
      setDesigns(prev => prev.map(d => d.id === labelEditing ? { ...d, labels: labelsDraft } : d))
      setLabelEditing(null)
      showToast(t('flashbook_edit', 'label_saved_ok', 'Etiquetas guardadas ✓'))
    } catch {
      showToast(t('flashbook_edit', 'label_err', 'Error al guardar'))
    } finally {
      setSavingLabels(false)
    }
  }

  return (
    <>
    <main style={{ background: '#000', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#efff42', color: '#000', fontSize: 13, fontWeight: 700, padding: '10px 20px', borderRadius: 20, zIndex: 100, pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 20px 0' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
          ← {t('flashbook_edit', 'back_btn', 'Volver')}
        </a>
      </div>
      <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {session.photo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={session.photo_url} alt={session.name}
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#efff42', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#000' }}>
            {initialsOf(session.name)}
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{session.name}</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>{t('artist_menu', 'edit_flashbook', 'Editar Flashbook')}</p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>

        {/* Qué es el Flashbook */}
        <div style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setPitchOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px', borderRadius: 16, border: `1px solid rgba(239,255,66,${pitchOpen ? 0.25 : 0.14})`,
              background: pitchOpen ? 'linear-gradient(135deg, rgba(239,255,66,0.16), rgba(239,255,66,0.04))' : 'linear-gradient(135deg, rgba(239,255,66,0.08), rgba(239,255,66,0.015))',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 800, color: pitchOpen ? '#efff42' : 'rgba(239,255,66,0.6)' }}>{t('flashbook_edit', 'pitch_title', 'Tu catálogo privado de diseños disponibles')}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 8, flexShrink: 0 }}>{pitchOpen ? '▲' : '▼'}</span>
          </button>
          {pitchOpen && (
            <div style={{ marginTop: 8, padding: '14px 18px', background: 'rgba(239,255,66,0.04)', border: '1px solid rgba(239,255,66,0.12)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                t('flashbook_edit', 'pitch_1', 'Tenés un link único que solo vos controlás. Lo compartís por donde quieras — Instagram, WhatsApp, stories — cuando quieras.'),
                t('flashbook_edit', 'pitch_2', 'El link no aparece en tu perfil público. Para evitar que te copien tu arte, solo te lo pueden solicitar.'),
                t('flashbook_edit', 'pitch_3', 'Todos tus diseños disponibles en un solo lugar, listos para mostrar.'),
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#efff42', flexShrink: 0, marginTop: 2, minWidth: 14 }}>{i + 1} —</span>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección alias */}
        <div style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setAliasOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px', borderRadius: 16, border: `1px solid rgba(239,255,66,${aliasOpen ? 0.25 : 0.14})`,
              background: aliasOpen ? 'linear-gradient(135deg, rgba(239,255,66,0.16), rgba(239,255,66,0.04))' : 'linear-gradient(135deg, rgba(239,255,66,0.08), rgba(239,255,66,0.015))',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 800, color: aliasOpen ? '#efff42' : 'rgba(239,255,66,0.6)' }}>{t('flashbook_edit', 'link_label', 'Link del Flashbook')}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 8, flexShrink: 0 }}>{aliasOpen ? '▲' : '▼'}</span>
          </button>
          {aliasOpen && (
            <div style={{ marginTop: 8, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>flashttoo.com/flash/</span>
                <input
                  value={aliasInput}
                  onChange={e => onAliasInput(e.target.value)}
                  placeholder="mi-alias"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${aliasAvailable === false ? 'rgba(255,80,80,0.4)' : aliasAvailable === true && aliasChanged ? 'rgba(100,220,100,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none', minWidth: 0 }}
                />
                {canSaveAlias && (
                  <button
                    onClick={saveAlias}
                    disabled={aliasSaving}
                    style={{ background: '#efff42', color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                    {aliasSaving ? '...' : t('flashbook_edit', 'save_btn', 'Guardar')}
                  </button>
                )}
              </div>
              {aliasChecking && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{t('flashbook_edit', 'checking', 'Verificando...')}</p>}
              {!aliasChecking && aliasAvailable === false && <p style={{ fontSize: 11, color: 'rgba(255,100,100,0.7)', marginTop: 6 }}>{t('flashbook_edit', 'alias_taken', 'Ese alias ya está en uso')}</p>}
              {!aliasChecking && aliasAvailable === true && aliasChanged && <p style={{ fontSize: 11, color: 'rgba(100,220,100,0.7)', marginTop: 6 }}>{t('flashbook_edit', 'alias_available', 'Disponible ✓')}</p>}
              {alias && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
                  {t('flashbook_edit', 'alias_warning', 'Cambiar el alias invalida todos los links anteriores.')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp para reservas */}
        <div style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setWaOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px', borderRadius: 16, border: `1px solid rgba(239,255,66,${waOpen ? 0.25 : 0.14})`,
              background: waOpen ? 'linear-gradient(135deg, rgba(239,255,66,0.16), rgba(239,255,66,0.04))' : 'linear-gradient(135deg, rgba(239,255,66,0.08), rgba(239,255,66,0.015))',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 800, color: waOpen ? '#efff42' : 'rgba(239,255,66,0.6)' }}>
              {t('flashbook_edit', 'wa_label', 'WhatsApp para reservas')}
              <span style={{ fontSize: 10, fontWeight: 400, color: waOpen ? 'rgba(239,255,66,0.5)' : 'rgba(239,255,66,0.3)', marginLeft: 6 }}>{t('flashbook_edit', 'optional', 'opcional')}</span>
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 8, flexShrink: 0 }}>{waOpen ? '▲' : '▼'}</span>
          </button>
          {waOpen && (
            <div style={{ marginTop: 8, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 10, lineHeight: 1.5 }}>
                {t('flashbook_edit', 'wa_desc', 'Si lo configurás, tus clientes van a poder reservar diseños directo por WhatsApp.')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={waInput}
                  onChange={e => { setWaInput(e.target.value.replace(/\D/g, '')); setWaSaved(false) }}
                  placeholder="5491112345678"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none', minWidth: 0 }}
                />
                <button
                  onClick={saveWA}
                  disabled={waSaving}
                  style={{ background: waSaved ? 'rgba(100,220,100,0.2)' : '#efff42', color: waSaved ? 'rgba(100,220,100,0.9)' : '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: waSaving ? 'default' : 'pointer', flexShrink: 0 }}>
                  {waSaving ? '...' : waSaved ? '✓' : 'Guardar'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 8 }}>
                Código de país + código de área + número. Ejemplo Argentina: <span style={{ color: 'rgba(255,255,255,0.35)' }}>54 9 11 1234 5678</span>
              </p>
            </div>
          )}
        </div>

        {/* Diseños */}
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
          {t('flashbook_edit', 'designs_label', 'Diseños')} · {designs.length}/{flashLimit}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 12, lineHeight: 1.5 }}>
          {t('flashbook_edit', 'designs_desc', 'Podés subir diseños sueltos o hojas de flash con varios motivos. Cada imagen tiene un número — cuando alguien reserva, te dice el número para que sepas cuál es.')}
        </p>

        {loadingDesigns ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>{t('flashbook_edit', 'loading', 'Cargando...')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>

            {designs.map((d, i) => (
              <div key={d.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ position: 'relative', aspectRatio: '1' }}>
                  <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 1, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>#{i + 1}</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <button
                    onClick={() => deleteDesign(d.id)}
                    disabled={deleting === d.id}
                    style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,100,100,0.8)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    {deleting === d.id ? '·' : '×'}
                  </button>
                </div>
                <button
                  onClick={() => openLabelEditor(d.id)}
                  style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', color: (d.labels ?? []).length > 0 ? 'rgba(239,255,66,0.7)' : 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                  {(d.labels ?? []).length > 0
                    ? `${(d.labels ?? []).length} ${(d.labels ?? []).length !== 1 ? t('flashbook_edit', 'label_count_many', 'etiquetas') : t('flashbook_edit', 'label_count_one', 'etiqueta')} ✎`
                    : t('flashbook_edit', 'label_tag_btn', '+ Etiquetar')}
                </button>
              </div>
            ))}

            {/* Botón agregar */}
            {designs.length < flashLimit && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ aspectRatio: '1', background: uploading ? 'rgba(239,255,66,0.05)' : 'rgba(255,255,255,0.03)', border: `2px dashed ${uploading ? 'rgba(239,255,66,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: uploading ? 'default' : 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                {uploading ? (
                  <div style={{ width: 24, height: 24, border: '2px solid rgba(239,255,66,0.2)', borderTopColor: '#efff42', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <>
                    <span style={{ fontSize: 28, lineHeight: 1, color: 'rgba(255,255,255,0.15)' }}>+</span>
                    <span style={{ fontSize: 11 }}>{t('flashbook_edit', 'add_btn', 'Agregar')}</span>
                  </>
                )}
              </button>
            )}

          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) uploadDesign(file)
            e.target.value = ''
          }}
        />

        {/* Guardar cambios */}
        {designs.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button
              onClick={saveAll}
              disabled={savingAll}
              style={{ width: '100%', padding: '14px', background: savingAll ? 'rgba(239,255,66,0.5)' : '#efff42', border: 'none', borderRadius: 12, color: '#000', fontSize: 14, fontWeight: 800, cursor: savingAll ? 'default' : 'pointer' }}>
              {savingAll ? t('flashbook_edit', 'saving', 'Guardando...') : t('flashbook_edit', 'save_all', 'Guardar cambios')}
            </button>
          </div>
        )}

        {/* Ver como cliente */}
        {alias && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <a
              href={`/flash/${alias}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '11px 24px', background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', borderRadius: 10, color: '#efff42', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              {t('flashbook_edit', 'view_as_client', 'Ver como cliente')} ↗
            </a>
          </div>
        )}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>

    {/* ── LABEL EDITOR OVERLAY ── */}
    {labelEditing && (() => {
      const design = designs.find(d => d.id === labelEditing)
      if (!design) return null
      const next = nextLetter(labelsDraft)
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => setLabelEditing(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: 0 }}>{t('flashbook_edit', 'label_cancel', 'Cancelar')}</button>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t('flashbook_edit', 'label_title', 'Etiquetar diseños')}</p>
            <button onClick={saveLabels} disabled={savingLabels} style={{ background: '#efff42', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 800, cursor: savingLabels ? 'default' : 'pointer', color: '#000' }}>
              {savingLabels ? '...' : 'Guardar'}
            </button>
          </div>

          {/* Image with draggable labels */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflow: 'hidden' }}>
            <div
              ref={imgContainerRef}
              style={{ position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden', touchAction: 'none', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={design.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none' }} />

              {labelsDraft.map(label => (
                <div
                  key={label.id}
                  onPointerDown={e => {
                    e.stopPropagation()
                    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                    draggingLabel.current = { id: label.id, startX: e.clientX, startY: e.clientY, moved: false }
                  }}
                  onPointerMove={e => {
                    const drag = draggingLabel.current
                    if (!drag || drag.id !== label.id || !imgContainerRef.current) return
                    if (Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4) drag.moved = true
                    const rect = imgContainerRef.current.getBoundingClientRect()
                    const x = Math.max(8, Math.min(92, (e.clientX - rect.left) / rect.width * 100))
                    const y = Math.max(8, Math.min(92, (e.clientY - rect.top) / rect.height * 100))
                    const lid = label.id
                    setLabelsDraft(prev => prev.map(l => l.id === lid ? { ...l, x, y } : l))
                  }}
                  onPointerUp={() => {
                    const drag = draggingLabel.current
                    if (!drag || drag.id !== label.id) return
                    if (!drag.moved) {
                      const lid = label.id
                      setLabelsDraft(prev => prev.map(l => l.id === lid ? { ...l, tattooed: !l.tattooed } : l))
                    }
                    draggingLabel.current = null
                  }}
                  style={{
                    position: 'absolute',
                    left: `${label.x}%`, top: `${label.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 32, height: 32, borderRadius: '50%',
                    background: label.tattooed ? 'rgba(200,40,40,0.9)' : 'rgba(0,0,0,0.75)',
                    border: `2px solid ${label.tattooed ? 'rgba(255,80,80,0.9)' : 'rgba(255,255,255,0.7)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff',
                    cursor: 'grab', touchAction: 'none', userSelect: 'none', zIndex: 10,
                  }}>
                  {label.tattooed ? '×' : label.letter}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '0 18px 28px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Instrucción */}
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
              {t('flashbook_edit', 'label_hint', 'Arrastrá las etiquetas · tocá para marcar como tatuado')}
            </p>

            {/* Agregar letra */}
            {next && (
              <button
                onClick={() => setLabelsDraft(prev => [...prev, { id: uid(), letter: next, x: 50, y: 50, tattooed: false }])}
                style={{ width: '100%', padding: '13px', background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.22)', borderRadius: 12, color: '#efff42', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {t('flashbook_edit', 'label_add_btn', '+ Agregar etiqueta')} {next}
              </button>
            )}

            {/* Lista de etiquetas */}
            {labelsDraft.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {labelsDraft.map(label => (
                  <div key={label.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: label.tattooed ? 'rgba(200,40,40,0.8)' : 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {label.tattooed ? '×' : label.letter}
                    </div>
                    <button
                      onClick={() => { const lid = label.id; setLabelsDraft(prev => prev.map(l => l.id === lid ? { ...l, tattooed: !l.tattooed } : l)) }}
                      style={{ flex: 1, background: 'none', border: 'none', textAlign: 'left', color: label.tattooed ? 'rgba(220,80,80,0.8)' : 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                      {label.tattooed ? t('flashbook_edit', 'label_status_tattooed', 'Tatuado — no disponible') : t('flashbook_edit', 'label_status_ok', 'Disponible')}
                    </button>
                    <button
                      onClick={() => { const lid = label.id; setLabelsDraft(prev => prev.filter(l => l.id !== lid)) }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,80,80,0.5)', fontSize: 18, cursor: 'pointer', padding: '2px 6px', lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    })()}
  </>
  )
}
