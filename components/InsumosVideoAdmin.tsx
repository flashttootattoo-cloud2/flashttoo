'use client'
import { useEffect, useRef, useState } from 'react'

type InsumosVideo = {
  id: string
  video_url: string
  link: string | null
  sponsor_name: string | null
  country: string | null
  active: boolean
  created_at: string
}

function H(pass: string) {
  return { 'x-admin-pass': pass }
}

const SoundIcon = ({ muted }: { muted: boolean }) => muted
  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>

const PlayPauseIcon = ({ paused }: { paused: boolean }) => paused
  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
  : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>

function VideoPreview({ src }: { src: string }) {
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const ref = useRef<HTMLVideoElement>(null)

  function togglePause() {
    const el = ref.current
    if (!el) return
    if (el.paused) { el.play().catch(() => {}); setPaused(false) }
    else { el.pause(); setPaused(true) }
  }
  function toggleSound() {
    const el = ref.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
  }

  return (
    <div style={{ position: 'relative' }}>
      <video ref={ref} src={src} muted loop playsInline autoPlay style={{ width: '100%', borderRadius: 8, display: 'block', background: '#000' }} />
      <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
        <button onClick={toggleSound} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title={muted ? 'Activar sonido' : 'Silenciar'}>
          <SoundIcon muted={muted} />
        </button>
        <button onClick={togglePause} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <PlayPauseIcon paused={paused} />
        </button>
      </div>
    </div>
  )
}

export default function InsumosVideoAdmin({ pass }: { pass: string }) {
  const [videos, setVideos] = useState<InsumosVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [isVertical, setIsVertical] = useState(false)
  const [sponsorName, setSponsorName] = useState('')
  const [link, setLink] = useState('')
  const [country, setCountry] = useState('')
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/insumos-video', { headers: H(pass) }).then(r => r.json()).catch(() => ({ videos: [] }))
    setVideos(r.videos ?? [])
    setLoading(false)
  }

  function handleVideoFile(f: File | null) {
    setVideoFile(f)
    setIsVertical(false)
    setVideoPreview(f ? URL.createObjectURL(f) : null)
  }

  function resetForm() {
    setVideoFile(null); setVideoPreview(null); setIsVertical(false)
    setSponsorName(''); setLink(''); setCountry('')
    setFormOpen(false); setError('')
  }

  async function submit() {
    if (!videoFile) { setError('Seleccioná un video'); return }
    setUploading(true); setError('')
    try {
      setUploadProgress('Subiendo video...')
      const ext = videoFile.name.split('.').pop() || 'mp4'
      const path = `insumos-video/video-${Date.now()}.${ext}`
      const presign = await fetch('/api/upload-presign', {
        method: 'POST', headers: { ...H(pass), 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, contentType: videoFile.type }),
      }).then(r => r.json())
      if (presign.error) { setError(presign.error); setUploading(false); setUploadProgress(''); return }
      await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': videoFile.type }, body: videoFile })

      setUploadProgress('Guardando...')
      const r = await fetch('/api/admin/insumos-video', {
        method: 'POST', headers: { ...H(pass), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: presign.publicUrl,
          link: link.trim() || null,
          sponsor_name: sponsorName.trim() || null,
          country: country.trim() || null,
          active: true,
        }),
      }).then(r => r.json())
      if (r.error) { setError(r.error); setUploading(false); setUploadProgress(''); return }

      resetForm()
      setUploading(false); setUploadProgress('')
      load()
    } catch {
      setError('Error al subir. Revisá la conexión e intentá de nuevo.')
      setUploading(false); setUploadProgress('')
    }
  }

  async function toggleActive(v: InsumosVideo) {
    await fetch('/api/admin/insumos-video', {
      method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, active: !v.active }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm('¿Borrar este video? También se borra el archivo de R2.')) return
    await fetch('/api/admin/insumos-video', { method: 'DELETE', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  if (loading) return <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Cargando...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#efff42' }}>VIDEO INSUMOS</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            Video horizontal arriba de todo en Insumos — espacio extra pago. Uno por país (el que ve cada visitante según su país de notificaciones) o global si no le ponés país.
          </p>
        </div>
        <button
          onClick={() => { setFormOpen(v => !v); setError('') }}
          style={{ fontSize: 12, fontWeight: 700, padding: '8px 14px', background: formOpen ? 'rgba(239,255,66,0.1)' : '#efff42', border: `1px solid ${formOpen ? 'rgba(239,255,66,0.4)' : 'transparent'}`, borderRadius: 10, color: formOpen ? '#efff42' : '#000', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {formOpen ? 'Cancelar' : '+ Video Insumo'}
        </button>
      </div>

      {formOpen && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Nuevo video</p>

          <div
            onClick={() => videoInputRef.current?.click()}
            style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)', border: `2px dashed ${videoFile ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {videoPreview
              ? <video
                  src={videoPreview}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  muted playsInline autoPlay loop
                  onLoadedMetadata={e => {
                    const v = e.target as HTMLVideoElement
                    setIsVertical(v.videoHeight > v.videoWidth)
                  }}
                />
              : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Elegir video horizontal</span>
            }
          </div>
          <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleVideoFile(e.target.files?.[0] ?? null)} />
          {isVertical && <p style={{ fontSize: 11, color: '#f59e0b' }}>Este video es vertical — se pidió uno horizontal, puede verse recortado.</p>}

          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>País (opcional — vacío = global, se ve en todos los países)</p>
            <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Argentina"
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Nombre de la marca (opcional, referencia interna)</p>
            <input type="text" value={sponsorName} onChange={e => setSponsorName(e.target.value)} placeholder="Nombre de la marca"
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Link al tocar el video (opcional)</p>
            <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..."
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}
          {uploadProgress && <p style={{ fontSize: 12, color: 'rgba(239,255,66,0.7)' }}>{uploadProgress}</p>}

          <button
            onClick={submit} disabled={uploading}
            style={{ padding: '11px', background: uploading ? 'rgba(239,255,66,0.3)' : '#efff42', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, color: '#000', cursor: uploading ? 'default' : 'pointer' }}
          >
            {uploading ? 'Subiendo...' : 'Subir y activar'}
          </button>
        </div>
      )}

      {videos.length === 0 ? (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin videos aún</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {videos.map(v => (
            <div key={v.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: v.active ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${v.active ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.1)'}`, color: v.active ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                  {v.active ? 'Activo' : 'Inactivo'}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(239,255,66,0.06)', border: '1px solid rgba(239,255,66,0.2)', color: 'rgba(239,255,66,0.8)' }}>
                  {v.country || 'Global'}
                </span>
                {v.sponsor_name && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{v.sponsor_name}</span>}
              </div>
              <VideoPreview src={v.video_url} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggleActive(v)} style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: '8px 0', background: v.active ? 'rgba(255,255,255,0.05)' : 'rgba(74,222,128,0.1)', border: `1px solid ${v.active ? 'rgba(255,255,255,0.1)' : 'rgba(74,222,128,0.3)'}`, borderRadius: 8, color: v.active ? 'rgba(255,255,255,0.5)' : '#4ade80', cursor: 'pointer' }}>
                  {v.active ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => remove(v.id)} style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: '8px 0', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, color: '#f87171', cursor: 'pointer' }}>
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
