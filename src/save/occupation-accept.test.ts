// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 受注中の情報（chunks/occupation）：
//   ✅ 0x45F4E ID・0x45F52 受注した日（経過日数）・0x45F54 受注した時間帯（1日目昼・2日目昼・2日目夜の「今宵の虎徹は」の受注の差分 2026-10-07）
//   🔶 0x45F55 受注中だけ FF。✅ FFFF の状態は受注で 0 になる（受注の差分 2026-10-06）
// 受注で書くなりわいのフラグは 🟢（✅ 野戸仏の1件目 171 で番号 4＝11、汁部 209 で番号 27＝1）。外すときの値は 🔶。
// ❓ U-1：固定オフセットで読む。書き込みの反映は要ゲーム内確認。
import { describe, expect, it } from 'vitest'
import { writeU16, writeU32, writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  ACCEPT_OFFSETS,
  ACCEPT_RULES,
  acceptOccupation,
  acceptRuleOf,
  readAccepted,
  releaseOccupation,
  seriesAcceptOf,
  writeSeriesState,
} from './occupation-accept'

const flagOffset = (n: number) => 0x011c + n
const stateOffset = (id: number) => 0x33a4 + id * 2

/** 2日目夜。記録は 171 だけ 0（出た・未クリア）、ほかは FFFF */
function makeSave(size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  writeU16(b, 0x0010, 220)
  writeU8(b, 0x0014, 2)
  writeU32(b, 0x0bd8, 1)
  for (let id = 0; id < 256; id++) writeU16(b, stateOffset(id), 0xffff)
  writeU16(b, stateOffset(171), 0)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('なりわいの受注 0x45F4E〜0x45F55 chunks/occupation', () => {
  it('✅ 受注中の情報の位置', () => {
    expect(ACCEPT_OFFSETS).toEqual({ id: 0x45f4e, day: 0x45f52, slot: 0x45f54, active: 0x45f55 })
  })

  it('🟢 組合なりわいは n 件目の受注で n1。小鳩・おっつぁんの8件目は書かず 80、おっつぁんの 203・206 は 61・80', () => {
    expect(acceptRuleOf(171).onAccept).toEqual([{ flag: 4, value: 11 }])
    expect(acceptRuleOf(178).onAccept).toEqual([{ flag: 4, value: 81 }])
    expect(acceptRuleOf(185).onAccept).toEqual([{ flag: 5, value: 71 }])
    expect(acceptRuleOf(186).onAccept).toEqual([{ flag: 5, value: 80 }])
    expect(acceptRuleOf(194).onAccept).toEqual([{ flag: 6, value: 81 }])
    expect(acceptRuleOf(199).onAccept).toEqual([{ flag: 7, value: 41 }])
    expect(acceptRuleOf(204).onAccept).toEqual([{ flag: 7, value: 71 }])
    expect(acceptRuleOf(205).onAccept).toEqual([{ flag: 7, value: 80 }])
    expect(acceptRuleOf(203).onAccept).toEqual([{ flag: 7, value: 61 }])
    expect(acceptRuleOf(206).onAccept).toEqual([{ flag: 7, value: 80 }])
    // 汁部は 27＝1、28〜31＝0
    expect(acceptRuleOf(210).onAccept).toEqual([
      { flag: 27, value: 1 }, { flag: 28, value: 0 }, { flag: 29, value: 0 }, { flag: 30, value: 0 }, { flag: 31, value: 0 },
    ])
    // 基本・佐古津・女将・最後のなりわいはフラグを書かない
    for (const id of [3, 163, 167, 207, 208]) expect(acceptRuleOf(id)).toEqual({ onAccept: [], onRelease: [] })
    // 🔶 外すときは n1 を n0 に戻す
    expect(acceptRuleOf(172).onRelease).toEqual([{ flag: 4, value: 20 }])
    expect(acceptRuleOf(186).onRelease).toEqual([])
    expect(ACCEPT_RULES.size).toBe(8 * 4 + 2 + 4)
  })

  it('🟢 組合なりわいの「n 件目を依頼済み」の値から、受注するなりわいを引く', () => {
    expect(seriesAcceptOf(4, 21)).toBe(172)
    expect(seriesAcceptOf(7, 41)).toBe(199)
    expect(seriesAcceptOf(5, 81)).toBeUndefined()
    expect(seriesAcceptOf(4, 20)).toBeUndefined()
    expect(seriesAcceptOf(4, 91)).toBeUndefined()
    expect(seriesAcceptOf(8, 11)).toBeUndefined()
  })

  it('✅ 基本のなりわいの受注は、ID・今の日・時間帯・FF と、FFFF の記録を 0 にするだけ', () => {
    const before = makeSave()
    const after = before.slice()
    acceptOccupation(after, 3)
    expect(diffOffsets(before, after)).toEqual([stateOffset(3), stateOffset(3) + 1, 0x45f4e, 0x45f52, 0x45f54, 0x45f55])
    expect(readAccepted(after)).toMatchObject({ id: 3, day: 1, slot: 2, active: 0xff, problem: null })
    expect(after[stateOffset(3)]).toBe(0)
  })

  it('🟢 組合なりわいの受注はフラグも書き、ほかのなりわいを受注中なら先に外す（🔶 n1 → n0）', () => {
    const b = makeSave()
    acceptOccupation(b, 172)
    expect(b[flagOffset(4)]).toBe(21)
    expect(readAccepted(b).id).toBe(172)
    acceptOccupation(b, 180)
    expect(b[flagOffset(4)]).toBe(20)
    expect(b[flagOffset(5)]).toBe(21)
    expect(readAccepted(b).id).toBe(180)
  })

  it('受注を外すと onRelease を書き、受注中の情報を 0 にする', () => {
    const before = makeSave()
    writeU8(before, flagOffset(4), 20)
    const after = before.slice()
    acceptOccupation(after, 172)
    releaseOccupation(after)
    expect(diffOffsets(before, after)).toEqual([stateOffset(172), stateOffset(172) + 1])
    expect(readAccepted(after)).toMatchObject({ id: 0, day: 0, slot: 0, active: 0 })
  })

  it('組合なりわいの欄から：依頼済みを選ぶと受注し、ほかの値を選ぶとその組合なりわいの受注だけを外す', () => {
    const b = makeSave()
    writeSeriesState(b, [{ flag: 4, value: 31 }], seriesAcceptOf(4, 31), { advanced: false })
    expect(b[flagOffset(4)]).toBe(31)
    expect(readAccepted(b).id).toBe(173)
    // 別の組合なりわいを書いても受注はそのまま
    writeSeriesState(b, [{ flag: 5, value: 30 }], undefined, { advanced: false })
    expect(readAccepted(b).id).toBe(173)
    // 同じ組合なりわいを「依頼する前」にすると、受注中の情報だけを 0 にする（選んだ値はそのまま）
    writeSeriesState(b, [{ flag: 4, value: 40 }], undefined, { advanced: false })
    expect(b[flagOffset(4)]).toBe(40)
    expect(readAccepted(b)).toMatchObject({ id: 0, day: 0, slot: 0, active: 0 })
  })

  it('表にない ID、日付が読めないセーブ、U-1 に落ちるセーブには書かない', () => {
    expect(() => acceptOccupation(makeSave(), 7)).toThrow(RangeError)
    const badDate = makeSave()
    writeU16(badDate, 0x0010, 0)
    expect(() => acceptOccupation(badDate, 3)).toThrow(RangeError)
    const big = makeSave(TS_SAVE_SIZE + 4)
    expect(readAccepted(big).problem).not.toBeNull()
    expect(() => acceptOccupation(big, 3)).toThrow(RangeError)
    expect(() => releaseOccupation(big)).toThrow(RangeError)
  })

  it('受注していないときに外しても何も変えない', () => {
    const before = makeSave()
    const after = before.slice()
    releaseOccupation(after)
    expect(diffOffsets(before, after)).toEqual([])
  })
})
