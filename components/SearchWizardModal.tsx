'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/contexts/TranslationContext'

type Step = 'country' | 'describe'
const STEP_ORDER: Step[] = ['country', 'describe']

export const SEARCH_WIZARD_SEEN_KEY = 'flashttoo_search_wizard_seen'
const DEVICE_ID_KEY = 'flashttoo_device_id'

const IconPin = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-7.1-7-12a7 7 0 0 1 14 0c0 4.9-7 12-7 12z"/><circle cx="12" cy="9" r="2.3"/></svg>

function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_ID_KEY, id) }
    return id
  } catch { return '' }
}

type Props = {
  allStyles: string[]
  lang?: string
  onClose: () => void
  onSearch: (country: string, city: string, styles: string[]) => void
}

export default function SearchWizardModal({ allStyles, lang = 'es', onClose, onSearch }: Props) {
  const { t } = useTranslation()

  // Bloquea el scroll del feed de fondo mientras el modal está abierto — sin esto,
  // al enfocar un input el navegador mobile scrollea la página entera (el feed y
  // el logo se corren) para llevar el input a la vista.
  useEffect(() => {
    const scrollY = window.scrollY
    const body = document.body
    const prev = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width }
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    return () => {
      body.style.overflow = prev.overflow
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Sigue el tamaño real de pantalla visible (visualViewport) en vez de 100vh fijo,
  // así el modal se achica solo cuando aparece el teclado, sin que nada de atrás se mueva.
  const [viewport, setViewport] = useState<{ height: number; top: number }>(() => ({
    height: typeof window !== 'undefined' ? window.innerHeight : 0, top: 0,
  }))
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => setViewport({ height: vv.height, top: vv.offsetTop })
    onResize()
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => { vv.removeEventListener('resize', onResize); vv.removeEventListener('scroll', onResize) }
  }, [])

  // Alto real de la barra superior activa — el panel se ancla justo debajo, a todo
  // el ancho, como si fuera una extensión de esa barra. Puede haber más de un
  // .ft-topbar en el DOM a la vez (ej. la de insumos/eventos no se desmonta, solo
  // se desliza fuera de pantalla con transform) — se descartan las que no están
  // realmente a la vista (su top no está pegado arriba) y se toma la última que sí.
  const [headerH, setHeaderH] = useState(0)
  useEffect(() => {
    const findVisibleBar = () => {
      const bars = Array.from(document.querySelectorAll<HTMLElement>('.ft-topbar'))
        .filter(el => el.getBoundingClientRect().top > -10 && el.getBoundingClientRect().top < 10)
      return bars[bars.length - 1] ?? null
    }
    let bar = findVisibleBar()
    if (!bar) return
    const measure = () => setHeaderH(bar!.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(bar)
    window.addEventListener('resize', measure)
    // Reintenta un instante después por si la barra correcta todavía estaba en
    // transición (ej. insumos/eventos deslizándose) cuando se montó el buscador
    const retry = setTimeout(() => {
      const found = findVisibleBar()
      if (found && found !== bar) { ro.disconnect(); bar = found; ro.observe(bar); measure() }
      else measure()
    }, 120)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(retry) }
  }, [])

  const [step, setStep] = useState<Step>('country')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [describe, setDescribe] = useState('')
  const [style, setStyle] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)
  const [stylePos, setStylePos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const styleBtnRef = useRef<HTMLButtonElement>(null)

  function dropdownPos(btn: HTMLButtonElement | null, width: number): { top?: number; bottom?: number; left: number } | null {
    if (!btn) return null
    const rect = btn.getBoundingClientRect()
    const left = Math.min(rect.left, window.innerWidth - width - 12)
    const spaceBelow = window.innerHeight - rect.bottom
    return spaceBelow > 260
      ? { top: rect.bottom + 4, left }
      : { bottom: window.innerHeight - rect.top + 4, left }
  }

  const effectiveSteps = STEP_ORDER
  const stepIdx = effectiveSteps.indexOf(step)
  const passed = (s: Step) => effectiveSteps.indexOf(s) < stepIdx
  const SEEN_KEY = SEARCH_WIZARD_SEEN_KEY

  const finish = async (skipRest: boolean) => {
    setSending(true)
    try {
      const loc = [city, country].filter(Boolean).join(', ')
      const description = !skipRest ? describe.trim() : ''
      const st = !skipRest ? style : null

      const extra: string[] = []
      if (st) extra.push(st)

      // Sin texto propio no hay nada concreto para que un tatuador se interese en particular
      // (se muestra como notificación general, sin el sistema de "me interesa" — ver
      // isMinimalSearch en CommunityPanel), pero tamaño/estilo igual valen como dato.
      let content: string
      if (description) {
        // El textarea tiene margen (250) para que esto nunca se pase de 300 y se corte.
        content = extra.length > 0 ? `${description} (${extra.join(', ')})` : description
      } else if (extra.length > 0) {
        content = t('buscador', 'msg_detailed', 'Alguien busca {detail} — {loc}').replace('{detail}', extra.join(', ')).replace('{loc}', loc || country)
      } else {
        content = t('buscador', 'msg_basic', 'Alguien buscó tatuadores en {loc}').replace('{loc}', loc || country)
      }

      await fetch('/api/community', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'search', content, country, city: city || null, lang,
          device_id: getDeviceId(),
          search_description: description || null,
          search_style: st,
        }),
      }).catch(() => {})
    } finally {
      try { localStorage.setItem(SEEN_KEY, '1') } catch {}
      onSearch(country, city, style ? [style] : [])
      setSending(false)
      onClose()
    }
  }

  const close = () => {
    try { localStorage.setItem(SEEN_KEY, '1') } catch {}
    onClose()
  }

  const goNext = () => {
    const i = STEP_ORDER.indexOf(step) + 1
    if (i < STEP_ORDER.length) setStep(STEP_ORDER[i])
    else finish(false)
  }
  const goBack = () => {
    const i = STEP_ORDER.indexOf(step) - 1
    if (i >= 0) setStep(STEP_ORDER[i])
  }

  const ctaStyle = (enabled = true): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 20, border: 'none',
    background: enabled ? '#efff42' : 'rgba(255,255,255,0.08)', color: enabled ? '#000' : 'rgba(255,255,255,0.3)',
    fontSize: 11, fontWeight: 700, cursor: enabled ? 'pointer' : 'default', letterSpacing: '0.02em',
  })
  const ctaSkipStyle: React.CSSProperties = {
    padding: '6px 14px', borderRadius: 20, border: 'none',
    background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
    fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em',
  }
  const headlineStyle: React.CSSProperties = { fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', marginBottom: 12, lineHeight: 1.3 }
  const underlineInputStyle: React.CSSProperties = { background: 'transparent', border: 'none', borderBottom: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 0, padding: '8px 2px', color: '#fff', fontSize: 15, outline: 'none', width: '100%' }
  const profileTagStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '3px 8px', borderRadius: 5, background: 'transparent', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', cursor: 'pointer',
  }

  // ── Filas resumen de lo ya respondido ──
  type SummaryRow = { key: string; text: string; icon: React.ReactNode; onClick: () => void }
  const rows: SummaryRow[] = []
  if (passed('country')) rows.push({ key: 'loc', text: [city, country].filter(Boolean).join(', ') || country, icon: IconPin, onClick: () => setStep('country') })

  return (
    <>
      <style>{`@keyframes dropModalIn{from{opacity:0;transform:translateX(-50%) translateY(-14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}.ftx-describe::placeholder{color:rgba(255,255,255,0.22)}`}</style>
      <div onClick={close} style={{ position: 'fixed', left: 0, width: '100%', top: viewport.top, height: viewport.height, zIndex: 209, background: 'transparent' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 1280, top: headerH, maxHeight: Math.max(160, viewport.height - headerH), zIndex: 210, display: 'flex', flexDirection: 'column', borderRadius: '0 0 24px 24px', boxShadow: '0 30px 80px rgba(0,0,0,0.9)', animation: 'dropModalIn 0.5s cubic-bezier(0.22,0.61,0.36,1)', overflow: 'hidden', background: 'rgba(14,14,14,0.85)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', borderLeft: '1px solid rgba(255,255,255,0.12)', borderRight: '1px solid rgba(255,255,255,0.12)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {stepIdx > 0 && (
          <div style={{ padding: '18px 20px 0' }}>
            <button onClick={goBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer', padding: 0 }}>←</button>
          </div>
        )}

        <div style={{ padding: '14px 24px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Respuestas ya dadas, colapsadas */}
          {rows.map(r => (
            <button key={r.key} onClick={r.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 12, background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ width: 23, height: 23, borderRadius: 7, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(255,255,255,0.4)' }}>{r.icon}</div>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.text}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>✎</span>
            </button>
          ))}

          {step === 'country' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: rows.length ? 6 : 0 }}>
              <p style={headlineStyle}>{t('buscador', 'q_country', '¿En qué país estás?')}</p>
              <input autoFocus value={country} onChange={e => setCountry(e.target.value)} placeholder={t('inicio', 'country_placeholder', 'país')}
                onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                style={underlineInputStyle} />
              {country.trim() && (
                <input value={city} onChange={e => setCity(e.target.value)} placeholder={t('buscador', 'city_placeholder', 'ciudad de {country}').replace('{country}', country)}
                  onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                  style={{ ...underlineInputStyle, marginTop: 4 }} />
              )}

              {/* Opcional — solo filtra la búsqueda, no genera una publicación "detallada" en comunidad */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <button ref={styleBtnRef} style={profileTagStyle}
                  onClick={() => {
                    if (styleOpen) { setStyleOpen(false); return }
                    setStylePos(dropdownPos(styleBtnRef.current, 250))
                    setStyleOpen(true)
                  }}>
                  {style || t('inicio', 'styles_placeholder', 'Estilos de tatuaje')} {styleOpen ? '▲' : '▼'}
                </button>
              </div>

              {styleOpen && stylePos && createPortal(
                <>
                  <div onClick={e => { e.stopPropagation(); setStyleOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 229 }} />
                  <div className="rounded-xl overflow-y-auto"
                    style={{ position: 'fixed', ...stylePos, zIndex: 230, width: 250, background: 'rgba(14,14,14,0.75)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', maxHeight: 250 }}>
                    <div className="grid grid-cols-2">
                      {allStyles.map(s => {
                        const on = style === s
                        return (
                          <button key={s} onClick={() => { setStyle(prev => prev === s ? null : s); setStyleOpen(false) }}
                            className="flex items-center justify-between px-3 py-2 transition-all text-left"
                            style={{ fontSize: 12.5, background: on ? 'rgba(239,255,66,0.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ color: on ? '#efff42' : 'rgba(255,255,255,0.55)', fontWeight: on ? 700 : 400 }}>{s}</span>
                            {on && <span style={{ color: '#efff42', fontSize: 11 }}>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>, document.body
              )}

              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginTop: 10, marginBottom: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                {t('buscador', 'subheadline', 'Te mostramos tatuadores según lo que elijas.')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 10 }}>
                <button onClick={goNext} disabled={!country.trim()} style={ctaStyle(!!country.trim())}>
                  {t('buscador', 'continue', 'Continuar')}
                </button>
              </div>
            </div>
          )}

          {step === 'describe' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: rows.length ? 6 : 0 }}>
              <p style={headlineStyle}>{t('buscador', 'q_describe', 'Contanos qué te querés tatuar')}</p>
              <textarea autoFocus value={describe} onChange={e => setDescribe(e.target.value)} maxLength={250} rows={4}
                className="ftx-describe"
                placeholder={t('buscador', 'describe_placeholder', 'ej: quiero una rosa mediana en el antebrazo, a color')}
                onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', color: '#fff', fontSize: 15, lineHeight: 1.55, outline: 'none', width: '100%', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />

              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginTop: 10, marginBottom: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                {t('buscador', 'describe_community_hint', 'Esto se publica en la comunidad — tatuadores de tu zona lo van a ver y pueden ayudarte.')}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button onClick={() => finish(false)} disabled={sending}
                  style={describe.trim() ? ctaStyle(!sending) : ctaSkipStyle}>
                  {sending ? '...' : describe.trim()
                    ? t('buscador', 'search_cta_send', 'Enviar mensaje y buscar tatuadores')
                    : t('buscador', 'search_cta_skip', 'Saltear y buscar')}
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  )
}
