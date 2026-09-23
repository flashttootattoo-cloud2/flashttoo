import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Analytics } from '@vercel/analytics/next'

const BASE = 'https://flashttoo.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Flashttoo — Buscador de Tatuadores',
  description: 'Encontrá tatuadores por ciudad, país y estilo.',
  keywords: ['tatuadores', 'tattoo', 'tatuaje', 'buscador de tatuadores', 'artistas tatuaje', 'tatuadores argentina', 'tatuadores latinoamerica'],
  authors: [{ name: 'Flashttoo', url: BASE }],
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: BASE,
    siteName: 'Flashttoo',
    title: 'Flashttoo — Buscador de Tatuadores',
    description: 'Encontrá tatuadores por ciudad, país y estilo.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Flashttoo — Buscador de Tatuadores' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flashttoo — Buscador de Tatuadores',
    description: 'Encontrá tatuadores por ciudad, país y estilo.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: BASE,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: '/favicon-32.png',
    apple: '/app.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
