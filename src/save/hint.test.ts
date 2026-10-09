// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/hint（調査記録 2026-10-06_hint.md・2026-10-07_hint-node.md）で見たもの。
// 🟢 0x3900 は最後に状態を進めたイベントのチャート上のノード番号（0〜118）。
// 🔶 0xFFFF＝なし。🔶 1日目のノード 2〜10 のヒントの文（6 だけ ✅）。ほかのノードの文は ❓。
// 固定オフセット。
import { describe, expect, it } from 'vitest'
import { writeU16, writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { chartNodeLabel } from './master/labels'
import {
  HINT_DEFAULT_TEXT,
  HINT_NONE,
  HINT_OFFSET,
  hintLabel,
  hintWarning,
  readHint,
  validateHint,
  writeHint,
} from './hint'

/** 01 copy 6（阿片密売を阻止せよの完了のあと）の 0x3900 */
const COPY6_HINT = 9

function makeSave(value: number, size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  writeU16(b, HINT_OFFSET, value)
  // 隣のバイトが書き込みで変わらないことを見る
  writeU8(b, HINT_OFFSET - 1, 0xff)
  writeU8(b, HINT_OFFSET + 2, 0x5a)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('次のイベントのヒント 0x3900（🟢 チャートのノード番号）', () => {
  it('u16 で読み、ノードのイベントを引く', () => {
    const view = readHint(makeSave(COPY6_HINT))
    expect(view.value).toBe(9)
    expect(view.node && chartNodeLabel(view.node)).toBe('阿片密売を阻止せよ')
    expect(view.warning).toBeNull()
    expect(view.problem).toBeNull()
  })

  it('✅ 実データの値は、どれも直前に進めたイベントのノード', () => {
    const seen: [number, string][] = [
      [2, '志士との出会い'],
      [3, '代官所の面々'],
      [5, '海兵隊の横暴'],
      [6, '琴吹光探検隊'],
      [8, '代官所潜入'],
      [9, '阿片密売を阻止せよ'],
      [10, '辻斬りを辻斬る'],
      [78, '船上の侍'],
      [83, '阿弥浜港争乱'],
      [89, '嵐のあと'],
      [102, '覇者となる'],
    ]
    for (const [value, name] of seen) {
      const view = readHint(makeSave(value))
      expect(view.node && chartNodeLabel(view.node)).toBe(name)
      expect(view.warning).toBeNull()
    }
  })

  it('🔶 1日目のノード 2〜10 だけ文が分かる（6 は ✅）。ほかは ❓（null）', () => {
    expect(readHint(makeSave(6)).text).toBe('港の様子でも見てみるか')
    expect(readHint(makeSave(2)).text).toBe(HINT_DEFAULT_TEXT)
    expect(readHint(makeSave(10)).text).toBe('ローラは元気にしているだろうか')
    expect(readHint(makeSave(11)).text).toBeNull()
    expect(readHint(makeSave(78)).text).toBeNull()
  })

  it('🔶 0xFFFF はなし。警告しない', () => {
    const view = readHint(makeSave(HINT_NONE))
    expect(view.value).toBe(0xffff)
    expect(view.node).toBeNull()
    expect(view.warning).toBeNull()
    expect(hintLabel(HINT_NONE)).toContain('なし')
  })

  it('イベントに当たらないノード・表にない値は警告する（編集はできる）', () => {
    for (const v of [0, 1, 53, 113, 114, 118]) expect(hintWarning(v)).toContain('イベントに当たらない')
    const view = readHint(makeSave(119))
    expect(view.node).toBeNull()
    expect(view.warning).toContain('ノードの表')
    expect(view.problem).toBeNull()
  })

  it('サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    const b = makeSave(COPY6_HINT, TS_SAVE_SIZE + 4)
    expect(readHint(b).problem).not.toBeNull()
    expect(() => writeHint(b, 3, { advanced: false })).toThrow(RangeError)
  })

  it('通常モードは 0〜118 と 0xFFFF、上級者モードは任意の u16', () => {
    expect(validateHint(0, { advanced: false })).toBeNull()
    expect(validateHint(118, { advanced: false })).toBeNull()
    expect(validateHint(HINT_NONE, { advanced: false })).toBeNull()
    expect(validateHint(119, { advanced: false })).not.toBeNull()
    expect(validateHint(255, { advanced: false })).not.toBeNull()
    expect(validateHint(119, { advanced: true })).toBeNull()
    expect(validateHint(0x10000, { advanced: true })).not.toBeNull()
    expect(() => writeHint(makeSave(COPY6_HINT), 200, { advanced: false })).toThrow(RangeError)
  })

  it('書き込みは 0x3900〜0x3901 の2バイトだけを変える', () => {
    const before = makeSave(COPY6_HINT)
    const after = before.slice()
    writeHint(after, 3, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([HINT_OFFSET])
    writeHint(after, HINT_NONE, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([HINT_OFFSET, HINT_OFFSET + 1])
    writeHint(after, 0x1234, { advanced: true })
    expect(readHint(after).value).toBe(0x1234)
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    const before = makeSave(COPY6_HINT)
    const after = before.slice()
    writeHint(after, readHint(after).value, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([])
  })
})
