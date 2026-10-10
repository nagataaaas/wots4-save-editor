// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/characters のもの。
// 🟢 0x374E＝赤城（0 生存・1 死亡・3 病院に運ばれて助かった）、0x374F＝小暮（1 死亡）、0x3759＝メリンダ（1 死亡）。
// ✅ 0x3750＝朱美、0x3751＝琴吹、0x3752＝茂呂、0x3753＝万由、0x3754＝千佳、0x3755＝百合、0x3756＝鬼怒川怨仙、
// 0x3757＝ローラ、0x3758＝J.J.（[U] 2026-10-06、書き換えで確認）。🟢 鬼怒川は船上の侍で 2・大老暗殺計画で倒すと 0。
// 🟢 J.J. は 0・1・3・4・5 を取る（3＝療養中）。🟢 ローラの 2＝領事館を出て代官所へ向かった（領事館に出るのは 0 のときだけ）。
// ✅ 万由・千佳・百合は 0 生存・1 死亡、J.J. の 3（療養中）・堂島の 1（釜茹で）の意味（ユーザー判断 2026-10-11）。
// 🟢 0x375A＝堂島、0x375B＝先生、0x375C＝薬屋。書き換えの効果は要ゲーム内確認。
import { describe, expect, it } from 'vitest'
import { writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  CHARACTER_DEFAULT_VALUES,
  CHARACTER_END,
  CHARACTER_LENGTH,
  CHARACTER_NOTES,
  CHARACTER_OFFSETS,
  CHARACTER_START,
  SUSHI_STATUS_OFFSET,
  characterValues,
  readCharacters,
  validateCharacter,
  writeCharacter,
} from './characters'

/** 🔶 sample/S4-DATA_01 copy 12（赤城・小暮が死んだあと）の 0x374E〜0x375C と、寿司屋の 0x37F9（1＝死亡にした） */
const BOTH_DEAD = [1, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1]

function makeSave(values: number[], size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  values.forEach((v, i) => writeU8(b, CHARACTER_OFFSETS[i], v))
  // 前後のバイト（イベント状態 A の最後 0x374D、施設 0x375D、寿司屋の前後 0x37F8・0x37FA）も置き、書き込みで変わらないことを見る
  writeU8(b, 0x374d, 0xff)
  writeU8(b, 0x375d, 1)
  writeU8(b, 0x37f8, 1)
  writeU8(b, 0x37fa, 1)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('重要人物の状態 0x374E〜0x375C chunks/characters', () => {
  it('0x374E〜0x375C の15バイトと、🟢 寿司屋の 0x37F9 を読む', () => {
    expect(CHARACTER_LENGTH).toBe(15)
    expect(CHARACTER_OFFSETS).toHaveLength(16)
    expect(CHARACTER_OFFSETS[15]).toBe(SUSHI_STATUS_OFFSET)
    expect(SUSHI_STATUS_OFFSET).toBe(0x37f9)
    expect(CHARACTER_NOTES[SUSHI_STATUS_OFFSET].name).toBe('寿司屋')
    expect(characterValues(SUSHI_STATUS_OFFSET)).toBe(CHARACTER_DEFAULT_VALUES)
    expect(readCharacters(makeSave(BOTH_DEAD))).toEqual({ values: BOTH_DEAD, warning: null, problem: null })
  })

  it('🟢 0x374E は赤城、0x374F は小暮、0x3759 はメリンダ', () => {
    expect(CHARACTER_NOTES[0x374e].name).toBe('赤城')
    expect(CHARACTER_NOTES[0x374f].name).toBe('小暮')
    expect(CHARACTER_NOTES[0x3759].name).toBe('メリンダ')
  })

  it('🟢 J.J. の 4（打ち解けた）・5（逮捕）は通常モードで読み書きできる。✅ 3＝療養中', () => {
    const values = BOTH_DEAD.slice()
    values[0x3758 - CHARACTER_START] = 5
    const b = makeSave(values)
    expect(readCharacters(b).warning).toBeNull()
    writeCharacter(b, 0x3758, 4, { advanced: false })
    expect(readCharacters(b).values[0x3758 - CHARACTER_START]).toBe(4)
    expect(CHARACTER_NOTES[0x3758].note).toContain('療養中')
  })

  it('🟢 ローラの 2 は代官所へ向かった。✅ 堂島の 1 は釜茹で', () => {
    expect(CHARACTER_NOTES[0x3757].note).toContain('代官所')
    expect(CHARACTER_NOTES[0x375a].note).toContain('釜茹で')
  })

  it('✅ [U] 0x3750〜0x3758 は書き換えで人物を確認した', () => {
    expect([0x3750, 0x3751, 0x3752, 0x3753, 0x3754, 0x3755, 0x3756].map((o) => CHARACTER_NOTES[o].name)).toEqual([
      '朱美',
      '琴吹',
      '茂呂',
      '万由',
      '千佳',
      '百合',
      '鬼怒川怨仙',
    ])
    expect(CHARACTER_NOTES[0x3757].name).toBe('ローラ')
    expect(CHARACTER_NOTES[0x3758].name).toBe('J.J.')
  })

  it('🟢 0x375A は堂島、0x375B は先生、0x375C は薬屋', () => {
    expect([0x375a, 0x375b, 0x375c].map((o) => CHARACTER_NOTES[o].name)).toEqual(['堂島', '先生', '薬屋'])
  })

  it('選択肢は基本が 0＝生存・1＝死亡。違う人物だけ個別の値を持つ', () => {
    const valuesOf = (o: number) => characterValues(o).map((s) => s.value)
    // 🟢 小暮・茂呂・メリンダ、✅ 万由・千佳・百合は基本のまま
    for (const o of [0x374f, 0x3752, 0x3753, 0x3754, 0x3755, 0x3759]) expect(characterValues(o)).toBe(CHARACTER_DEFAULT_VALUES)
    expect(CHARACTER_DEFAULT_VALUES).toEqual([
      { value: 0, label: '生存' },
      { value: 1, label: '死亡' },
    ])
    // 🟢 赤城の 3、鬼怒川の 2、ローラの 2（代官所へ向かった）、J.J. の 3（✅ 療養中）・4・5
    expect(valuesOf(0x374e)).toEqual([0, 1, 3])
    expect(valuesOf(0x3756)).toEqual([0, 2])
    expect(valuesOf(0x3757)).toEqual([0, 1, 2])
    expect(valuesOf(0x3758)).toEqual([0, 1, 3, 4, 5])
    expect(characterValues(0x3757).find((s) => s.value === 2)?.label).toBe('代官所へ向かった')
    // どの選択肢も通常モードで書ける
    for (const o of CHARACTER_OFFSETS)
      for (const s of characterValues(o)) expect(validateCharacter(s.value, { advanced: false })).toBeNull()
  })

  it('通常のプレイで取らない値（6 以上）は警告だけ出す', () => {
    const values = BOTH_DEAD.slice()
    values[3] = 6
    const view = readCharacters(makeSave(values))
    expect(view.warning).not.toBeNull()
    expect(view.problem).toBeNull()
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readCharacters(makeSave(BOTH_DEAD, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })

  it('書き込みは、そのオフセットの1バイトだけを変える', () => {
    for (const offset of CHARACTER_OFFSETS) {
      const before = makeSave(BOTH_DEAD)
      const after = before.slice()
      writeCharacter(after, offset, before[offset] === 3 ? 0 : 3, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([offset])
    }
  })

  it('範囲の外（イベント状態 A・施設・寿司屋の前後）には書かない', () => {
    const b = makeSave(BOTH_DEAD)
    for (const o of [CHARACTER_START - 1, CHARACTER_END + 1, SUSHI_STATUS_OFFSET - 1, SUSHI_STATUS_OFFSET + 1])
      expect(() => writeCharacter(b, o, 0, { advanced: true })).toThrow(RangeError)
  })

  it('通常モードは 0〜5 だけ。上級者モードでは任意の u8', () => {
    expect(validateCharacter(5, { advanced: false })).toBeNull()
    expect(validateCharacter(6, { advanced: false })).not.toBeNull()
    expect(validateCharacter(255, { advanced: true })).toBeNull()
    expect(validateCharacter(256, { advanced: true })).not.toBeNull()
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(BOTH_DEAD)
    const after = before.slice()
    readCharacters(after).values.forEach((v, i) =>
      writeCharacter(after, CHARACTER_OFFSETS[i], v, { advanced: false }),
    )
    expect(diffOffsets(before, after)).toEqual([])
  })
})
