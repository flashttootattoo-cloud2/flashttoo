'use client'
import { useState, useRef } from 'react'
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
  const [step, setStep] = useState<Step>('country')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [describe, setDescribe] = useState('')
  const [category, setCategory] = useState<'parche' | 'pieza' | null>(null)
  const [size, setSize] = useState<'chico' | 'mediano' | 'grande' | null>(null)
  const [style, setStyle] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)
  const [stylePos, setStylePos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const styleBtnRef = useRef<HTMLButtonElement>(null)
  const [typeOpen, setTypeOpen] = useState(false)
  const [typePos, setTypePos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const typeBtnRef = useRef<HTMLButtonElement>(null)

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
      const cat = !skipRest ? category : null
      const sz = !skipRest && cat === 'parche' ? size : null
      const st = !skipRest ? style : null

      const extra: string[] = []
      if (cat) {
        extra.push(sz ? t('buscador', `size_${sz}`, sz) : t('buscador', 'cat_pieza', 'Pieza completa'))
      }
      if (st) extra.push(st)

      let content: string
      if (description) {
        // El textarea tiene margen (250) para que esto nunca se pase de 300 y se corte.
        if (extra.length > 0) {
          content = `${description} (${extra.join(', ')})`
        } else {
          content = description
        }
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
          search_category: cat,
          search_size: sz,
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
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'transparent', padding: '20px 20px 50vh', overflowY: 'auto' }}>
      <style>{`@keyframes centerModalIn{from{opacity:0;transform:scale(0.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}.ftx-describe::placeholder{color:rgba(255,255,255,0.22)}`}</style>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '88vh', display: 'flex', flexDirection: 'column', borderRadius: 24, boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(239,255,66,0.06), 0 0 50px rgba(239,255,66,0.07)', animation: 'centerModalIn 0.4s cubic-bezier(0.22,0.61,0.36,1)', overflow: 'hidden', background: 'rgba(14,14,14,0.72)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', border: '1px solid rgba(255,255,255,0.12)' }}>

        <div style={{ padding: '18px 20px 8px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          {stepIdx > 0 ? (
            <button onClick={goBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer', padding: 0 }}>←</button>
          ) : <span />}
          <button onClick={close} style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '14px 24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>

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
                placeholder={t('buscador', 'describe_placeholder', 'ej: quiero una rosa en el cuello a color')}
                onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                style={{ background: 'transparent', border: 'none', borderRadius: 0, padding: '4px 0', color: '#fff', fontSize: 15, lineHeight: 1.55, outline: 'none', width: '100%', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />

              {/* Detalles opcionales, todo acá mismo, sin más pasos — mismo estilo de tag que en los perfiles */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                <button ref={typeBtnRef} style={profileTagStyle}
                  onClick={() => {
                    if (typeOpen) { setTypeOpen(false); return }
                    setTypePos(dropdownPos(typeBtnRef.current, 200))
                    setTypeOpen(true)
                  }}>
                  {category
                    ? (category === 'parche' && size ? t('buscador', `size_${size}`, size) : category === 'parche' ? t('buscador', 'cat_parche', 'Parche') : t('buscador', 'cat_pieza', 'Pieza completa'))
                    : t('buscador', 'type_placeholder', 'Tamaño de tatuaje')} {typeOpen ? '▲' : '▼'}
                </button>
                <button ref={styleBtnRef} style={profileTagStyle}
                  onClick={() => {
                    if (styleOpen) { setStyleOpen(false); return }
                    setStylePos(dropdownPos(styleBtnRef.current, 250))
                    setStyleOpen(true)
                  }}>
                  {style || t('inicio', 'styles_placeholder', 'Estilos de tatuaje')} {styleOpen ? '▲' : '▼'}
                </button>
              </div>

              {typeOpen && typePos && createPortal(
                <>
                  <div onClick={e => { e.stopPropagation(); setTypeOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 229 }} />
                  <div className="rounded-xl overflow-y-auto"
                    style={{ position: 'fixed', ...typePos, zIndex: 230, width: 200, background: 'rgba(14,14,14,0.75)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', maxHeight: 250 }}>
                    <div className="flex flex-col">
                      {([
                        { cat: 'parche' as const, sz: 'chico' as const, label: t('buscador', 'size_chico', 'Chico') },
                        { cat: 'parche' as const, sz: 'mediano' as const, label: t('buscador', 'size_mediano', 'Mediano') },
                        { cat: 'parche' as const, sz: 'grande' as const, label: t('buscador', 'size_grande', 'Grande') },
                        { cat: 'pieza' as const, sz: null, label: t('buscador', 'cat_pieza', 'Pieza completa') },
                      ]).map(opt => {
                        const on = category === opt.cat && size === opt.sz
                        return (
                          <button key={opt.label} onClick={() => { setCategory(prev => on ? null : opt.cat); setSize(prev => on ? null : opt.sz); setTypeOpen(false) }}
                            className="flex items-center justify-between px-3 py-2.5 transition-all text-left"
                            style={{ fontSize: 12.5, background: on ? 'rgba(239,255,66,0.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ color: on ? '#efff42' : 'rgba(255,255,255,0.55)', fontWeight: on ? 700 : 400 }}>{opt.label}</span>
                            {on && <span style={{ color: '#efff42', fontSize: 11 }}>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>, document.body
              )}

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
                {t('buscador', 'describe_community_hint', 'Esto se publica en la comunidad — tatuadores de tu zona lo van a ver y pueden querer ayudarte. Después volvé y buscá el mensaje para ver qué tatuador puede tener disponibilidad.')}
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
  )
}
