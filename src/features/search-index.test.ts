import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { collectSearchEntries } from './search-index-collect'
import { searchItems, toSearchItems, type SearchItem } from './search-index'
import { sections } from './sections'
import { matchFieldKey } from '@/lib/route'
import { searchKey } from '@/lib/search-collector'
import { EVENTS_LINKS } from './scenario/anchors'

const entries = collectSearchEntries(renderToStaticMarkup)
const items = toSearchItems(entries)
const crumbs = (i: SearchItem) => i.crumbs.join(' > ')

describe('検索の索引', () => {
  it('門・柵からの移動先となるルート分岐を、イベント画面の箱として登録する', () => {
    const anchor = EVENTS_LINKS.routeJudge
    expect(items.find(i => i.section === 'event-chart' && i.anchor === anchor && i.field === null)).toMatchObject({
      section: 'event-chart',
      anchor,
      field: null,
      crumbs: ['世界', 'イベント', '勢力の状態', '剣術大会以後のルート分岐'],
    })
  })
  it('画面で読む索引のファイルが、今の画面から集めた名前と同じ（違えば pnpm test -u で作り直す）', async () => {
    await expect(`${JSON.stringify(entries, null, 1)}\n`).toMatchFileSnapshot('./search-index.generated.json')
  })

  it('画面・箱・欄の名前をパンくずつきで拾う', () => {
    const plain = items.map(({ section, anchor, field, crumbs }) => ({ section, anchor, field, crumbs }))
    expect(plain).toContainEqual({ section: 'hero', anchor: '', field: null, crumbs: ['主人公', '基本情報'] })
    expect(plain).toContainEqual({ section: 'hero', anchor: 'name', field: null, crumbs: ['主人公', '基本情報', '名前'] })
    expect(plain).toContainEqual({
      section: 'hero',
      anchor: 'name',
      field: ['主人公名'],
      crumbs: ['主人公', '基本情報', '名前', '主人公名'],
    })
  })

  it('閉じている箱の中と、小見出しの下の欄も拾う', () => {
    const all = items.map(crumbs)
    expect(all).toContain('主人公 > 基本情報 > HP・活力・つま斬り > HP > 現在')
    // 帯刀の武器カードは最初は閉じている。その中の開閉できるまとまりの中の欄
    expect(items.some((i) => i.section === 'belt' && i.anchor.startsWith('weapon-') && i.field !== null)).toBe(true)
  })

  it('すべての画面が載っていて、同じ移動先・同じパンくずは1件だけ', () => {
    for (const s of sections) expect(items.some((i) => i.section === s.id && i.anchor === '' && i.field === null)).toBe(true)
    const keys = items.map((i) => `${i.section}|${i.anchor}|${i.field}|${crumbs(i)}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('欄の URL（箱の anchor と、箱より内側の名前の並び）から、その欄の data-search-key がひとつに決まる', () => {
    const keys = entries.filter((e) => !e.box).map((e) => ({ section: e.section, key: searchKey(e.anchor, e.path, e.label) }))
    for (const e of entries) {
      if (e.box) continue
      const item = items.find((i) => i.section === e.section && i.anchor === e.anchor && i.crumbs.join('').endsWith([...e.path, e.label].join('')) && i.field !== null)
      expect(item).toBeDefined()
      const sectionKeys = keys.filter((k) => k.section === e.section).map((k) => k.key)
      expect(matchFieldKey(sectionKeys, e.anchor || null, item!.field!)).toBe(searchKey(e.anchor, e.path, e.label))
    }
  })

  it('欄の URL には箱の名前を含めない', () => {
    const vitals = items.find((i) => i.crumbs.join(' > ') === '主人公 > 基本情報 > HP・活力・つま斬り > HP > 現在')
    expect(vitals).toMatchObject({ anchor: 'vitals', field: ['HP', '現在'] })
  })

  it('名前に確度・内部の値を含めない（AGENTS.md「UI に確度を出さない」「UI には使う人が気にすることだけを書く」）', () => {
    const banned = /✅|🟢|🟡|🔶|❓|未確認|要ゲーム内確認|確認済み|未検証|推測|推定|確度|判定待ち|U-[0-9]+|D-[0-9]+|0x[0-9a-f]/i
    for (const i of items) expect(crumbs(i)).not.toMatch(banned)
  })
})

describe('検索', () => {
  it('部分一致で引き、名前に一致するものを先に並べる', () => {
    const hits = searchItems(items, '主人公名')
    expect(crumbs(hits[0])).toBe('主人公 > 基本情報 > 名前 > 主人公名')
  })

  it('空白で区切った語はすべてパンくずのどこかに含まれるものだけ', () => {
    const hits = searchItems(items, '基本情報 現在')
    expect(hits.length).toBeGreaterThan(0)
    for (const h of hits) expect(crumbs(h)).toMatch(/基本情報.*現在/)
  })

  it('パンくずの途中で語が揃うときは、その下を出さずにその項目を1件だけ出す', () => {
    const hits = searchItems(items, 'HP・活力・つま斬り').map(crumbs)
    expect(hits).toEqual(['主人公 > 基本情報 > HP・活力・つま斬り'])
    // 小見出し「つま斬りゲージ」で揃えば、その下の「現在」「最大」は出さない
    const gauge = searchItems(items, 'つま斬りゲージ').map(crumbs)
    expect(gauge).toContain('主人公 > 基本情報 > HP・活力・つま斬り > つま斬りゲージ')
    expect(gauge).not.toContain('主人公 > 基本情報 > HP・活力・つま斬り > つま斬りゲージ > 現在')
  })

  it('下の項目の名前にも語が含まれるときは、外側の項目と下の項目を両方出す', () => {
    const hits = searchItems(items, '斬殺数').map(crumbs)
    expect(hits).toContain('武器 > 帯刀 > 1本目 > 斬殺数・つま斬り数')
    expect(hits).toContain('武器 > 帯刀 > 1本目 > 斬殺数・つま斬り数 > 斬殺数')
    // 名前に語を含まない「つま斬り数」は外側にまとめる
    expect(hits).not.toContain('武器 > 帯刀 > 1本目 > 斬殺数・つま斬り数 > つま斬り数')

    const hp = searchItems(items, 'HP').map(crumbs)
    expect(hp).toContain('主人公 > 基本情報 > HP・活力・つま斬り')
    expect(hp).toContain('主人公 > 基本情報 > HP・活力・つま斬り > HP')
    expect(hp).not.toContain('主人公 > 基本情報 > HP・活力・つま斬り > HP > 現在')
  })

  it('途中の名前が項目にない（フォルダ）ときは、その下のいちばん浅い項目を1件ずつ出す', () => {
    const hits = searchItems(items, '主人公').map(crumbs)
    expect(hits).toContain('主人公 > 基本情報')
    expect(hits).toContain('主人公 > 容姿')
    expect(hits).not.toContain('主人公 > 基本情報 > 名前')
    expect(new Set(hits).size).toBe(hits.length)
  })

  it('カタカナ・ひらがな、全角・半角の違いを無視する', () => {
    expect(searchItems(items, 'ｈｐ').length).toBe(searchItems(items, 'HP').length)
    expect(searchItems(items, 'なりわい').length).toBe(searchItems(items, 'ナリワイ').length)
  })

  it('空の検索語では何も出さない', () => {
    expect(searchItems(items, '  ')).toEqual([])
  })
})
