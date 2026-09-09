'use client'
import { useEffect, useRef, useState } from 'react'

type CulturaVideo = {
  id: string
  video_url: string | null
  cover_image_url: string
  author_instagram: string
  description: string | null
  tags: string[]
  publish_at: string | null
  published_at: string | null
  archived_at: string | null
  active: boolean
  created_at: string
}

function H(pass: string) {
  return { 'x-admin-pass': pass }
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusLabel(v: CulturaVideo): { label: string; color: string } {
  if (v.archived_at) return { label: 'Archivado', color: '#6b7280' }
  if (!v.active && v.publish_at) return { label: 'Programado', color: '#f59e0b' }
  if (v.active) return { label: 'Activo', color: '#4ade80' }
  return { label: 'Borrador', color: '#6b7280' }
}

export default function CulturaVideosAdmin({ pass }: { pass: string }) {
  const [videos, setVideos]           = useState<CulturaVideo[]>([])
  const [loading, setLoading]         = useState(true)
  const [formOpen, setFormOpen]       = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError]             = useState('')

  // form fields
  const [videoFile, setVideoFile]     = useState<File | null>(null)
  const [coverFile, setCoverFile]     = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [instagram, setInstagram]     = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags]               = useState('')
  const [publishAt, setPublishAt]     = useState('')

  const videoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/cultura-videos', { headers: H(pass) }).then(r => r.json()).catch(() => ({ videos: [] }))
    setVideos(r.videos ?? [])
    setLoading(false)
  }

  function handleVideoFile(f: File | null) {
    setVideoFile(f)
    if (f) setVideoPreview(URL.createObjectURL(f))
    else setVideoPreview(null)
  }

  function handleCoverFile(f: File | null) {
    setCoverFile(f)
    if (f) setCoverPreview(URL.createObjectURL(f))
    else setCoverPreview(null)
  }

  async function submit() {
    if (!videoFile) { setError('Seleccioná un video'); return }
    if (!coverFile) { setError('Seleccioná una portada'); return }
    if (!instagram.trim()) { setError('Ingresá el Instagram del autor'); return }

    setUploading(true); setError(''); setUploadProgress('Subiendo archivos...')
    const fd = new FormData()
    fd.append('video',            videoFile)
    fd.append('cover',            coverFile)
    fd.append('author_instagram', instagram.trim())
    fd.append('description',      description.trim())
    fd.append('tags',             tags)
    if (publishAt) fd.append('publish_at', new Date(publishAt).toISOString())

    const r = await fetch('/api/cultura-videos', { method: 'POST', headers: H(pass), body: fd }).then(r => r.json()).catch(() => ({ error: 'Error de red' }))
    setUploading(false); setUploadProgress('')

    if (r.error) { setError(r.error); return }

    // reset form
    setVideoFile(null); setCoverFile(null); setVideoPreview(null); setCoverPreview(null)
    setInstagram(''); setDescription(''); setTags(''); setPublishAt('')
    setFormOpen(false)
    load()
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar este video? Se borrará el video de R2 y solo quedará la portada.')) return
    await fetch('/api/cultura-videos', { method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  async function remove(id: string) {
    if (!confirm('¿Borrar completamente este video?')) return
    await fetch('/api/cultura-videos', { method: 'DELETE', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const active   = videos.filter(v => v.active && !v.archived_at)
  const scheduled = videos.filter(v => !v.active && v.publish_at && !v.archived_at)
  const archived  = videos.filter(v => !!v.archived_at)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#efff42' }}>CULTURA VIDEOS</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {active.length} activos · {scheduled.length} programados · {archived.length} archivados
          </p>
        </div>
        <button
          onClick={() => { setFormOpen(v => !v); setError('') }}
          style={{ fontSize: 12, fontWeight: 700, padding: '8px 16px', background: formOpen ? 'rgba(239,255,66,0.1)' : '#efff42', border: `1px solid ${formOpen ? 'rgba(239,255,66,0.4)' : 'transparent'}`, borderRadius: 10, color: formOpen ? '#efff42' : '#000', cursor: 'pointer' }}
        >
          {formOpen ? 'Cancelar' : '+ Subir video'}
        </button>
      </div>

      {/* Formulario */}
      {formOpen && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Nuevo video</p>

          {/* Video + Portada */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Video */}
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Video (MP4/MOV)</p>
              <div
                onClick={() => videoInputRef.current?.click()}
                style={{ position: 'relative', aspectRatio: '9/16', maxHeight: 200, background: 'rgba(255,255,255,0.04)', border: `2px dashed ${videoFile ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {videoPreview
                  ? <video src={videoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                  : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Elegir video</span>
                }
              </div>
              <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleVideoFile(e.target.files?.[0] ?? null)} />
              {videoFile && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{videoFile.name}</p>}
            </div>

            {/* Portada */}
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Portada (imagen)</p>
              <div
                onClick={() => coverInputRef.current?.click()}
                style={{ position: 'relative', aspectRatio: '9/16', maxHeight: 200, background: 'rgba(255,255,255,0.04)', border: `2px dashed ${coverFile ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {coverPreview
                  ? <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Elegir portada</span>
                }
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleCoverFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          {/* Instagram */}
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Instagram del autor</p>
            <input
              type="text" placeholder="@artista" value={instagram}
              onChange={e => setInstagram(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}
            />
          </div>

          {/* Descripción */}
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Descripción breve</p>
            <textarea
              rows={3} placeholder="Breve descripción técnica o del proceso..." value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* Tags */}
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Tags (separados por coma)</p>
            <input
              type="text" placeholder="blackwork, proceso, fineline" value={tags}
              onChange={e => setTags(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}
            />
          </div>

          {/* Programar */}
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Programar publicación (opcional)</p>
            <input
              type="datetime-local" value={publishAt}
              onChange={e => setPublishAt(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', colorScheme: 'dark' }}
            />
            {!publishAt && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>Sin fecha → publica ahora</p>}
          </div>

          {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}
          {uploadProgress && <p style={{ fontSize: 12, color: 'rgba(239,255,66,0.7)' }}>{uploadProgress}</p>}

          <button
            onClick={submit} disabled={uploading}
            style={{ padding: '12px', background: uploading ? 'rgba(239,255,66,0.3)' : '#efff42', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, color: '#000', cursor: uploading ? 'default' : 'pointer' }}
          >
            {uploading ? 'Subiendo...' : 'Subir video'}
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Cargando...</p>
      ) : videos.length === 0 ? (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin videos aún</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {videos.map(v => {
            const st = statusLabel(v)
            return (
              <div key={v.id} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, alignItems: 'flex-start' }}>

                {/* Thumbnail */}
                <div style={{ width: 56, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#111' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${st.color}22`, border: `1px solid ${st.color}55`, color: st.color }}>
                      {st.label}
                    </span>
                    <a href={`https://instagram.com/${v.author_instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#efff42', textDecoration: 'none', fontWeight: 600 }}>
                      {v.author_instagram.startsWith('@') ? v.author_instagram : `@${v.author_instagram}`}
                    </a>
                  </div>

                  {v.description && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, marginBottom: 4 }}>{v.description}</p>
                  )}

                  {v.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                      {v.tags.map(t => (
                        <span key={t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,255,66,0.07)', border: '1px solid rgba(239,255,66,0.15)', color: 'rgba(239,255,66,0.7)' }}>{t}</span>
                      ))}
                    </div>
                  )}

                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                    {v.publish_at && !v.active ? `Programado: ${fmtDate(v.publish_at)}` : v.published_at ? `Publicado: ${fmtDate(v.published_at)}` : `Creado: ${fmtDate(v.created_at)}`}
                    {v.archived_at && ` · Archivado: ${fmtDate(v.archived_at)}`}
                  </p>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {v.active && !v.archived_at && (
                    <button onClick={() => archive(v.id)}
                      style={{ fontSize: 11, padding: '5px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 7, color: '#f59e0b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Archivar
                    </button>
                  )}
                  <button onClick={() => remove(v.id)}
                    style={{ fontSize: 11, padding: '5px 10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 7, color: '#f87171', cursor: 'pointer' }}>
                    Borrar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
