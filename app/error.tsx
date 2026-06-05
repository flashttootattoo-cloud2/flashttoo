'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#000' }}>
      <div className="text-center flex flex-col items-center gap-5">
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Algo salió mal
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', maxWidth: 280, lineHeight: 1.6 }}>
          Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
        </p>
        <div className="flex gap-3">
          <button onClick={reset}
            className="px-5 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ background: '#efff42', color: '#000' }}>
            Reintentar
          </button>
          <Link href="/"
            className="px-5 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
