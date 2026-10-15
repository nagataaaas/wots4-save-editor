import { createContext, useContext } from 'react'
import type { Language } from '@/lib/i18n'

/** 画面の言語（日本語・英語）。切り替えはトップバー、最初の値は URL の `?lang`・前回の選択・ブラウザの言語（ユーザー判断 2026-10-15） */
export type LanguageValue = {
  lang: Language
  setLang: (lang: Language) => void
}

export const LanguageContext = createContext<LanguageValue | null>(null)

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
