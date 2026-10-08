// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 値は docs/save_format/chunks/date-location の調査記録のシナリオ差分（[U] 2026-10-05）で見たもの。
// 時間帯（0x0010・0x0014）と保留量（0x0012）はゲーム内で書き込みの反映を確認済み（✅ [U]）。
// 0x0010 の日の部分だけを書き換えても日数は変わらず、0x0BD8（経過日数）も一緒に書くと変わった（✅ [U] 2026-10-05）。
// 4日目以降は 0x0010＝400 で止まる（03 copy 7・8・9 の差分）。5日目への書き換えで大老 鬼怒川怨仙が発生した（✅ [U] 2026-10-05）
import { describe, expect, it } from 'vitest'
import { writeU16, writeU32, writeU8 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import { DATE_OFFSETS, STAGES, linkedStage, readDate, writeDayTime, writePending, writeStage } from './scenario-date'

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
  /** 03 copy 7：5日目昼（港で寝て、大老 鬼怒川怨仙の前）。0x0010 は 400 で止まる */
  day5Noon: { head: [0x90, 0x01, 0x00, 0x01, 0x00], dayIndex: 4 },
  /** 03 copy 8：5日目夕（大老 鬼怒川怨仙のあと） */
  day5Evening: { head: [0x90, 0x01, 0x00, 0x06, 0x01], dayIndex: 4 },
  /** 03 copy 9：6日目昼（大老の大寄せのあと） */
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

describe('readDate chunks/date-location', () => {
  it('差分で見た値を日数・時間帯として読む', () => {
    expect(readDate(makeSave(SEEN.day1Evening))).toMatchObject({ day: 1, slot: 1, pending: 0, problem: null, warning: null })
    expect(readDate(makeSave(SEEN.day1Night))).toMatchObject({ day: 1, slot: 2, problem: null })
    expect(readDate(makeSave(SEEN.day2Noon))).toMatchObject({ day: 2, slot: 0, problem: null })
  })

  it('4日目以降は 0x0010 が 400 のままで、日数は 0x0BD8、時間帯は 0x0014 から読む', () => {
    expect(readDate(makeSave(SEEN.day5Noon))).toMatchObject({ day: 5, slot: 0, problem: null, warning: null })
    expect(readDate(makeSave(SEEN.day5Evening))).toMatchObject({ day: 5, slot: 1, problem: null })
    expect(readDate(makeSave(SEEN.day6Noon))).toMatchObject({ day: 6, slot: 0, problem: null })
  })

  it('差分で見た値は、段階が日数・時間帯と連動している', () => {
    for (const seen of Object.values(SEEN)) expect(readDate(makeSave(seen)).linked).toBe(true)
  })

  it('保留量が入っていれば警告する', () => {
    const v = readDate(makeSave(SEEN.day1NoonPending))
    expect(v).toMatchObject({ day: 1, slot: 0, pending: 10, problem: null })
    expect(v.warning).toMatch(/保留量/)
  })

  it('1〜3日目・400 の段階が日数・時間帯と合わないときは警告する（編集はできる）', () => {
    const b = makeSave(SEEN.day1Evening)
    writeU8(b, DATE_OFFSETS.slot, 2)
    expect(readDate(b)).toMatchObject({ linked: false, problem: null })
    expect(readDate(b).warning).toMatch(/合っていません/)
    const c = makeSave(SEEN.day5Noon)
    writeU32(c, DATE_OFFSETS.dayIndex, 2)
    expect(readDate(c)).toMatchObject({ day: 3, linked: false, problem: null })
    expect(readDate(c).warning).toMatch(/合っていません/)
  })

  it('🟢 話の進み具合で決まる段階（0・410 以降）は連動しないが、警告もしない', () => {
    for (const v of [0, 410, 500, 999]) {
      const b = makeSave(SEEN.day6Noon)
      writeU16(b, DATE_OFFSETS.dayTime, v)
      expect(readDate(b)).toMatchObject({ stage: v, linked: false, problem: null, warning: null })
    }
  })

  it('一覧にない段階は警告する（編集はできる）', () => {
    for (const v of [105, 130, 4096]) {
      const b = makeSave(SEEN.day1Evening)
      writeU16(b, DATE_OFFSETS.dayTime, v)
      expect(readDate(b)).toMatchObject({ linked: false, problem: null })
      expect(readDate(b).warning).toMatch(/一覧にない/)
    }
  })

  it('時間帯（0x0014）が 0〜2 の外なら読み取り専用にする', () => {
    const b = makeSave(SEEN.day1Evening)
    writeU8(b, DATE_OFFSETS.slot, 3)
    expect(readDate(b).problem).toMatch(/0x0014/)
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

  it('✅ [U] 4日目以降を書くと 0x0010 は 400 になる（03 copy 8・9 と同じ並び）', () => {
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

  it('段階が連動していないときは、日数・時間帯を書いても 0x0010 を変えない', () => {
    for (const stage of [0, 500, 4096]) {
      const before = makeSave(SEEN.day6Noon)
      writeU16(before, DATE_OFFSETS.dayTime, stage)
      const after = before.slice()
      writeDayTime(after, 2, 1, { advanced: false })
      expect(diffOffsets(before, after)).toEqual([0x14, DATE_OFFSETS.dayIndex])
      expect(readDate(after)).toMatchObject({ day: 2, slot: 1, stage })
    }
  })

  it('妥当性検証に落ちている状態では書かない', () => {
    const b = makeSave(SEEN.day1Evening)
    writeU8(b, DATE_OFFSETS.slot, 3)
    const before = b.slice()
    expect(() => writeDayTime(b, 1, 0, { advanced: false })).toThrow(RangeError)
    expect(() => writeStage(b, 0)).toThrow(RangeError)
    expect(diffOffsets(before, b)).toEqual([])
  })
})

describe('段階 0x0010', () => {
  it('🟢 一覧の値。実セーブで見たのは 0・100・110・120・200・400', () => {
    expect(STAGES.filter((s) => s.seen).map((s) => s.value)).toEqual([0, 100, 110, 120, 200, 400])
    expect(STAGES.map((s) => s.value)).toEqual([0, 100, 110, 120, 200, 210, 220, 300, 310, 320, 400, 410, 420, 500, 510, 520, 600, 999])
  })

  it('連動する段階は 1〜3日目が「日×100＋時間帯×10」、4日目以降が 400', () => {
    expect([linkedStage(1, 0), linkedStage(2, 1), linkedStage(3, 2), linkedStage(4, 0), linkedStage(9, 2)]).toEqual([100, 210, 320, 400, 400])
  })

  it('段階を書くと 0x0010 だけが変わる。日数・時間帯は変えない', () => {
    const before = makeSave(SEEN.day5Evening)
    const after = before.slice()
    writeStage(after, 210)
    expect(diffOffsets(before, after)).toEqual([0x10, 0x11])
    expect(readDate(after)).toMatchObject({ stage: 210, day: 5, slot: 1, linked: false })
  })

  it('✅ [U] 0（序章）は書かない（0x0010 だけでは序章のイベントが始まらない。new-cycle.ts を使う）', () => {
    const b = makeSave(SEEN.day5Evening)
    expect(() => writeStage(b, 0)).toThrow(/新しい周回を始める/)
  })

  it('❓ 410 以降は書けるが、ゲーム内の動作は要ゲーム内確認', () => {
    const b = makeSave(SEEN.day6Noon)
    writeStage(b, 500)
    expect(Array.from(b.slice(0x10, 0x12))).toEqual([0xf4, 0x01])
  })

  it('一覧にない値は書かない', () => {
    const b = makeSave(SEEN.day1Evening)
    for (const v of [-1, 105, 4096, 1000]) expect(() => writeStage(b, v)).toThrow(RangeError)
  })

  it('連動していない段階を書いたあとは、日数・時間帯を変えても段階が残る', () => {
    const b = makeSave(SEEN.day6Noon)
    writeStage(b, 510)
    writeDayTime(b, 7, 2, { advanced: false })
    expect(readDate(b)).toMatchObject({ stage: 510, day: 7, slot: 2 })
  })

  it('読み出し→書き戻しでバイト列が一致する', () => {
    for (const seen of Object.values(SEEN)) {
      const before = makeSave(seen)
      const after = before.slice()
      writeStage(after, readDate(after).stage)
      expect(diffOffsets(before, after)).toEqual([])
    }
  })
})
