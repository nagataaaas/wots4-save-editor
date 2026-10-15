import type { Language } from '@/save/master/label-types'

export type { Language }

/**
 * 画面に出す文言の日本語と英語。文言は使う場所に両方を並べて書き、tr() で今の言語の方を取り出す。
 * セーブを読む関数（src/save/**）の警告・ラベルも、この形で返すか、その場で tr() する
 */
export type Localized = { ja: string; en: string }

export const LANGUAGES: readonly Language[] = ['ja', 'en']

/** URL の検索文字列で言語を指定する名前（`?lang=en`） */
export const LANGUAGE_PARAM = 'lang'
export const LANGUAGE_STORAGE_KEY = 'wots4-save-editor:language'

export const isLanguage = (value: unknown): value is Language => value === 'ja' || value === 'en'

/**
 * 今の言語。LanguageProvider が描く前に書き換え、言語を変えると画面を描き直す（App で key を変える）。
 * React の外（src/save/** の文言・モジュールの表）でも tr() で同じ言語を読めるように、モジュールの変数に持つ
 */
let current: Language = 'ja'

export function getLanguage(): Language {
  return current
}

export function setCurrentLanguage(lang: Language): void {
  current = lang
}

/** 今の言語の文言。英語が空なら日本語にする */
export function tr(text: Localized): string {
  return text[current] || text.ja
}

/** 決まった言語の文言（索引づくりなど、今の言語と違う方を読むとき） */
export function trIn(text: Localized, lang: Language): string {
  return text[lang] || text.ja
}

/**
 * 最初の言語を決める。URL の `?lang` ＞ 前回選んだ言語 ＞ ブラウザの言語（日本語なら日本語、それ以外は英語）。
 * ユーザー判断 2026-10-15
 */
export function initialLanguage(search: string, stored: string | null, browserLanguages: readonly string[]): Language {
  const param = new URLSearchParams(search).get(LANGUAGE_PARAM)
  if (isLanguage(param)) return param
  if (isLanguage(stored)) return stored
  return browserLanguages.some((l) => l.toLowerCase().startsWith('ja')) ? 'ja' : 'en'
}

/** URL に `?lang` があれば、その値を新しい言語に書き換えた URL。なければ null（URL は変えない） */
export function urlWithLanguage(href: string, lang: Language): string | null {
  const url = new URL(href)
  if (!url.searchParams.has(LANGUAGE_PARAM) || url.searchParams.get(LANGUAGE_PARAM) === lang) return null
  url.searchParams.set(LANGUAGE_PARAM, lang)
  return url.toString()
}
