'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/contexts/TranslationContext'

export const SEARCH_WIZARD_SEEN_KEY = 'flashttoo_search_wizard_seen'
const DEVICE_ID_KEY = 'flashttoo_device_id'

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

  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
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

  const SEEN_KEY = SEARCH_WIZARD_SEEN_KEY

  const finish = async () => {
    setSending(true)
    try {
      const loc = [city, country].filter(Boolean).join(', ')
      const st = style

      const extra: string[] = []
      if (st) extra.push(st)

      // Sin texto propio no hay nada concreto para que un tatuador se interese en particular
      // (se muestra como notificación general, sin el sistema de "me interesa" — ver
      // isMinimalSearch en CommunityPanel), pero el estilo igual vale como dato.
      let content: string
      if (extra.length > 0) {
        content = t('buscador', 'msg_detailed', 'Alguien busca {detail} — {loc}').replace('{detail}', extra.join(', ')).replace('{loc}', loc || country)
      } else {
        content = t('buscador', 'msg_basic', 'Alguien buscó tatuadores en {loc}').replace('{loc}', loc || country)
      }

      await fetch('/api/community', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'search', content, country, city: city || null, lang,
          device_id: getDeviceId(),
          search_description: null,
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

  const ctaStyle = (enabled = true): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 20, border: 'none',
    background: enabled ? '#efff42' : 'rgba(255,255,255,0.08)', color: enabled ? '#000' : 'rgba(255,255,255,0.3)',
    fontSize: 11, fontWeight: 700, cursor: enabled ? 'pointer' : 'default', letterSpacing: '0.02em',
  })
  const headlineStyle: React.CSSProperties = { fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', marginBottom: 12, lineHeight: 1.3 }
  const underlineInputStyle: React.CSSProperties = { background: 'transparent', border: 'none', borderBottom: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 0, padding: '8px 2px', color: '#fff', fontSize: 15, outline: 'none', width: '100%' }
  const profileTagStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '3px 8px', borderRadius: 5, background: 'transparent', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', cursor: 'pointer',
  }

  return (
    <>
      <style>{`@keyframes dropModalIn{from{opacity:0;transform:translateX(-50%) translateY(-14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      <div onClick={close} style={{ position: 'fixed', left: 0, width: '100%', top: viewport.top, height: viewport.height, zIndex: 209, background: 'transparent' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 1280, top: headerH, maxHeight: Math.max(160, viewport.height - headerH), zIndex: 210, display: 'flex', flexDirection: 'column', borderRadius: '0 0 24px 24px', boxShadow: '0 30px 80px rgba(0,0,0,0.9)', animation: 'dropModalIn 0.5s cubic-bezier(0.22,0.61,0.36,1)', overflow: 'hidden', background: 'rgba(14,14,14,0.85)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', borderLeft: '1px solid rgba(255,255,255,0.12)', borderRight: '1px solid rgba(255,255,255,0.12)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        <div style={{ padding: '14px 24px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {(
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                <button onClick={finish} disabled={!country.trim() || sending} style={ctaStyle(!!country.trim() && !sending)}>
                  {sending ? '...' : t('buscador', 'search_cta', 'Buscar tatuadores')}
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
