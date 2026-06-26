'use client'

import { useEffect, useState } from 'react'

export default function InstallBanner() {
  const [show, setShow]     = useState(false)
  const [isIOS, setIsIOS]   = useState(false)

  useEffect(() => {
    const ua  = navigator.userAgent
    const ios = /iPhone|iPad|iPod/.test(ua)
    const android = /Android/.test(ua)

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)

    // Solo trackear la primera vez que se abre en modo standalone (única fuente de verdad)
    if (isStandalone) {
      if (!localStorage.getItem('install_tracked')) {
        localStorage.setItem('install_tracked', '1')
        const platform = ios ? 'ios' : android ? 'android' : 'other'
        fetch('/api/track/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform }),
        }).catch(() => {})
      }
      return
    }

    // Solo mostrar banner en móvil
    if (!ios && !android) return

    setIsIOS(ios)
    setShow(true)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.95) 100%)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

      <div className="max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          {/* Ícono */}
          <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden"
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
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>
            ×
          </button>
        </div>

        {/* Barra amarilla decorativa */}
        <div className="mt-3 h-0.5 rounded-full" style={{ background: 'rgba(239,255,66,0.3)' }} />
      </div>
    </div>
  )
}
