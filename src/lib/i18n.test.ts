import { afterEach, describe, expect, it } from 'vitest'
import { getLanguage, initialLanguage, setCurrentLanguage, tr, trIn, urlWithLanguage } from './i18n'

describe('最初の言語（ユーザー判断 2026-10-15：URL ＞ 前回の選択 ＞ ブラウザの言語）', () => {
  it('URL の ?lang を最優先する', () => {
    expect(initialLanguage('?lang=en', 'ja', ['ja-JP'])).toBe('en')
    expect(initialLanguage('?x=1&lang=ja', 'en', ['en-US'])).toBe('ja')
  })
  it('URL の値が ja・en 以外なら、前回の選択を使う', () => {
    expect(initialLanguage('?lang=fr', 'en', ['ja'])).toBe('en')
    expect(initialLanguage('', 'ja', ['en-US'])).toBe('ja')
  })
  it('どちらもなければ、ブラウザの言語が日本語なら日本語、それ以外は英語', () => {
    expect(initialLanguage('', null, ['ja-JP', 'en'])).toBe('ja')
    expect(initialLanguage('', 'xx', ['en-US', 'ja'])).toBe('ja')
    expect(initialLanguage('', null, ['en-US'])).toBe('en')
    expect(initialLanguage('', null, [])).toBe('en')
  })
})

describe('切り替えたときの URL', () => {
  it('?lang があれば書き換え、ハッシュを保つ', () => {
    expect(urlWithLanguage('https://example.com/?lang=ja#/hero/vitals', 'en')).toBe('https://example.com/?lang=en#/hero/vitals')
  })
  it('?lang がない・同じ値なら URL を変えない', () => {
    expect(urlWithLanguage('https://example.com/#/hero', 'en')).toBeNull()
    expect(urlWithLanguage('https://example.com/?lang=en', 'en')).toBeNull()
  })
})

describe('tr', () => {
  afterEach(() => setCurrentLanguage('ja'))
  it('今の言語の文言を返し、英語が空なら日本語にする', () => {
    expect(getLanguage()).toBe('ja')
    expect(tr({ ja: '名前', en: 'Name' })).toBe('名前')
    setCurrentLanguage('en')
    expect(tr({ ja: '名前', en: 'Name' })).toBe('Name')
    expect(tr({ ja: '名前', en: '' })).toBe('名前')
    expect(trIn({ ja: '名前', en: 'Name' }, 'ja')).toBe('名前')
  })
})
