import { createI18n } from 'vue-i18n'
import zh from '@/locales/zh'
import en from '@/locales/en'

const savedLang = localStorage.getItem('lang')

const i18n = createI18n({
  legacy: false,
  locale: savedLang === 'en' ? 'en' : 'zh',
  fallbackLocale: 'zh',
  messages: { zh, en },
})

export default i18n
