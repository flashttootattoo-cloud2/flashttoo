'use client'
import { useEffect, useState } from 'react'
import { SECTION_BG_KEYS, DEFAULT_DIM, sectionBgStyle, type SectionBgKey, type SectionBgs } from '@/lib/sectionBg'

function H(pass: string) {
  return { 'x-admin-pass': pass }
}

const SECTIONS: Record<SectionBgKey, { label: string; hint: string; base: string }> = {
  home:    { label: 'Home',    hint: 'Pantalla principal, detrás de los perfiles de tatuadores.', base: '#000' },
  gallery: { label: 'Galería', hint: 'Fondo de la galería de fotos.', base: '#000' },
  cultura: { label: 'Cultura', hint: 'Fondo de la sección Cultura (artículos y videos).', base: '#0a0a0a' },
  events:  { label: 'Eventos', hint: 'Fondo de la sección Eventos (convenciones y flash days).', base: '#0a0a0a' },
}

// Baja el peso antes de subir: una textura de fondo no necesita más de ~1600 px
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bitmap = await createImageBitmap(file)
    const max = 1600
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.82))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

function fmtBytes(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.round(n / 1024)} KB`
}

// Semáforo de peso para saber si el fondo es liviano de verdad
function weightInfo(bytes: number): { label: string; color: string } {
  if (bytes <= 250 * 1024) return { label: 'Óptimo', color: '#4ade80' }
  if (bytes <= 500 * 1024) return { label: 'Aceptable', color: '#f59e0b' }
  return { label: 'Pesado — conviene una más liviana', color: '#f87171' }
}

export default function SectionBackgroundsAdmin({ pass }: { pass: string }) {
  const [bgs, setBgs] = useState<SectionBgs>({})
  const [dims, setDims] = useState<Partial<Record<SectionBgKey, number>>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<SectionBgKey | null>(null)
  const [error, setError] = useState('')
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({})

  useEffect(() => {
    Object.values(bgs).forEach(bg => {
      if (!bg?.url || sizes[bg.url]) return
      const img = new Image()
      img.onload = () => setSizes(prev => ({ ...prev, [bg.url]: { w: img.naturalWidth, h: img.naturalHeight } }))
      img.src = bg.url
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgs])

  useEffect(() => {
    fetch('/api/admin/section-backgrounds', { headers: H(pass) })
      .then(r => r.json())
      .then(d => { setBgs(d.backgrounds ?? {}); setDims({}) })
      .catch(() => setError('No se pudieron cargar los fondos'))
      .finally(() => setLoading(false))
  }, [pass])

  const apply = (next: SectionBgs) => { setBgs(next); setDims({}) }

  async function upload(section: SectionBgKey, file: File) {
    setBusy(section); setError('')
    try {
      const small = await shrinkImage(file)
      const fd = new FormData()
      fd.append('section', section)
      fd.append('image', small)
      const r = await fetch('/api/admin/section-backgrounds', { method: 'POST', headers: H(pass), body: fd })
      const d = await r.json()
      if (d.backgrounds) apply(d.backgrounds)
      else setError(d.error || 'No se pudo subir la imagen')
    } catch {
      setError('Error de red al subir la imagen')
    } finally { setBusy(null) }
  }

  async function patch(section: SectionBgKey, body: { dim?: number; mode?: 'cover' | 'tile' }) {
    setBusy(section); setError('')
    try {
      const r = await fetch('/api/admin/section-backgrounds', { method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ section, ...body }) })
      const d = await r.json()
      if (d.backgrounds) apply(d.backgrounds)
      else setError(d.error || 'No se pudo guardar')
    } finally { setBusy(null) }
  }

  async function remove(section: SectionBgKey) {
    if (!confirm(`¿Quitar el fondo de ${SECTIONS[section].label}?`)) return
    setBusy(section); setError('')
    try {
      const r = await fetch('/api/admin/section-backgrounds', { method: 'DELETE', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ section }) })
      const d = await r.json()
      if (d.backgrounds) apply(d.backgrounds)
    } finally { setBusy(null) }
  }

  if (loading) return <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Cargando...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#efff42' }}>FONDOS</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4, lineHeight: 1.6 }}>
          Una imagen de fondo por sección, pensada como textura muy oscura. Las imágenes se reducen solas antes de subirse. Para Insumos siguen valiendo las imágenes de la pestaña Sponsors.
        </p>
      </div>

      {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}

      {SECTION_BG_KEYS.map(key => {
        const info = SECTIONS[key]
        const bg = bgs[key]
        const dim = dims[key] ?? bg?.dim ?? DEFAULT_DIM
        const preview = bg ? sectionBgStyle({ ...bg, dim }, info.base) : { background: info.base }
        const isBusy = busy === key
        return (
          <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{info.label}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{info.hint}</p>
              </div>
              <label style={{ cursor: isBusy ? 'default' : 'pointer', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8, background: 'rgba(239,255,66,0.12)', color: '#efff42', border: '1px solid rgba(239,255,66,0.25)', opacity: isBusy ? 0.5 : 1 }}>
                  {isBusy ? 'Guardando...' : bg ? 'Cambiar imagen' : '+ Subir imagen'}
                </span>
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isBusy}
                  onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(key, f) }} />
              </label>
            </div>

            {/* Vista previa con el oscurecimiento aplicado */}
            <div style={{ ...preview, height: 120, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#efff42' }}>
                {bg ? 'Vista previa' : 'Sin fondo (negro liso)'}
              </span>
            </div>

            {bg && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                {sizes[bg.url] ? `${sizes[bg.url].w} × ${sizes[bg.url].h} px` : 'Midiendo...'}
                {typeof bg.bytes === 'number' && (
                  <>
                    {' · '}<b style={{ color: '#fff' }}>{fmtBytes(bg.bytes)}</b>
                    {' · '}<span style={{ color: weightInfo(bg.bytes).color, fontWeight: 700 }}>{weightInfo(bg.bytes).label}</span>
                  </>
                )}
                {typeof bg.bytes !== 'number' && <span style={{ color: 'rgba(255,255,255,0.25)' }}> · peso: volvé a subirla para verlo</span>}
              </p>
            )}

            {bg && (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Oscurecer</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{Math.round(dim * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={97} step={1} value={Math.round(dim * 100)} disabled={isBusy}
                    onChange={e => setDims(prev => ({ ...prev, [key]: Number(e.target.value) / 100 }))}
                    onPointerUp={() => { if (dims[key] !== undefined && dims[key] !== bg.dim) patch(key, { dim: dims[key] }) }}
                    onKeyUp={() => { if (dims[key] !== undefined && dims[key] !== bg.dim) patch(key, { dim: dims[key] }) }}
                    style={{ width: '100%', accentColor: '#efff42' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Ajuste</span>
                  {([['cover', 'Cubrir (imagen completa)'], ['tile', 'Mosaico (textura que se repite)']] as const).map(([m, label]) => (
                    <button key={m} onClick={() => bg.mode !== m && patch(key, { mode: m })} disabled={isBusy}
                      style={{ fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 20, cursor: 'pointer',
                        border: `1px solid ${bg.mode === m ? 'rgba(239,255,66,0.5)' : 'rgba(255,255,255,0.12)'}`,
                        background: bg.mode === m ? 'rgba(239,255,66,0.1)' : 'transparent',
                        color: bg.mode === m ? '#efff42' : 'rgba(255,255,255,0.45)' }}>
                      {label}
                    </button>
                  ))}
                  <button onClick={() => remove(key)} disabled={isBusy}
                    style={{ marginLeft: 'auto', fontSize: 11, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                    Quitar fondo
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
