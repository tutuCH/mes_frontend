import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enCommon from '../locales/en/common.json'
import zhTWCommon from '../locales/zh-TW/common.json'
import zhCNCommon from '../locales/zh-CN/common.json'

const resources = {
  en: {
    common: enCommon
  },
  'zh-TW': {
    common: zhTWCommon
  },
  'zh-CN': {
    common: zhCNCommon
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-TW', // Default language
    fallbackLng: 'zh-TW',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false // React already escapes
    },
    react: {
      useSuspense: false
    }
  })

export default i18n
