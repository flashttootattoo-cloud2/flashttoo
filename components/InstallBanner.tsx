'use client'

import { useEffect, useState } from 'react'

export default function InstallBanner() {
  const [show, setShow]     = useState(false)
  const [isIOS, setIsIOS]   = useState(false)

  useEffect(() => {
    const ua      = navigator.userAgent
    const ios     = /iPhone|iPad|iPod/.test(ua)
    const android = /Android/.test(ua)

    function track(platform: string) {
      if (localStorage.getItem('install_tracked')) return
      localStorage.setItem('install_tracked', '1')
      fetch('/api/track/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      }).catch(() => {})
    }

    if (ios) {
      const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true
      if (isIOSStandalone) { track('ios'); return }
      setIsIOS(true); setShow(true)
      return
    }

    if (android) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      if (isStandalone) { track('android'); return }
      setShow(true)
      const onInstalled = () => track('android')
      window.addEventListener('appinstalled', onInstalled)
      return () => window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Auto-cierre después de 10 segundos
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => setShow(false), 20000)
    return () => clearTimeout(t)
  }, [show])

  if (!show) return null

  return (
    <div className="fixed left-0 right-0 z-50 px-4" style={{ bottom: 118 }}>
      <div className="max-w-sm mx-auto" style={{
        background: 'rgba(10,10,10,0.96)',
        backdropFilter: 'blur(16px)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.09)',
        padding: '14px 16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
      }}>
        <div className="flex items-start gap-3">
          {/* Ícono */}
          <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Icono-192.svg" alt="" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Instalá Flashttoo</p>
            {isIOS ? (
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                Tocá <span className="font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>Compartir</span> y luego{' '}
                <span className="font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>"Agregar a inicio"</span>
              </p>
            ) : (
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                Tocá el menú <span className="font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>⋮</span> y elegí{' '}
                <span className="font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>"Agregar a pantalla de inicio"</span>
              </p>
            )}
          </div>

          <button onClick={() => setShow(false)}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>
            ×
          </button>
        </div>

        <div className="mt-3 h-0.5 rounded-full" style={{ background: 'rgba(239,255,66,0.25)' }} />
      </div>
    </div>
  )
}
