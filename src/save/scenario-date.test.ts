// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は解析ノート §3.5 のシナリオ差分（[U] 2026-10-05）で見たもの。
// 時間帯（0x0010・0x0014）と保留量（0x0012）はゲーム内で書き込みの反映を確認済み（✅ [U]）。
// 0x0010 の日の部分だけを書き換えても日数は変わらず、0x0BD8（経過日数）も一緒に書くと変わった（✅ [U] 2026-10-05）
import { describe, expect, it } from 'vitest'
import { writeU16, writeU32, writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { DATE_OFFSETS, readDate, writeDayTime, writePending } from './scenario-date'

/** 0x0010〜0x0014 の5バイトと 0x0BD8 の u32（差分で見た実際の値） */
const SEEN = {
  /** 03 copy 4：1日目昼、イベント完了直後（保留量 10） */
  day1NoonPending: { head: [0x64, 0x00, 0x0a, 0x06, 0x00], dayIndex: 0 },
  /** 03 copy 5：1日目夕 */
  day1Evening: { head: [0x6e, 0x00, 0x00, 0x06, 0x01], dayIndex: 0 },
  /** 04 copy 2：1日目夜 */
  day1Night: { head: [0x78, 0x00, 0x00, 0x06, 0x02], dayIndex: 0 },
  /** 04 copy 3：2日目朝 */
  day2Noon: { head: [0xc8, 0x00, 0x00, 0x06, 0x00], dayIndex: 1 },
  /** 🔶 03 copy 7：5日目昼（港で寝て、大老 鬼怒川怨仙の前）。0x0010 は 400 で止まる */
  day5Noon: { head: [0x90, 0x01, 0x00, 0x01, 0x00], dayIndex: 4 },
  /** 🔶 03 copy 8：5日目夕（大老 鬼怒川怨仙のあと） */
  day5Evening: { head: [0x90, 0x01, 0x00, 0x06, 0x01], dayIndex: 4 },
  /** 🔶 03 copy 9：6日目昼（大老の大寄せのあと） */
  day6Noon: { head: [0x90, 0x01, 0x00, 0x06, 0x00], dayIndex: 5 },
}

function makeSave(seen: { head: number[]; dayIndex: number }, size = TS_SAVE_SIZE): Uint8Array {
  const b = new Uint8Array(size)
  b.set(seen.head, 0x10)
  writeU32(b, DATE_OFFSETS.dayIndex, seen.dayIndex)
  return b
}

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

describe('readDate §3.5', () => {
  it('差分で見た値を日数・時間帯として読む', () => {
    expect(readDate(makeSave(SEEN.day1Evening))).toMatchObject({ day: 1, slot: 1, pending: 0, problem: null, warning: null })
    expect(readDate(makeSave(SEEN.day1Night))).toMatchObject({ day: 1, slot: 2, problem: null })
    expect(readDate(makeSave(SEEN.day2Noon))).toMatchObject({ day: 2, slot: 0, problem: null })
  })

  it('🔶 4日目以降は 0x0010 が 400 のままで、日数は 0x0BD8、時間帯は 0x0014 から読む', () => {
    expect(readDate(makeSave(SEEN.day5Noon))).toMatchObject({ day: 5, slot: 0, problem: null, warning: null })
    expect(readDate(makeSave(SEEN.day5Evening))).toMatchObject({ day: 5, slot: 1, problem: null })
    expect(readDate(makeSave(SEEN.day6Noon))).toMatchObject({ day: 6, slot: 0, problem: null })
  })

  it('🔶 0x0010 が 400 なのに 0x0BD8 が3日目以前なら読み取り専用にする', () => {
    const b = makeSave(SEEN.day5Noon)
    writeU32(b, DATE_OFFSETS.dayIndex, 2)
    expect(readDate(b).problem).toMatch(/400/)
  })

  it('保留量が入っていれば警告する', () => {
    const v = readDate(makeSave(SEEN.day1NoonPending))
    expect(v).toMatchObject({ day: 1, slot: 0, pending: 10, problem: null })
    expect(v.warning).toMatch(/保留量/)
  })

  it('0x0010 と 0x0014 の時間帯が食い違えば読み取り専用にする', () => {
    const b = makeSave(SEEN.day1Evening)
    writeU8(b, DATE_OFFSETS.slot, 2)
    expect(readDate(b).problem).toMatch(/一致しません/)
  })

  it('🔶 0x0010 の日と 0x0BD8＋1 が食い違えば読み取り専用にする', () => {
    const b = makeSave(SEEN.day1Evening)
    writeU16(b, DATE_OFFSETS.dayTime, 210)
    expect(readDate(b).problem).toMatch(/0x0BD8/)
  })

  it('0x0010 が「日×100＋時間帯×10」の形でなければ読み取り専用にする', () => {
    for (const v of [0, 105, 130, 99, 410, 500]) {
      const b = makeSave(SEEN.day1Evening)
      writeU16(b, DATE_OFFSETS.dayTime, v)
      expect(readDate(b).problem).not.toBeNull()
    }
  })

  it('保留量が 0・10 以外なら読み取り専用にする', () => {
    const b = makeSave(SEEN.day1Evening)
    writeU8(b, DATE_OFFSETS.pending, 5)
    expect(readDate(b).problem).toMatch(/0x0012/)
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用にする', () => {
    expect(readDate(makeSave(SEEN.day1Evening, TS_SAVE_SIZE + 4)).problem).not.toBeNull()
  })
})

describe('書き込み', () => {
  it('時間帯だけの変更は 0x0010・0x0014 だけを変える（✅ [U] ゲーム内で反映）', () => {
    const before = makeSave(SEEN.day1Evening)
    const after = before.slice()
    writeDayTime(after, 1, 2, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([0x10, 0x14])
    expect(Array.from(after.slice(0x10, 0x15))).toEqual(SEEN.day1Night.head)
  })

  it('日数の変更は 0x0010・0x0011・0x0014・0x0BD8 だけを変える（✅ [U] ゲーム内で反映）', () => {
    const before = makeSave(SEEN.day1Evening)
    const after = before.slice()
    writeDayTime(after, 3, 2, { advanced: false })
    expect(diffOffsets(before, after)).toEqual([0x10, 0x11, 0x14, DATE_OFFSETS.dayIndex])
    expect(readDate(after)).toMatchObject({ day: 3, slot: 2, problem: null })
    expect(Array.from(after.slice(0x10, 0x15))).toEqual([0x40, 0x01, 0x00, 0x06, 0x02])
  })

  it('2日目の朝を書くと 04 copy 3 と同じ並びになる', () => {
    const b = makeSave(SEEN.day1Night)
    writeDayTime(b, 2, 0, { advanced: false })
    expect(diffOffsets(makeSave(SEEN.day2Noon), b)).toEqual([])
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    for (const seen of Object.values(SEEN)) {
      const before = makeSave(seen)
      const after = before.slice()
      const v = readDate(after)
      writeDayTime(after, v.day, v.slot, { advanced: false })
      writePending(after, v.pending)
      expect(diffOffsets(before, after)).toEqual([])
    }
  })

  it('🔶 4日目以降を書くと 0x0010 は 400 になる（03 copy 8・9 と同じ並び。要ゲーム内確認）', () => {
    const b = makeSave(SEEN.day1Evening)
    writeDayTime(b, 5, 1, { advanced: false })
    expect(diffOffsets(makeSave(SEEN.day5Evening), b)).toEqual([])
    writeDayTime(b, 6, 0, { advanced: false })
    expect(diffOffsets(makeSave(SEEN.day6Noon), b)).toEqual([])
    // 4日目以降から3日目以前へ戻すと、0x0010 は「日×100＋時間帯×10」に戻る
    writeDayTime(b, 3, 2, { advanced: false })
    expect(readDate(b)).toMatchObject({ day: 3, slot: 2, problem: null, raw: { dayTime: 320 } })
  })

  it('通常モードは1〜99日目まで。上級者モードでは655日目まで。🔶 7日目以降は警告する', () => {
    const b = makeSave(SEEN.day1Evening)
    expect(() => writeDayTime(b, 100, 0, { advanced: false })).toThrow(RangeError)
    expect(() => writeDayTime(b, 656, 0, { advanced: true })).toThrow(RangeError)
    expect(() => writeDayTime(b, 0, 0, { advanced: true })).toThrow(RangeError)
    expect(() => writeDayTime(b, 1, 3, { advanced: true })).toThrow(RangeError)
    writeDayTime(b, 6, 0, { advanced: false })
    expect(readDate(b).warning).toBeNull()
    writeDayTime(b, 7, 0, { advanced: false })
    expect(readDate(b)).toMatchObject({ day: 7, slot: 0, problem: null })
    expect(readDate(b).warning).toMatch(/確かめていません/)
    writeDayTime(b, 99, 2, { advanced: false })
    expect(readDate(b)).toMatchObject({ day: 99, slot: 2, problem: null })
    writeDayTime(b, 100, 0, { advanced: true })
    expect(readDate(b)).toMatchObject({ day: 100, problem: null })
  })

  it('✅ [U] 保留量は 0 と 10 だけ。0x0012 だけを変える', () => {
    const before = makeSave(SEEN.day1NoonPending)
    const after = before.slice()
    writePending(after, 0)
    expect(diffOffsets(before, after)).toEqual([0x12])
    expect(() => writePending(after, 20)).toThrow(RangeError)
  })

  it('妥当性検証に落ちている状態では書かない', () => {
    const b = makeSave(SEEN.day1Evening)
    writeU8(b, DATE_OFFSETS.slot, 2)
    const before = b.slice()
    expect(() => writeDayTime(b, 1, 0, { advanced: false })).toThrow(RangeError)
    expect(diffOffsets(before, b)).toEqual([])
  })
})
