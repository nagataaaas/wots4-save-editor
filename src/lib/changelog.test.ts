import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, describe, expect, it } from 'vitest'
import { ChangelogList } from '@/components/changelog-dialog'
import { changelog, hasUnseenChangelog, isUnseen, latestChangelogDate } from './changelog'
import { setCurrentLanguage } from './i18n'

const JAPANESE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u
// 画面に出さない確度・内部の情報（AGENTS.md「UI に確度を出さない」「UI には使う人が気にすることだけを書く」）
const FORBIDDEN = /✅|🟢|🟡|🔶|❓|未確認|要ゲーム内確認|確認済み|未検証|推測|推定|確度|判定待ち|U-[0-9]+|D-[0-9]+|0x[0-9a-f]/i
const FORBIDDEN_EN = /unconfirmed|unverified|not verified|estimated|guess|speculat|certainty/i

describe('changelog', () => {
  it('日付は YYYY-MM-DD で、重複なく新しい順', () => {
    for (const { date } of changelog) expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (let i = 1; i < changelog.length; i++) expect(changelog[i - 1].date > changelog[i].date).toBe(true)
    expect(latestChangelogDate).toBe(changelog[0].date)
  })

  it('各項目に日本語と英語があり、英語に日本語が残っていない', () => {
    for (const entry of changelog) {
      expect(entry.items.length).toBeGreaterThan(0)
      for (const item of entry.items) {
        expect(item.ja.trim()).not.toBe('')
        expect(item.en.trim()).not.toBe('')
        expect(item.en).not.toMatch(JAPANESE)
      }
    }
  })

  it('確度や内部の情報を書かない', () => {
    for (const entry of changelog) {
      for (const item of entry.items) {
        expect(item.ja).not.toMatch(FORBIDDEN)
        expect(item.en).not.toMatch(FORBIDDEN)
        expect(item.en).not.toMatch(FORBIDDEN_EN)
      }
    }
  })

  it('新着は前回見た日付より新しい日付だけ。見たことがなければ付けない', () => {
    expect(isUnseen('2026-10-15', null)).toBe(false)
    expect(isUnseen('2026-10-15', '2026-10-15')).toBe(false)
    expect(isUnseen('2026-10-14', '2026-10-15')).toBe(false)
    expect(isUnseen('2026-10-15', '2026-10-14')).toBe(true)
  })

  it('見たことがないか、一番新しい日付を見ていなければボタンに印を出す', () => {
    expect(hasUnseenChangelog(null)).toBe(true)
    expect(hasUnseenChangelog(latestChangelogDate)).toBe(false)
    expect(hasUnseenChangelog('2000-01-01')).toBe(true)
  })
})

describe('ChangelogList', () => {
  afterAll(() => setCurrentLanguage('ja'))

  it('英語で描いても日本語が残らず、前回より新しい日付にだけ New を付ける', () => {
    setCurrentLanguage('en')
    const seen = changelog[1]?.date ?? null
    const html = renderToStaticMarkup(createElement(ChangelogList, { seen }))
    expect(html).not.toMatch(JAPANESE)
    expect(html.match(/>New</g)?.length ?? 0).toBe(changelog.filter((e) => isUnseen(e.date, seen)).length)
  })

  it('前回見た日付がなければ New を付けない', () => {
    setCurrentLanguage('ja')
    const html = renderToStaticMarkup(createElement(ChangelogList, { seen: null }))
    expect(html).not.toContain('新着')
  })
})
