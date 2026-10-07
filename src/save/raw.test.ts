// 合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// 領域の一覧は docs/save_format/README.md §3 の写し。確度（🟢🔶❓、U-n）は表の欄のまま持つ。
// ❓ U-1 位置は固定オフセット（サイズ 0x48BB0 のセーブでの値）。
import { describe, expect, it } from 'vitest'
import { writeF32, writeU16, writeU32 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  RAW_REGIONS,
  RAW_WRITE_MAX,
  applyPatches,
  buildSearchPattern,
  diffRanges,
  innermostRegion,
  inspectAt,
  parseHexBytes,
  parseOffset,
  parsePatchScript,
  positionInRegion,
  regionsAt,
  searchBytes,
  utf16Char,
  writeRawBytes,
} from './raw'

describe('領域の一覧（docs/save_format/README.md §3）', () => {
  it('終了は開始以上で、ファイルの範囲に収まる', () => {
    for (const r of RAW_REGIONS) {
      expect(r.start).toBeGreaterThanOrEqual(0)
      if (r.end !== null) {
        expect(r.end).toBeGreaterThanOrEqual(r.start)
        expect(r.end).toBeLessThan(TS_SAVE_SIZE)
      }
    }
  })

  it('レコードの並ぶ領域は、長さが1件のバイト数で割り切れる', () => {
    for (const r of RAW_REGIONS) {
      if (r.recordSize && r.end !== null) expect((r.end - r.start + 1) % r.recordSize).toBe(0)
    }
  })

  it('重なる領域ではいちばん狭いものを返す（🟢 シナリオのフラグ列の中の勢力）', () => {
    expect(innermostRegion(0x3780)?.chunk).toBe('factions')
    // 門の開閉（0x3764〜0x37FB、飛び飛び）も範囲としては重なる
    expect(regionsAt(0x3780).map((r) => r.chunk)).toEqual(['scenario-flags', 'gates', 'factions'])
  })

  it('どこにも入らない位置と、終了が ❓ の領域だけの位置は null', () => {
    expect(innermostRegion(0x0000)).toBeNull()
    // 0x0B3C（stats）は終了が ❓ なので色分けに使わない
    expect(innermostRegion(0x0b3c)).toBeNull()
  })

  it('武器レコード（0xA0）とアイテム（8 B）は「#n +0xNN」で位置を表す', () => {
    const chest = innermostRegion(0xacee + 0xa0 * 12 + 0x22)
    expect(chest?.label).toBe('武器箪笥')
    expect(positionInRegion(chest!, 0xacee + 0xa0 * 12 + 0x22)).toBe('#12 +0x22')
    const carried = innermostRegion(0x5b40 + 8 * 3 + 2)
    expect(positionInRegion(carried!, 0x5b40 + 8 * 3 + 2)).toBe('#3 +0x02')
    const name = innermostRegion(0xdc + 0x10)
    expect(positionInRegion(name!, 0xdc + 0x10)).toBe('+0x10')
  })
})

describe('差分', () => {
  it('連続した違いを1つの範囲にまとめる', () => {
    const a = new Uint8Array(16)
    const b = a.slice()
    b[2] = 1
    b[3] = 1
    b[4] = 1
    b[10] = 9
    expect(diffRanges(a, b)).toEqual({
      ranges: [
        { start: 2, end: 4 },
        { start: 10, end: 10 },
      ],
      total: 4,
      truncated: false,
    })
  })

  it('件数の上限で打ち切っても、違うバイトの総数は全体を数える', () => {
    const a = new Uint8Array(10)
    const b = Uint8Array.from([1, 0, 1, 0, 1, 1, 0, 0, 0, 0])
    expect(diffRanges(a, b, 2)).toEqual({
      ranges: [
        { start: 0, end: 0 },
        { start: 2, end: 2 },
      ],
      total: 4,
      truncated: true,
    })
  })

  it('長さが違うときは短いほうまで比べる', () => {
    expect(diffRanges(new Uint8Array(4), Uint8Array.from([0, 0, 0, 0, 7, 7])).total).toBe(0)
  })
})

describe('入力の解釈', () => {
  it('オフセットは 16 進で、0x は省略できる', () => {
    expect(parseOffset('0x36A8', TS_SAVE_SIZE)).toEqual({ ok: true, value: 0x36a8 })
    expect(parseOffset(' 36a8 ', TS_SAVE_SIZE)).toEqual({ ok: true, value: 0x36a8 })
    expect(parseOffset('0x48BB0', TS_SAVE_SIZE).ok).toBe(false)
    expect(parseOffset('xyz', TS_SAVE_SIZE).ok).toBe(false)
  })

  it('16進のバイト列は空白の有無を問わない', () => {
    expect(parseHexBytes('12 34 ab')).toEqual({ ok: true, value: [0x12, 0x34, 0xab] })
    expect(parseHexBytes('1234AB')).toEqual({ ok: true, value: [0x12, 0x34, 0xab] })
    expect(parseHexBytes('123').ok).toBe(false)
    expect(parseHexBytes('zz').ok).toBe(false)
    expect(parseHexBytes('').ok).toBe(false)
    expect(parseHexBytes('00'.repeat(RAW_WRITE_MAX + 1)).ok).toBe(false)
  })
})

describe('上書き', () => {
  it('指定した範囲だけを書き換え、サイズは変えない（読み出し→書き戻し→バイト一致）', () => {
    const b = new Uint8Array(TS_SAVE_SIZE)
    for (let i = 0; i < 0x40; i++) b[0x3780 + i] = i
    const before = b.slice()
    writeRawBytes(b, 0x3790, [0xaa, 0xbb])
    expect(b.byteLength).toBe(TS_SAVE_SIZE)
    expect(diffRanges(before, b)).toEqual({ ranges: [{ start: 0x3790, end: 0x3791 }], total: 2, truncated: false })
    // 読んだ値をそのまま書き戻すと元に戻る
    writeRawBytes(b, 0x3790, Array.from(before.subarray(0x3790, 0x3792)))
    expect(b).toEqual(before)
  })

  it('末尾を越える書き込みと、バイトの範囲外の値は拒否し、何も変えない', () => {
    const b = new Uint8Array(8)
    expect(() => writeRawBytes(b, 7, [1, 2])).toThrow(RangeError)
    expect(() => writeRawBytes(b, -1, [1])).toThrow(RangeError)
    expect(() => writeRawBytes(b, 0, [256])).toThrow(RangeError)
    expect(b).toEqual(new Uint8Array(8))
  })
})

describe('検索', () => {
  it('バイト列は ?? を任意の1バイトとして扱う', () => {
    const b = Uint8Array.from([0xff, 0x01, 0x00, 0xff, 0x02, 0x00, 0xff])
    const p = buildSearchPattern('hex', 'FF ?? 00')
    expect(p).toEqual({ ok: true, value: [0xff, null, 0x00] })
    if (!p.ok) return
    expect(searchBytes(b, p.value)).toEqual({ offsets: [0, 3], truncated: false })
    expect(searchBytes(b, p.value, 1)).toEqual({ offsets: [0], truncated: true })
  })

  it('空白なしのバイト列も受け付け、?? だけの条件は拒否する', () => {
    expect(buildSearchPattern('hex', 'FF0001')).toEqual({ ok: true, value: [0xff, 0x00, 0x01] })
    expect(buildSearchPattern('hex', '?? ??').ok).toBe(false)
    expect(buildSearchPattern('hex', 'F').ok).toBe(false)
  })

  it('数値はリトルエンディアンのバイト列にする', () => {
    expect(buildSearchPattern('u8', '0xFF')).toEqual({ ok: true, value: [0xff] })
    expect(buildSearchPattern('u16', '1000')).toEqual({ ok: true, value: [0xe8, 0x03] })
    expect(buildSearchPattern('u32', '0x12345678')).toEqual({ ok: true, value: [0x78, 0x56, 0x34, 0x12] })
    expect(buildSearchPattern('u8', '256').ok).toBe(false)
    expect(buildSearchPattern('u16', '-1').ok).toBe(false)
  })

  it('文字列は UTF-16LE で探す', () => {
    const b = new Uint8Array(16)
    writeU16(b, 4, '侍'.charCodeAt(0))
    writeU16(b, 6, '道'.charCodeAt(0))
    const p = buildSearchPattern('utf16', '侍道')
    expect(p.ok && searchBytes(b, p.value).offsets).toEqual([4])
  })
})

describe('値の表示', () => {
  it('型ごとにリトルエンディアンで読む', () => {
    const b = new Uint8Array(12)
    writeU32(b, 0, 0x12345678)
    writeF32(b, 4, 175)
    const at0 = Object.fromEntries(inspectAt(b, 0).map((v) => [v.label, v.value]))
    expect(at0.u8).toBe('120（0x78）')
    expect(at0['2進']).toBe('01111000')
    expect(at0.u16).toBe('22136（0x5678）')
    expect(at0.u32).toBe('305419896（0x12345678）')
    expect(Object.fromEntries(inspectAt(b, 4).map((v) => [v.label, v.value])).f32).toBe('175')
  })

  it('末尾を越える型は null', () => {
    const b = Uint8Array.from([0x80, 0xff])
    const at1 = Object.fromEntries(inspectAt(b, 1).map((v) => [v.label, v.value]))
    expect(at1.i8).toBe('-1')
    expect(at1.u16).toBeNull()
    expect(at1.f32).toBeNull()
  })

  it('UTF-16 の制御文字は「·」で表す', () => {
    expect(utf16Char(0x0000)).toBe('·')
    expect(utf16Char(0x0041)).toBe('A')
    expect(utf16Char(0xd800)).toBe('·')
  })
})

describe('まとめて書き込む入力', () => {
  it('1行に「オフセット バイト列」を読む', () => {
    const r = parsePatchScript('0xAAAA 02 ff 00 11\n0xAABB 01 ff\n0xAABC 01 01 01 01 ff ff ff ff\n', TS_SAVE_SIZE)
    expect(r.errors).toEqual([])
    // 0xAABB 01 ff は 0xAABC まで書くので、3行目と重なる
    expect(r.warnings).toEqual([{ line: 3, message: '2 行目と範囲が重なります。この行の値が残ります' }])
    expect(r.patches).toEqual([
      { line: 1, offset: 0xaaaa, values: [0x02, 0xff, 0x00, 0x11] },
      { line: 2, offset: 0xaabb, values: [0x01, 0xff] },
      { line: 3, offset: 0xaabc, values: [0x01, 0x01, 0x01, 0x01, 0xff, 0xff, 0xff, 0xff] },
    ])
  })

  it('コロン・0x の省略・空白なし・コメント・空行・CRLF を受け付ける', () => {
    const r = parsePatchScript('# 勢力\r\n\r\n3780: 01ff  // 2 B\r\n0x3790:AB\r\n0x37A0 : 00 01', TS_SAVE_SIZE)
    expect(r.errors).toEqual([])
    expect(r.patches.map((p) => [p.line, p.offset, p.values])).toEqual([
      [3, 0x3780, [0x01, 0xff]],
      [4, 0x3790, [0xab]],
      [5, 0x37a0, [0x00, 0x01]],
    ])
  })

  it('読めない行は行番号つきで返す', () => {
    const r = parsePatchScript('0x10 01\nzz 01\n0x20\n0x30 1\n0x48BAF 01 02', TS_SAVE_SIZE)
    expect(r.patches.map((p) => p.line)).toEqual([1])
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4, 5])
  })

  it('範囲が重なる行は警告し、後の行の値が残る', () => {
    const r = parsePatchScript('0x10 01 02 03\n0x12 FF', 0x100)
    expect(r.warnings).toEqual([{ line: 2, message: '1 行目と範囲が重なります。この行の値が残ります' }])
    const b = new Uint8Array(0x100)
    applyPatches(b, r.patches)
    expect(Array.from(b.subarray(0x10, 0x13))).toEqual([1, 2, 0xff])
  })

  it('空の入力は書き込まない', () => {
    expect(parsePatchScript('# だけ\n\n', 0x100).errors).toHaveLength(1)
  })

  it('1つでも範囲外なら何も変えない', () => {
    const b = new Uint8Array(8)
    expect(() =>
      applyPatches(b, [
        { line: 1, offset: 0, values: [1] },
        { line: 2, offset: 7, values: [1, 2] },
      ]),
    ).toThrow(RangeError)
    expect(b).toEqual(new Uint8Array(8))
  })
})
