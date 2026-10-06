import { describe, expect, it } from 'vitest'
import { weaponSearchTerms } from '@/save/master/weapon-names'
import { matchesSearch } from './search'

describe('パーツの検索（読み・ja・en の部分一致）', () => {
  const terms = weaponSearchTerms('中道刀') // ちゅうどうとう・中道刀・Basal Blade

  it('読み・ja・en のどれかに部分一致すれば当たる', () => {
    expect(matchesSearch('どうとう', terms)).toBe(true)
    expect(matchesSearch('道', terms)).toBe(true)
    expect(matchesSearch('basal', terms)).toBe(true)
    expect(matchesSearch('あしゅら', terms)).toBe(false)
  })

  it('カタカナ・ひらがな、全角・半角、大文字・小文字の違いは無視する。空の検索語はすべてに当たる', () => {
    expect(matchesSearch('チュウドウ', terms)).toBe(true)
    expect(matchesSearch('ＢＬＡＤＥ', terms)).toBe(true)
    expect(matchesSearch('  ', terms)).toBe(true)
    // カタカナの名前も、ひらがなの読みで当たる
    expect(matchesSearch('じょあ', weaponSearchTerms('ジョアンナ'))).toBe(true)
  })

  it('特殊武器（読みなし）は ja と en で当たる', () => {
    expect(weaponSearchTerms('虎爪')).toEqual(['虎爪（無手）', 'Tiger Claw'])
    expect(matchesSearch('無手', weaponSearchTerms('虎爪'))).toBe(true)
    expect(matchesSearch('tiger', weaponSearchTerms('虎爪'))).toBe(true)
  })
})
