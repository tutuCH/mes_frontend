import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Language = 'en' | 'zh-TW' | 'zh-CN' | 'vi'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const [language, setLanguageState] = useState<Language>('zh-TW')

  useEffect(() => {
    // Load saved language from localStorage
    const saved = localStorage.getItem('mes-language') as Language
    if (saved && ['en', 'zh-TW', 'zh-CN', 'vi'].includes(saved)) {
      setLanguageState(saved)
      i18n.changeLanguage(saved)
    }
  }, [i18n])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    i18n.changeLanguage(lang)
    localStorage.setItem('mes-language', lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
