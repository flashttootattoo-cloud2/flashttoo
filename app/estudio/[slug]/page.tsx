'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function StudioRedirect() {
  const { slug } = useParams<{ slug: string }>()

  useEffect(() => {
    window.location.replace(`/?estudio=${slug}`)
  }, [slug])

  return null
}
