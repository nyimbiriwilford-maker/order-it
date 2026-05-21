import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import translations from './translations'

const PrefsContext = createContext()

const LANG_LOCALES = {
  en:  'en-MW',
  ny:  'en-MW',
  tum: 'en-MW',
  sw:  'sw-TZ',
  fr:  'fr-FR',
}

const CURRENCY_LOCALES = {
  MWK: 'en-MW',
  USD: 'en-US',
  ZAR: 'en-ZA',
}

export function PrefsProvider({ children }) {
  const [theme,    setThemeState]    = useState(() => localStorage.getItem('oi_theme')    || 'light')
  const [language, setLanguageState] = useState(() => localStorage.getItem('oi_lang')     || 'en')
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('oi_currency') || 'MWK')

  // ── theme → data-theme on <html> ─────────────────────────────────────────
  useEffect(() => {
    const root        = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark      = theme === 'dark' || (theme === 'system' && prefersDark)
    root.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('oi_theme', theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  // ── language → <html lang> ───────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('lang', language)
    localStorage.setItem('oi_lang', language)
  }, [language])

  // ── currency → persist ───────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('oi_currency', currency)
  }, [currency])

  const setTheme    = (v) => setThemeState(v)
  const setLanguage = (v) => setLanguageState(v)
  const setCurrency = (v) => setCurrencyState(v)

  // ── formatPrice ───────────────────────────────────────────────────────────
  const formatPrice = (amount) => {
    if (amount === undefined || amount === null) return '—'
    try {
      return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || 'en-MW', {
        style:                 'currency',
        currency:              currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(amount))
    } catch {
      return `${currency} ${Number(amount).toLocaleString()}`
    }
  }

  // ── t(): translate a key to the current language ──────────────────────────
  // Supports {placeholder} interpolation: t('Across {n} orders', { n: 3 })
  // Missing keys return the English key + [?] so you can spot gaps.
  const t = useCallback((key, vars = {}) => {
    const entry = translations[key]
    let result

    if (!entry) {
      result = `${key} [?]`
    } else {
      const lang = language in entry ? language : 'en'
      result = entry[lang] ?? entry['en'] ?? `${key} [?]`
    }

    Object.entries(vars).forEach(([k, v]) => {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
    })

    return result
  }, [language])

  return (
    <PrefsContext.Provider value={{
      theme,    setTheme,
      language, setLanguage,
      currency, setCurrency,
      formatPrice,
      t,
    }}>
      {children}
    </PrefsContext.Provider>
  )
}

export const usePrefs = () => useContext(PrefsContext)