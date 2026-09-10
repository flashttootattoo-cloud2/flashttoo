'use client'
import { useEffect, useRef, useState } from 'react'

type CulturaVideo = {
  id: string
  video_url: string | null
  cover_image_url: string
  author_instagram: string
  author_flashttoo_slug: string | null
  instagram_video_url: string | null
  description: string | null
  description_en: string | null
  description_pt: string | null
  tags: string[]
  tags_en: string[]
  tags_pt: string[]
  publish_at: string | null
  published_at: string | null
  archived_at: string | null
  mute_audio: boolean
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

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editError, setEditError]     = useState('')

  // form fields
  const [videoFile, setVideoFile]     = useState<File | null>(null)
  const [coverFile, setCoverFile]     = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [instagram, setInstagram]         = useState('')
  const [hasFlashttoo, setHasFlashttoo]   = useState(false)
  const [igVideoUrl, setIgVideoUrl]       = useState('')
  const [descEn, setDescEn]               = useState('')
  const [descPt, setDescPt]               = useState('')
  const [tagsEn, setTagsEn]               = useState('')
  const [tagsPt, setTagsPt]               = useState('')
  const [langTab, setLangTab]             = useState<'es'|'en'|'pt'>('es')
  const [editLangTab, setEditLangTab]     = useState<'es'|'en'|'pt'>('es')
  const [muteAudio, setMuteAudio]         = useState(false)
  const [saveAsDraft, setSaveAsDraft]     = useState(false)
  const [editIsDraft, setEditIsDraft]     = useState(false)
  const [description, setDescription] = useState('')
  const [tags, setTags]               = useState('')
  const [publishAt, setPublishAt]     = useState('')

  // frame capture
  const [videoDuration, setVideoDuration] = useState(0)
  const [scrubTime, setScrubTime]         = useState(0)
  const [coverMode, setCoverMode]         = useState<'capture' | 'upload'>('capture')
  const [frameCaptured, setFrameCaptured] = useState(false)

  const videoInputRef  = useRef<HTMLInputElement>(null)
  const coverInputRef  = useRef<HTMLInputElement>(null)
  const videoElemRef   = useRef<HTMLVideoElement>(null)
  const canvasRef      = useRef<HTMLCanvasElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/cultura-videos', { headers: H(pass) }).then(r => r.json()).catch(() => ({ videos: [] }))
    setVideos(r.videos ?? [])
    setLoading(false)
  }

  function handleVideoFile(f: File | null) {
    setVideoFile(f)
    setCoverFile(null); setCoverPreview(null); setFrameCaptured(false)
    setScrubTime(0); setVideoDuration(0)
    if (f) setVideoPreview(URL.createObjectURL(f))
    else setVideoPreview(null)
  }

  function handleCoverFile(f: File | null) {
    setCoverFile(f)
    setFrameCaptured(false)
    if (f) setCoverPreview(URL.createObjectURL(f))
    else setCoverPreview(null)
  }

  function handleScrub(t: number) {
    setScrubTime(t)
    if (videoElemRef.current) videoElemRef.current.currentTime = t
  }

  function captureFrame() {
    const video  = videoElemRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth  || 720
    canvas.height = video.videoHeight || 1280
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' })
      setCoverFile(file)
      setCoverPreview(canvas.toDataURL('image/jpeg', 0.92))
      setFrameCaptured(true)
    }, 'image/jpeg', 0.92)
  }

  async function submit() {
    if (!videoFile) { setError('Seleccioná un video'); return }
    if (!coverFile) { setError('Capturá un fotograma o subí una portada'); return }
    if (!instagram.trim()) { setError('Ingresá el Instagram del autor'); return }

    setUploading(true); setError('')

    try {
      const id = crypto.randomUUID()
      const videoExt = videoFile.name.split('.').pop() || 'mp4'
      const coverExt = coverFile.name.split('.').pop() || 'jpg'
      const videoPath = `cultura-videos/${id}/video.${videoExt}`
      const coverPath = `cultura-videos/${id}/cover.${coverExt}`

      // 1. Obtener URLs pre-firmadas
      setUploadProgress('Preparando...')
      const [vp, cp] = await Promise.all([
        fetch('/api/upload-presign', { method: 'POST', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ path: videoPath, contentType: videoFile.type }) }).then(r => r.json()),
        fetch('/api/upload-presign', { method: 'POST', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ path: coverPath, contentType: coverFile.type }) }).then(r => r.json()),
      ])
      if (vp.error || cp.error) { setError(vp.error || cp.error); setUploading(false); setUploadProgress(''); return }

      // 2. Subir directamente a R2 desde el browser
      setUploadProgress('Subiendo video...')
      await fetch(vp.uploadUrl, { method: 'PUT', headers: { 'Content-Type': videoFile.type }, body: videoFile })

      setUploadProgress('Subiendo portada...')
      await fetch(cp.uploadUrl, { method: 'PUT', headers: { 'Content-Type': coverFile.type }, body: coverFile })

      // 3. Guardar metadata en DB
      setUploadProgress('Guardando...')
      const body = {
        id,
        video_url:             vp.publicUrl,
        cover_image_url:       cp.publicUrl,
        author_instagram:      instagram.trim(),
        author_flashttoo_slug: hasFlashttoo ? instagram.trim().replace('@', '') : null,
        instagram_video_url:   igVideoUrl.trim() || null,
        description:           description.trim() || null,
        description_en:        descEn.trim() || null,
        description_pt:        descPt.trim() || null,
        tags:                  tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        tags_en:               tagsEn ? tagsEn.split(',').map(t => t.trim()).filter(Boolean) : [],
        tags_pt:               tagsPt ? tagsPt.split(',').map(t => t.trim()).filter(Boolean) : [],
        mute_audio:            muteAudio,
        publish_at:            publishAt ? new Date(publishAt).toISOString() : null,
        draft:                 saveAsDraft,
      }
      const r = await fetch('/api/cultura-videos', { method: 'POST', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).catch(() => ({ error: 'Error de red' }))
      setUploading(false); setUploadProgress('')

      if (r.error) { setError(r.error); return }

      setVideoFile(null); setCoverFile(null); setVideoPreview(null); setCoverPreview(null)
      setInstagram(''); setHasFlashttoo(false); setIgVideoUrl('')
      setDescription(''); setTags(''); setDescEn(''); setTagsEn(''); setDescPt(''); setTagsPt('')
      setPublishAt(''); setLangTab('es'); setMuteAudio(false); setSaveAsDraft(false)
      setScrubTime(0); setVideoDuration(0); setFrameCaptured(false)
      setFormOpen(false)
      load()
    } catch {
      setError('Error al subir. Revisá la conexión e intentá de nuevo.')
      setUploading(false); setUploadProgress('')
    }
  }

  async function activateVideo(id: string) {
    await fetch('/api/cultura-videos', { method: 'PUT', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: true }) })
    load()
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar este video? Se borrará el video de R2 y solo quedará la portada.')) return
    await fetch('/api/cultura-videos', { method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  function startEdit(v: CulturaVideo) {
    setEditingId(v.id)
    setInstagram(v.author_instagram)
    setHasFlashttoo(!!v.author_flashttoo_slug)
    setIgVideoUrl(v.instagram_video_url ?? '')
    setDescription(v.description ?? '')
    setTags(v.tags.join(', '))
    setDescEn(v.description_en ?? '')
    setTagsEn((v.tags_en ?? []).join(', '))
    setDescPt(v.description_pt ?? '')
    setTagsPt((v.tags_pt ?? []).join(', '))
    setPublishAt(v.publish_at ? toLocalInput(v.publish_at) : '')
    setMuteAudio(v.mute_audio ?? false)
    setEditIsDraft(!v.active && !v.publish_at && !v.archived_at)
    setEditLangTab('es')
    setEditError('')
    setFormOpen(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setInstagram(''); setHasFlashttoo(false); setIgVideoUrl('')
    setDescription(''); setTags(''); setDescEn(''); setTagsEn(''); setDescPt(''); setTagsPt('')
    setPublishAt(''); setMuteAudio(false); setEditIsDraft(false); setEditError('')
  }

  async function saveEdit() {
    if (!editingId) return
    setEditError('')
    const body = {
      id: editingId,
      author_instagram:      instagram.trim(),
      author_flashttoo_slug: hasFlashttoo ? instagram.trim().replace('@', '') : null,
      instagram_video_url:   igVideoUrl.trim() || null,
      description:           description.trim() || null,
      tags:                  tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      description_en:        descEn.trim() || null,
      tags_en:               tagsEn ? tagsEn.split(',').map(t => t.trim()).filter(Boolean) : [],
      description_pt:        descPt.trim() || null,
      tags_pt:               tagsPt ? tagsPt.split(',').map(t => t.trim()).filter(Boolean) : [],
      publish_at:            publishAt ? new Date(publishAt).toISOString() : null,
      mute_audio:            muteAudio,
      draft:                 editIsDraft && !publishAt,
    }
    const r = await fetch('/api/cultura-videos', {
      method: 'PUT',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json()).catch(() => ({ error: 'Error de red' }))
    if (r.error) { setEditError(r.error); return }
    cancelEdit()
    load()
  }

  async function remove(id: string) {
    if (!confirm('¿Borrar completamente este video?')) return
    await fetch('/api/cultura-videos', { method: 'DELETE', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const active    = videos.filter(v => v.active && !v.archived_at)
  const scheduled = videos.filter(v => !v.active && v.publish_at && !v.archived_at)
  const archived  = videos.filter(v => !!v.archived_at)

  function fmt(s: number) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

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

          {/* Video */}
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Video (MP4/MOV)</p>
            <div
              onClick={() => !videoFile && videoInputRef.current?.click()}
              style={{ position: 'relative', width: '100%', maxWidth: 160, aspectRatio: '9/16', background: 'rgba(255,255,255,0.04)', border: `2px dashed ${videoFile ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, cursor: videoFile ? 'default' : 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {videoPreview
                ? <video
                    ref={videoElemRef}
                    src={videoPreview}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    muted playsInline
                    onLoadedMetadata={e => {
                      const d = (e.target as HTMLVideoElement).duration
                      setVideoDuration(isFinite(d) ? d : 0)
                    }}
                  />
                : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Elegir video</span>
              }
            </div>
            <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleVideoFile(e.target.files?.[0] ?? null)} />
            {videoFile && (<>
              <button onClick={() => videoInputRef.current?.click()} style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Cambiar video
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', marginTop: 4 }}>
                <input type="checkbox" checked={muteAudio} onChange={e => setMuteAudio(e.target.checked)} style={{ accentColor: '#efff42', width: 14, height: 14 }} />
                <span style={{ fontSize: 11, color: muteAudio ? '#efff42' : 'rgba(255,255,255,0.35)' }}>Silenciar audio del video</span>
              </label>
            </>)}
          </div>

          {/* Frame capture */}
          {videoPreview && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Portada</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setCoverMode('capture')} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, border: `1px solid ${coverMode === 'capture' ? '#efff42' : 'rgba(255,255,255,0.1)'}`, background: coverMode === 'capture' ? 'rgba(239,255,66,0.1)' : 'transparent', color: coverMode === 'capture' ? '#efff42' : 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>Fotograma</button>
                  <button onClick={() => setCoverMode('upload')} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, border: `1px solid ${coverMode === 'upload' ? '#efff42' : 'rgba(255,255,255,0.1)'}`, background: coverMode === 'upload' ? 'rgba(239,255,66,0.1)' : 'transparent', color: coverMode === 'upload' ? '#efff42' : 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>Subir imagen</button>
                </div>
              </div>

              {coverMode === 'capture' ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {/* Preview portada capturada */}
                  <div style={{ width: 80, aspectRatio: '9/16', borderRadius: 8, overflow: 'hidden', background: '#111', flexShrink: 0, border: `1px solid ${frameCaptured ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.07)'}` }}>
                    {coverPreview
                      ? <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '0 4px' }}>Sin capturar</span>
                        </div>
                    }
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Scrubber */}
                    {videoDuration > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="range" min={0} max={videoDuration} step={0.05} value={scrubTime}
                          onChange={e => handleScrub(parseFloat(e.target.value))}
                          style={{ flex: 1, accentColor: '#efff42' }}
                        />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{fmt(scrubTime)} / {fmt(videoDuration)}</span>
                      </div>
                    )}
                    <button
                      onClick={captureFrame}
                      style={{ fontSize: 11, fontWeight: 700, padding: '8px 0', background: frameCaptured ? 'rgba(239,255,66,0.1)' : '#efff42', border: `1px solid ${frameCaptured ? 'rgba(239,255,66,0.4)' : 'transparent'}`, borderRadius: 8, color: frameCaptured ? '#efff42' : '#000', cursor: 'pointer' }}
                    >
                      {frameCaptured ? '↺ Capturar otro' : 'Capturar fotograma'}
                    </button>
                    {frameCaptured && <p style={{ fontSize: 10, color: 'rgba(239,255,66,0.5)' }}>Fotograma listo como portada</p>}
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    onClick={() => coverInputRef.current?.click()}
                    style={{ position: 'relative', width: 80, aspectRatio: '9/16', background: 'rgba(255,255,255,0.04)', border: `2px dashed ${coverFile && !frameCaptured ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {coverPreview && !frameCaptured
                      ? <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '0 4px' }}>Elegir imagen</span>
                    }
                  </div>
                  <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleCoverFile(e.target.files?.[0] ?? null)} />
                </div>
              )}
            </div>
          )}

          {/* Canvas oculto para captura */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Autor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Instagram del autor</p>
            </div>
            <input
              type="text" placeholder="@artista" value={instagram}
              onChange={e => setInstagram(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={hasFlashttoo} onChange={e => setHasFlashttoo(e.target.checked)} style={{ accentColor: '#efff42', width: 14, height: 14 }} />
              <span style={{ fontSize: 11, color: hasFlashttoo ? '#efff42' : 'rgba(255,255,255,0.35)' }}>
                Tiene perfil en Flashttoo → abre su perfil en la app
              </span>
            </label>
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Link al video en Instagram <span style={{ color: 'rgba(255,255,255,0.2)' }}>(opcional — se muestra cuando se archiva)</span></p>
              </div>
              <input
                type="url" placeholder="https://www.instagram.com/p/..." value={igVideoUrl}
                onChange={e => setIgVideoUrl(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}
              />
            </div>
          </div>

          {/* Descripción y tags por idioma */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {(['es','en','pt'] as const).map(l => (
                <button key={l} onClick={() => setLangTab(l)} style={{ flex: 1, padding: '8px', fontSize: 11, fontWeight: 700, background: 'none', border: 'none', borderBottom: `2px solid ${langTab === l ? '#efff42' : 'transparent'}`, color: langTab === l ? '#efff42' : 'rgba(255,255,255,0.3)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {l === 'es' ? 'Español' : l === 'en' ? 'English' : 'Português'}
                </button>
              ))}
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {langTab === 'es' && <>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Descripción</p>
                  <textarea rows={3} placeholder="Descripción en español..." value={description} onChange={e => setDescription(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical' }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Tags (separados por coma)</p>
                  <input type="text" placeholder="blackwork, proceso, fineline" value={tags} onChange={e => setTags(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }} />
                </div>
              </>}
              {langTab === 'en' && <>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Description</p>
                  <textarea rows={3} placeholder="Description in English..." value={descEn} onChange={e => setDescEn(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical' }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Tags (comma separated)</p>
                  <input type="text" placeholder="blackwork, process, fineline" value={tagsEn} onChange={e => setTagsEn(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }} />
                </div>
              </>}
              {langTab === 'pt' && <>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Descrição</p>
                  <textarea rows={3} placeholder="Descrição em português..." value={descPt} onChange={e => setDescPt(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical' }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Tags (separadas por vírgula)</p>
                  <input type="text" placeholder="blackwork, processo, fineline" value={tagsPt} onChange={e => setTagsPt(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }} />
                </div>
              </>}
            </div>
          </div>

          {/* Programar */}
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Programar publicación (opcional)</p>
            <input
              type="datetime-local" value={publishAt}
              onChange={e => setPublishAt(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', colorScheme: 'dark' }}
            />
            {!publishAt && !saveAsDraft && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>Sin fecha → publica ahora</p>}
          </div>

          {/* Borrador */}
          {!publishAt && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={saveAsDraft} onChange={e => setSaveAsDraft(e.target.checked)} style={{ accentColor: '#efff42', width: 14, height: 14 }} />
              <span style={{ fontSize: 11, color: saveAsDraft ? '#efff42' : 'rgba(255,255,255,0.35)' }}>
                Guardar como borrador — publica cuando vos lo actives
              </span>
            </label>
          )}

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
            const isEditing = editingId === v.id
            const previewUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/preview/cultura/${v.id}`
            return (
              <div key={v.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isEditing ? 'rgba(239,255,66,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Header row */}
                <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'flex-start' }}>
                  <div style={{ width: 56, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#111' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${st.color}22`, border: `1px solid ${st.color}55`, color: st.color }}>{st.label}</span>
                      <a href={`https://instagram.com/${v.author_instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: '#efff42', textDecoration: 'none', fontWeight: 600 }}>
                        {v.author_instagram.startsWith('@') ? v.author_instagram : `@${v.author_instagram}`}
                      </a>
                    </div>
                    {v.description && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, marginBottom: 4 }}>
                        {v.description.split(/(@[\w.]+)/g).map((part, i) =>
                          /^@[\w.]+$/.test(part)
                            ? <a key={i} href={`https://instagram.com/${part.slice(1)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#efff42', textDecoration: 'none', fontWeight: 600 }}>{part}</a>
                            : part
                        )}
                      </p>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => isEditing ? cancelEdit() : startEdit(v)}
                      style={{ fontSize: 11, padding: '5px 10px', background: isEditing ? 'rgba(239,255,66,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isEditing ? 'rgba(239,255,66,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 7, color: isEditing ? '#efff42' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                      {isEditing ? 'Cancelar' : 'Editar'}
                    </button>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', textDecoration: 'none', textAlign: 'center' }}>
                      Preview
                    </a>
                    {!v.active && !v.archived_at && !v.publish_at && (
                      <button onClick={() => activateVideo(v.id)}
                        style={{ fontSize: 11, padding: '5px 10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 7, color: '#4ade80', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Activar
                      </button>
                    )}
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

                {/* Edit form inline */}
                {isEditing && (
                  <div style={{ borderTop: '1px solid rgba(239,255,66,0.1)', padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Instagram + Flashttoo */}
                    <div>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Instagram</p>
                      <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@artista"
                        style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                      <input type="checkbox" checked={hasFlashttoo} onChange={e => setHasFlashttoo(e.target.checked)} style={{ accentColor: '#efff42' }} />
                      <span style={{ fontSize: 11, color: hasFlashttoo ? '#efff42' : 'rgba(255,255,255,0.35)' }}>Tiene perfil en Flashttoo</span>
                    </label>
                    <div>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Link al video en Instagram</p>
                      <input type="url" value={igVideoUrl} onChange={e => setIgVideoUrl(e.target.value)} placeholder="https://www.instagram.com/p/..."
                        style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                      <input type="checkbox" checked={muteAudio} onChange={e => setMuteAudio(e.target.checked)} style={{ accentColor: '#efff42' }} />
                      <span style={{ fontSize: 11, color: muteAudio ? '#efff42' : 'rgba(255,255,255,0.35)' }}>Silenciar audio del video</span>
                    </label>
                    {!publishAt && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editIsDraft} onChange={e => setEditIsDraft(e.target.checked)} style={{ accentColor: '#efff42' }} />
                        <span style={{ fontSize: 11, color: editIsDraft ? '#efff42' : 'rgba(255,255,255,0.35)' }}>Mantener como borrador</span>
                      </label>
                    )}

                    {/* Descripción y tags por idioma */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {(['es','en','pt'] as const).map(l => (
                          <button key={l} onClick={() => setEditLangTab(l)} style={{ flex: 1, padding: '7px', fontSize: 11, fontWeight: 700, background: 'none', border: 'none', borderBottom: `2px solid ${editLangTab === l ? '#efff42' : 'transparent'}`, color: editLangTab === l ? '#efff42' : 'rgba(255,255,255,0.3)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {l === 'es' ? 'ES' : l === 'en' ? 'EN' : 'PT'}
                          </button>
                        ))}
                      </div>
                      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {editLangTab === 'es' && <>
                          <div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Descripción</p>
                            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción en español..."
                              style={{ width: '100%', padding: '6px 9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Tags (separados por coma)</p>
                            <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="blackwork, proceso"
                              style={{ width: '100%', padding: '6px 9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none' }} />
                          </div>
                        </>}
                        {editLangTab === 'en' && <>
                          <div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Description</p>
                            <textarea rows={2} value={descEn} onChange={e => setDescEn(e.target.value)} placeholder="Description in English..."
                              style={{ width: '100%', padding: '6px 9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Tags (comma separated)</p>
                            <input type="text" value={tagsEn} onChange={e => setTagsEn(e.target.value)} placeholder="blackwork, process"
                              style={{ width: '100%', padding: '6px 9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none' }} />
                          </div>
                        </>}
                        {editLangTab === 'pt' && <>
                          <div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Descrição</p>
                            <textarea rows={2} value={descPt} onChange={e => setDescPt(e.target.value)} placeholder="Descrição em português..."
                              style={{ width: '100%', padding: '6px 9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Tags (separadas por vírgula)</p>
                            <input type="text" value={tagsPt} onChange={e => setTagsPt(e.target.value)} placeholder="blackwork, processo"
                              style={{ width: '100%', padding: '6px 9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none' }} />
                          </div>
                        </>}
                      </div>
                    </div>

                    {/* Programar publicación */}
                    <div>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Programar publicación (opcional)</p>
                      <input
                        type="datetime-local" value={publishAt}
                        onChange={e => { setPublishAt(e.target.value); if (e.target.value) setEditIsDraft(false) }}
                        style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none', colorScheme: 'dark' }}
                      />
                      {publishAt && <button onClick={() => setPublishAt('')} style={{ marginLeft: 8, fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕ quitar</button>}
                    </div>

                    {editError && <p style={{ fontSize: 11, color: '#f87171' }}>{editError}</p>}
                    <button onClick={saveEdit}
                      style={{ padding: '9px', background: '#efff42', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, color: '#000', cursor: 'pointer' }}>
                      Guardar cambios
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
