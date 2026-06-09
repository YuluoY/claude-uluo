/**
 * i18n 国际化模块入口。
 * 所有用户可见文案通过 t() 引用，禁止在组件/代码中硬编码字符串。
 */
import { createI18n } from 'vue-i18n'
import type { I18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'

const messages = {
  'zh-CN': zhCN,
  en,
}

export type Locale = keyof typeof messages

const i18n: I18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en',
  messages,
})

export const { t } = i18n.global

export default i18n
