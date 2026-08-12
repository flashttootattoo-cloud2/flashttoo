'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type Language = { code: string; name: string; flag: string }
export type Translations = Record<string, Record<string, string>>

interface TCtx {
  t: (section: string, key: string, fallback?: string) => string
  language: string
  setLanguage: (code: string) => void
  languages: Language[]
}

const TranslationContext = createContext<TCtx>({
  t: (_s, _k, fb) => fb ?? '',
  language: 'es',
  setLanguage: () => {},
  languages: [],
})

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang]   = useState('es')
  const [languages, setLangs] = useState<Language[]>([])
  const [translations, setTr] = useState<Translations>({})

  useEffect(() => {
    fetch('/api/languages').then(r => r.json()).then(d => {
      if (Array.isArray(d.languages)) setLangs(d.languages)
    }).catch(() => {})

    try {
      const saved = localStorage.getItem('flashttoo_lang')
      if (saved) { setLang(saved); return }
    } catch {}
    const detected = navigator.language.slice(0, 2).toLowerCase()
    setLang(detected)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/translations/${language}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (d.translations) setTr(d.translations) })
      .catch(() => {})
    return () => controller.abort()
  }, [language])

  const setLanguage = useCallback((code: string) => {
    setLang(code)
    try { localStorage.setItem('flashttoo_lang', code) } catch {}
  }, [])

  const t = useCallback((section: string, key: string, fallback = ''): string => {
    return translations[section]?.[key] || fallback
  }, [translations])

  return (
    <TranslationContext.Provider value={{ t, language, setLanguage, languages }}>
      {children}
    </TranslationContext.Provider>
  )
}

export const useTranslation = () => useContext(TranslationContext)
