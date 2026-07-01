import { defineRule, configure } from 'vee-validate'
import { localize } from '@vee-validate/i18n'
import zh from '@/locales/zh'
import en from '@/locales/en'

// 全局校验规则
defineRule('required', (value: unknown) => {
  if (value === undefined || value === null || value === '') return false
  if (typeof value === 'string' && !value.trim().length) return false
  return true
})

defineRule('email', (value: unknown) => {
  if (!value || typeof value !== 'string') return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
})

defineRule('match', (value: unknown, [target]: unknown[]) => {
  return value === target
})

defineRule('minLength', (value: unknown, [min]: number[]) => {
  if (!value || typeof value !== 'string') return true
  return value.length >= min
})

// 根据当前语言动态更新校验消息
export function updateVeeValidateLocale(lang: 'zh' | 'en') {
  const localeMessages = lang === 'zh' ? zh.veeValidate : en.veeValidate
  configure({
    generateMessage: localize({
      [lang]: localeMessages,
    }),
  })
}
