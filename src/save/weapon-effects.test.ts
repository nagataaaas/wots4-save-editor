// ✅ 銘・魅力の効果は [W] 鍛冶屋ページ（p20）の記載を確定として扱う（ユーザー判断 2026-10-05）。表の写し間違いがないかを確かめる
import { describe, expect, it } from 'vitest'
import { CHARMS, TITLES } from './weapon'
import { charmEffects, titleEffect } from './weapon-effects'

describe('銘の効果（[W] p20）', () => {
  it('すべての銘に効果がある', () => {
    for (const t of TITLES) expect(titleEffect(t.no), t.label).not.toBeNull()
  })

  it('銘なし・未知の番号は null', () => {
    expect(titleEffect(null)).toBeNull()
    expect(titleEffect(0x14)).toBeNull()
  })

  it('斬殺数の銘には攻撃力が変わらない注意、つま斬りの銘には二刀流の注意が付く', () => {
    expect(titleEffect(0x04)).toMatchObject({ effect: '攻撃力 +250' })
    expect(titleEffect(0x04)?.note).toContain('攻撃力の値は変わらない') // 🔶 ゲーム内でどう扱われるかは要ゲーム内確認
    expect(titleEffect(0x09)?.note).toBeUndefined()
    expect(titleEffect(0x13)).toMatchObject({ effect: 'つま斬り時の攻撃力 +250%' })
    expect(titleEffect(0x13)?.note).toContain('二刀流')
  })
})

describe('魅力の効果（[W] p20）', () => {
  it('すべての魅力に効果がある', () => {
    for (const c of CHARMS) expect(charmEffects([c.id])[0].summary, c.label).not.toBe('効果は不明')
  })

  it('魅力ごとにまとめ、個数に応じた効果量を返す', () => {
    expect(charmEffects([9, 9, 4])).toEqual([
      expect.objectContaining({ id: 9, label: '重撃', count: 2, amount: '+360' }),
      expect.objectContaining({ id: 4, label: '活復', count: 1, amount: '1秒に 30' }),
    ])
    expect(charmEffects([2, 1, 9]).map((e) => e.amount)).toEqual(['+100', '+100', '+270'])
    expect(charmEffects([3, 3, 3])).toEqual([expect.objectContaining({ count: 3, amount: '6倍' })])
    // 背水は上げ幅と下げ幅が同じ（ユーザー判断 2026-10-05）
    expect(charmEffects([6, 6])[0].amount).toBe('±350')
  })

  it('魅力なしは空、疾風は効果量なし、未知の ID は効果不明', () => {
    expect(charmEffects([null, null, null])).toEqual([])
    expect(charmEffects([5])[0].amount).toBeNull()
    expect(charmEffects([0x20])[0]).toMatchObject({ label: '未知（32）', summary: '効果は不明', amount: null })
  })
})
