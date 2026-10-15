import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { LanguageContext } from '@/lib/language-context'
import { initialLanguage, LANGUAGE_STORAGE_KEY, setCurrentLanguage, tr, urlWithLanguage, type Language } from '@/lib/i18n'

/** 前回選んだ言語を読む。読めない（プライベートモード・ストレージの無効化など）ときは null */
function loadStored(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

/** 選んだ言語を残す。残せなくても切り替えは止めない */
function store(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  } catch {
    // 残せないときはこのページを開いている間だけ保持する
  }
}

function startLanguage(): Language {
  const lang = initialLanguage(window.location.search, loadStored(), navigator.languages?.length ? navigator.languages : [navigator.language])
  setCurrentLanguage(lang)
  return lang
}

/**
 * 画面の言語を画面全体に共有する。tr() が読む言語（i18n.ts）を描く前に書き換え、
 * 選んだ言語は localStorage に残す。URL に `?lang` があればその値も書き換える（開き直しても同じ言語になる）
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(startLanguage)
  const setLang = useCallback((next: Language) => {
    setCurrentLanguage(next)
    setLangState(next)
    store(next)
    const url = urlWithLanguage(window.location.href, next)
    if (url) window.history.replaceState(window.history.state, '', url)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = tr({ ja: '侍道4 セーブデータエディタ', en: 'Way of the Samurai 4 Save Editor' })
  }, [lang])

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>
}
