// 帯刀と武器レコード。合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
import { describe, expect, it } from 'vitest'
import { BELT_STATE, NO_LEFT, beltOffset, readBelt, writeBeltDual, writeBeltMineuchi, writeBeltRight } from './belt'
import { TS_SAVE_SIZE } from './hero'
import { BLADES, GRIPS, GUARDS, PART_READINGS, SHEATHS, type PartOption } from './weapon-ids'
import {
  WEAPON_FIELDS,
  WEAPON_NAME_MAX_CHARS,
  decodeTitle,
  encodeTitle,
  compareByReading,
  isXUnknown,
  partWeaponKind,
  readWeapon,
  validateWeaponNumber,
  writeWeaponCharms,
  writeWeaponId,
  writeWeaponName,
  writeWeaponNumber,
  writeWeaponPart,
  writeWeaponSheath,
  writeWeaponTitle,
  writeWeaponType,
} from './weapon'

/** 選択肢の識別子（partKey） */
const ts = (v: number) => `ts:${v}`
const ct = (v: number) => `ct:${v}`

function diffOffsets(a: Uint8Array, b: Uint8Array): number[] {
  const out: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i)
  return out
}

/** offset から len B の範囲だけが変わったか */
function onlyChanged(a: Uint8Array, b: Uint8Array, offset: number, len: number): boolean {
  const d = diffOffsets(a, b)
  return d.length > 0 && d.every((i) => i >= offset && i < offset + len)
}

/** 合成したバイト列。帯刀1本目にだけ武器を入れる */
function makeSave(): Uint8Array {
  const b = new Uint8Array(TS_SAVE_SIZE)
  for (let i = 0; i < 3; i++) {
    const o = beltOffset(i)
    // 空き枠：完成武器ID 0x0000、パーツ 0xFF
    b.fill(0xff, o + 0x08, o + 0x10)
  }
  const o = beltOffset(0)
  b[o + 6] = 0xff
  b[o + 7] = 0xff
  b.set([0x06, 0x00, 0x18, 0x00, 0x0d, 0x00, 0x0c, 0x00], o + 0x08) // 中道刀の刃・鍔・柄
  b[o + WEAPON_FIELDS.attack] = 10
  b.set([0x01, 0x00, 0x09, 0x00, 0x02, 0x00, 0x04, 0x00, 0x01, 0x00, 0xff, 0xff, 0x00, 0x00], o + 0x22) // 重撃×2・活復
  b.set([0x41, 0x00], o + WEAPON_FIELDS.name) // "A"
  b.fill(0xff, o + WEAPON_FIELDS.title, o + WEAPON_FIELDS.title + 3)
  b.set([0x03, 0x00, NO_LEFT, 0x00, 0x00], BELT_STATE.count)
  return b
}

describe('武器レコード（合成）', () => {
  it('空き枠は編集しない', () => {
    const b = makeSave()
    const v = readBelt(b)
    expect(v.weapons[1].empty).toBe(true)
    expect(v.weapons[1].problem).not.toBeNull()
    expect(() => writeWeaponNumber(b, beltOffset(1), 'attack', 1)).toThrow()
    expect(() => writeBeltRight(b, 1)).toThrow()
    expect(() => writeBeltDual(b, 1)).toThrow()
  })

  it('✅ D-7：魅力は同じ ID を1組にまとめ、前に詰めて書く。+0x22 は変えない', () => {
    const b = makeSave()
    const o = beltOffset(0)
    expect(readWeapon(b, o).charms.value).toEqual([9, 9, 4])
    writeWeaponCharms(b, o, [4, null, 9])
    expect([...b.subarray(o + 0x22, o + 0x30)]).toEqual([0x01, 0x00, 0x04, 0x00, 0x01, 0x00, 0x09, 0x00, 0x01, 0x00, 0xff, 0xff, 0x00, 0x00])
    writeWeaponCharms(b, o, [null, null, null])
    expect([...b.subarray(o + 0x24, o + 0x30)]).toEqual([0xff, 0xff, 0, 0, 0xff, 0xff, 0, 0, 0xff, 0xff, 0, 0])
    expect(() => writeWeaponCharms(b, o, [1, 2, 3, 4])).toThrow()
    expect(() => writeWeaponCharms(b, o, [10, null, null])).toThrow()
  })

  it('✅ §5.3：同じ ID が2組に分かれた形も読む（天運×2・背水）', () => {
    const b = makeSave()
    const o = beltOffset(0)
    b.set([0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x01, 0x00], o + 0x24)
    expect(readWeapon(b, o).charms).toMatchObject({ value: [0, 0, 6], problem: null })
  })

  it('魅力の個数の合計が3を超えるレコードは読み取り専用', () => {
    const b = makeSave()
    const o = beltOffset(0)
    b.set([0x09, 0x00, 0x04, 0x00], o + 0x24)
    expect(readWeapon(b, o).problem).not.toBeNull()
    expect(() => writeWeaponNumber(b, o, 'attack', 1)).toThrow()
  })

  it('✅ §5.4 銘：<0x6A+番号> 01 <番号>。なしは FF FF FF。✅ U-2 人斬りは案A（6A 01 00）', () => {
    expect(encodeTitle(0x01)).toBe(0x01016b)
    expect(encodeTitle(0x13)).toBe(0x13017d)
    expect(encodeTitle(null)).toBe(0xffffff)
    expect(encodeTitle(0x00)).toBe(0x00016a) // 6A 01 00（✅ U-2 案A）
    expect(decodeTitle(0x00016a)).toBe(0)
    expect(decodeTitle(0x016a00)).toBeUndefined() // 00 6A 01（案B）はゲーム内で「……」と表示された
    expect(decodeTitle(0x12345)).toBeUndefined()
    const b = makeSave()
    const o = beltOffset(0)
    writeWeaponTitle(b, o, 0x0a)
    expect([...b.subarray(o + 0x96, o + 0x99)]).toEqual([0x74, 0x01, 0x0a])
    expect(readWeapon(b, o).title).toMatchObject({ value: 0x0a, label: '一輝' })
  })

  it('正規範囲を超える値・17文字を超える名前（✅ U-5 案A）は拒否し、バイト列を変えない', () => {
    const before = makeSave()
    const b = before.slice()
    const o = beltOffset(0)
    expect(() => writeWeaponNumber(b, o, 'attack', 501)).toThrow()
    expect(() => writeWeaponNumber(b, o, 'durabilityMax', 2001)).toThrow()
    expect(() => writeWeaponNumber(b, o, 'quality', 22)).toThrow()
    expect(() => writeWeaponName(b, o, 'x'.repeat(WEAPON_NAME_MAX_CHARS + 1))).toThrow()
    expect(() => writeWeaponName(b, o, '')).toThrow()
    expect(() => writeWeaponId(b, o, 0x1234)).toThrow()
    expect(() => writeWeaponPart(b, o, 'blade', ts(0x123456))).toThrow()
    // 上級者モードでもシステム上の範囲（攻撃力・質は ✅ int16）は超えられない
    expect(() => writeWeaponNumber(b, o, 'attack', 32768, { advanced: true })).toThrow()
    expect(() => writeWeaponNumber(b, o, 'quality', 32768, { advanced: true })).toThrow()
    expect(() => writeWeaponNumber(b, o, 'durability', 32768, { advanced: true })).toThrow()
    expect(() => writeWeaponNumber(b, o, 'kills', 65536, { advanced: true })).toThrow()
    expect(diffOffsets(before, b)).toEqual([])
  })

  it('上級者モードではゲーム上の範囲外も書け、攻撃力は ✅ int16 で読み戻せる', () => {
    const b = makeSave()
    const o = beltOffset(0)
    writeWeaponNumber(b, o, 'attack', -1, { advanced: true })
    expect([...b.subarray(o + WEAPON_FIELDS.attack, o + WEAPON_FIELDS.attack + 2)]).toEqual([0xff, 0xff])
    expect(readWeapon(b, o).numbers.attack).toMatchObject({ value: -1, warning: expect.any(String) })
    writeWeaponNumber(b, o, 'attack', 32767, { advanced: true })
    expect(readWeapon(b, o).numbers.attack.value).toBe(32767)
    // ✅ 質・質の最大値も int16
    writeWeaponNumber(b, o, 'quality', -2, { advanced: true })
    expect([...b.subarray(o + WEAPON_FIELDS.quality, o + WEAPON_FIELDS.quality + 2)]).toEqual([0xfe, 0xff])
    expect(readWeapon(b, o).numbers.quality.value).toBe(-2)
    writeWeaponNumber(b, o, 'qualityMax', -1, { advanced: true })
    expect(readWeapon(b, o).numbers.qualityMax.value).toBe(-1)
  })

  it('U-3：パーツは 2 B×4 で書く。刃は ID と X（鞘）、鍔・柄は ID だけ（[TS] の既知パーツは 3 B 値と同じバイト列になる）', () => {
    const before = makeSave()
    const o = beltOffset(0)
    const b = before.slice()
    writeWeaponPart(b, o, 'blade', ts(0x5c0045)) // 一文字の刃
    expect([...b.subarray(o + 0x08, o + 0x0c)]).toEqual([0x45, 0x00, 0x5c, 0x00])
    expect(onlyChanged(before, b, o + 0x08, 4)).toBe(true)
    const c = before.slice()
    writeWeaponPart(c, o, 'guard', ts(0x007f00)) // 一文字の鍔
    expect([...c.subarray(o + 0x0c, o + 0x0e)]).toEqual([0x7f, 0x00])
    expect(onlyChanged(before, c, o + 0x0c, 2)).toBe(true)
    const d = before.slice()
    writeWeaponPart(d, o, 'grip', ts(0x007e)) // 一文字の柄
    expect(onlyChanged(before, d, o + 0x0e, 2)).toBe(true)
  })

  it('[U] 2026-10-05：X の上位バイトが 01 の武器（和泉守兼定 X 0x162）に柾重の刃を書いても、鞘は柾重（0xCD）になる', () => {
    const b = makeSave()
    const o = beltOffset(0)
    writeWeaponPart(b, o, 'blade', ct(0x165))
    expect(readWeapon(b, o).sheath.value).toBe(0x162)
    writeWeaponPart(b, o, 'blade', ts(0xcd012a))
    expect([...b.subarray(o + 0x08, o + 0x0c)]).toEqual([0x2a, 0x01, 0xcd, 0x00])
    const w = readWeapon(b, o)
    expect(w.sheath).toMatchObject({ value: 0xcd, label: '柾重', warning: null })
    expect(w.blade.warning).toBeNull()
  })

  it('鞘が 0x100 以上の [TS] の刃は X の上位バイトまで書き、鍔を変えても X は変わらない', () => {
    const b = makeSave()
    const o = beltOffset(0)
    writeWeaponPart(b, o, 'blade', ts(0x580157)) // 陸奥守吉行
    expect(readWeapon(b, o).sheath).toMatchObject({ value: 0x158, label: '陸奥守吉行' })
    writeWeaponPart(b, o, 'guard', ts(0x15a01)) // 陸奥守吉行の鍔
    writeWeaponPart(b, o, 'guard', ts(0xd00)) // 中道刀の鍔
    expect(readWeapon(b, o).sheath.value).toBe(0x158)
    expect(readWeapon(b, o).guard.value.label).toBe('中道刀')
    // 刃の標準の鞘と違えば警告する
    b.set([0x39, 0x00], o + 0x0a)
    expect(readWeapon(b, o).blade.warning).toContain('標準の鞘')
  })

  it('定義のないパーツは名前なしで表示し、警告を出す。既知のパーツへの変更はできる（U-3・U-10）', () => {
    const b = makeSave()
    const o = beltOffset(0)
    b.set([0x00, 0x34, 0x12], o + 0x0b)
    const v = readWeapon(b, o)
    expect(v.guard.value).toEqual({ value: 0x123400, label: null, key: null })
    expect(v.guard.problem).toBeNull()
    expect(v.guard.warning).not.toBeNull()
    writeWeaponPart(b, o, 'guard', ts(0x015400)) // 霊禍（[U] 2026-10-05）
    expect(readWeapon(b, o).guard.value.label).toBe('霊禍')
  })

  it('[CT] の ID（ユーザー判断で確定扱い 2026-10-05）：刃は ID と 🔶 規則で計算した X を書く（U-3 案C）', () => {
    const before = makeSave()
    const o = beltOffset(0)
    // 通常系：X = ID + 0x17（村柾 0x4F → X 0x66）
    const b = before.slice()
    writeWeaponPart(b, o, 'blade', ct(0x4f))
    expect([...b.subarray(o + 0x08, o + 0x0c)]).toEqual([0x4f, 0x00, 0x66, 0x00])
    expect(onlyChanged(before, b, o + 0x08, 4)).toBe(true)
    expect(readWeapon(b, o).blade.value).toMatchObject({ label: '村柾', key: ct(0x4f) })
    // 色違い系：X = ID − 0x5D（霊禍 0x119 → X 0xBC）
    writeWeaponPart(b, o, 'blade', ct(0x119))
    expect([...b.subarray(o + 0x08, o + 0x0c)]).toEqual([0x19, 0x01, 0xbc, 0x00])
  })

  it('❓ U-3 案B（ユーザー判断 2026-10-05）：X 不明の [CT] の刃は今はない。x が null の刃だけが X 不明になる', () => {
    expect(BLADES.filter((p) => isXUnknown('blade', p))).toEqual([])
    expect(isXUnknown('blade', { source: 'ct', value: 0x999, label: '仮', x: null })).toBe(true)
    expect(isXUnknown('guard', { source: 'ct', value: 0x999, label: '仮' })).toBe(false)
  })

  it('通常パーツを刀と槍に分ける（[CT] の英語名「Spear …」。焔魔・霜柱・立奈美・藤奈美は [U] でも槍）', () => {
    const spears = (list: readonly PartOption[]) => list.filter((p) => partWeaponKind(p.label) === '槍').map((p) => p.label)
    expect(spears(BLADES)).toEqual([
      '黒獅子', '風花', '羅刹', '藤奈美', '富士ヶ根', '大文字', '麒麟児', '焔魔', '霜柱', '立奈美', '霧単穂',
    ])
    expect(spears(GUARDS)).toEqual(['黒獅子', '風花', '羅刹', '藤奈美', '霜柱', '立奈美'])
    expect(spears(GRIPS)).toEqual(['黒獅子', '風花', '羅刹', '藤奈美', '富士ヶ根', '大文字', '麒麟児', '焔魔', '霜柱', '立奈美'])
    expect(partWeaponKind(BLADES[0].label)).toBe('刀') // 中道刀
    // 鞘は同じ鞘を使う刃の名前の最初の1つで決める
    expect(partWeaponKind('麒麟児・霧単穂')).toBe('槍')
    expect(partWeaponKind('中道刀・なまくら刀')).toBe('刀')
  })

  it('パーツは読み（PART_READINGS）の五十音順に並べられる。どの通常パーツにも読みがある', () => {
    const names = new Set([...BLADES, ...GUARDS, ...GRIPS].map((p) => p.label))
    expect([...names].filter((n) => !(n in PART_READINGS))).toEqual([])
    const sorted = ['虎徹', '中道刀', '阿修羅', 'ハルユキ', '浅餓王'].sort(compareByReading)
    expect(sorted).toEqual(['浅餓王', '阿修羅', '虎徹', '中道刀', 'ハルユキ'])
  })

  it('🔶 U-3 案C（ユーザー判断 2026-10-05）：どの刃の X も鞘の表にある（規則で計算した X は、その刃の名前の鞘として足した）', () => {
    const ids = new Set(SHEATHS.map((s) => s.id))
    const missing = BLADES.filter((p) => {
      if (p.source === 'ct') return p.x == null || !ids.has(p.x)
      // [TS] の 3 B 値は X の下位バイトだけを持つ（上位バイトは鍔の 3 B の先頭）
      const low = (p.value >>> 16) & 0xff
      return !SHEATHS.some((s) => (s.id & 0xff) === low)
    })
    expect(missing.map((p) => p.label)).toEqual([])
    expect(SHEATHS.find((s) => s.id === 0x57)?.label).toBe('龍魔治')
    expect(SHEATHS.find((s) => s.id === 0xbc)?.label).toBe('霊禍')
    expect(SHEATHS.find((s) => s.id === 0xd2)?.label).toBe('二心')
  })

  it('U-3 [U] 2026-10-05 X が 0x100 以上の刃は、ID と実測の X を 2 B ずつ書く（和泉守兼定 0x162、活火山 0x163、夜葬 0x167）', () => {
    const before = makeSave()
    const o = beltOffset(0)
    for (const [id, x, label] of [
      [0x165, 0x162, '和泉守兼定'],
      [0x166, 0x163, '活火山'],
      [0x168, 0x167, '夜葬'],
    ] as const) {
      const b = before.slice()
      writeWeaponPart(b, o, 'blade', ct(id))
      expect([...b.subarray(o + 0x08, o + 0x0c)]).toEqual([id & 0xff, id >> 8, x & 0xff, x >> 8])
      expect(onlyChanged(before, b, o + 0x08, 4)).toBe(true)
      const w = readWeapon(b, o)
      expect(w.blade).toMatchObject({ value: { label }, warning: null })
      expect(w.sheath.label).toBe(label)
    }
  })

  it('U-3 [U] 2026-10-05 ゲーム内で分解→組み立てて分かった X：貫誠 0xA8、美帝骨 0x39、鮫肌丸 0x53、大黒生 0x54、微熱 0x55、ハルユキ 0x34、空道刀 0xAB、虎吉竹刀 0x56、残月 0x28', () => {
    const b = makeSave()
    const o = beltOffset(0)
    for (const [bytes, label] of [
      [[0x37, 0x00, 0xa8], '貫誠'],
      [[0x38, 0x00, 0x39], '美帝骨'],
      [[0x3c, 0x00, 0x53], '鮫肌丸'],
      [[0x3d, 0x00, 0x54], '大黒生'],
      [[0x3e, 0x00, 0x55], '微熱'],
      [[0x9f, 0x00, 0x34], 'ハルユキ'],
      // 鞘はほかの武器と同じ（高楊枝・竹刀・曼珠沙華）
      [[0xa3, 0x00, 0xab], '空道刀'],
      [[0xa9, 0x00, 0x56], '虎吉竹刀'],
      [[0x3e, 0x01, 0x28], '残月'],
    ] as const) {
      b.set(bytes, o + 0x08)
      expect(readWeapon(b, o).blade).toMatchObject({ value: { label }, warning: null })
      expect(readWeapon(b, o).sheath.label).toContain(label)
    }
  })

  it('[CT] の鍔は +0x0C の ID（u16）だけ、柄は +0x0E の ID だけを書く', () => {
    const before = makeSave()
    const o = beltOffset(0)
    const b = before.slice()
    writeWeaponPart(b, o, 'guard', ct(0x153)) // 断頭の鍔 339
    expect(onlyChanged(before, b, o + 0x0c, 2)).toBe(true)
    expect(readWeapon(b, o).guard.value).toMatchObject({ label: '断頭', key: ct(0x153) })
    const c = before.slice()
    writeWeaponPart(c, o, 'grip', ct(0xeb)) // 霊禍の柄 235
    expect(onlyChanged(before, c, o + 0x0e, 2)).toBe(true)
  })

  it('[U] 2026-10-05 見栄春（310）：規則を延ばした X 0xD9 では鞘が表示されず、ゲーム内で組み直したバイト列 36 01 26 を正とする', () => {
    const b = makeSave()
    const o = beltOffset(0)
    writeWeaponPart(b, o, 'blade', ts(0x260136))
    expect([...b.subarray(o + 0x08, o + 0x0b)]).toEqual([0x36, 0x01, 0x26])
    expect(readWeapon(b, o).blade).toMatchObject({ value: { label: '見栄春', key: ts(0x260136) }, warning: null })
    expect(() => writeWeaponPart(b, o, 'blade', ct(0x136))).toThrow()
  })

  it('U-13 案A（ユーザー判断 2026-10-05）：CT の刃 305〜316 は −1 した ID。[U] ゲーム内で組み立てた武器のバイト列を正とする', () => {
    const cases: [number, string][] = [
      [0xd80135, '立奈美'], // 309。X は規則（ID−0x5D）どおり
      [0x260136, '見栄春'], // 310
      [0x270137, '大天狗'], // 311
      [0x5b013a, 'イプスカリバ'], // 314
    ]
    for (const [value, label] of cases) {
      const b = makeSave()
      const o = beltOffset(0)
      writeWeaponPart(b, o, 'blade', ts(value))
      expect(readWeapon(b, o).blade).toMatchObject({ value: { value, label }, warning: null })
    }
  })

  it('[U] 2026-10-05 ゲーム内確認：焔魔の刃は 0x133（X 0xD6）、霜柱は 0x134、クルセイダーは 0x138、なまくら刀は 0x13B、夜葬の鍔は 0x167', () => {
    const b = makeSave()
    const o = beltOffset(0)
    b.set([0x33, 0x01, 0xd6], o + 0x08)
    expect(readWeapon(b, o).blade).toMatchObject({ value: { label: '焔魔' }, warning: null })
    writeWeaponPart(b, o, 'blade', ts(0xd70134))
    expect(readWeapon(b, o).blade.value.label).toBe('霜柱')
    writeWeaponPart(b, o, 'blade', ts(0x390138))
    expect(readWeapon(b, o).blade.value.label).toBe('クルセイダー')
    writeWeaponPart(b, o, 'blade', ts(0x18013b))
    expect(readWeapon(b, o).blade).toMatchObject({ value: { label: 'なまくら刀' }, warning: null })
    writeWeaponPart(b, o, 'guard', ct(0x167))
    expect(readWeapon(b, o).guard.value.label).toBe('夜葬')
    // CT の 362（銘「人斬り」と同じ ID）は誤記だったので選択肢にない
    expect(() => writeWeaponPart(b, o, 'guard', ct(0x16a))).toThrow()
  })

  it('U-8 武器種（+0x1E）・🔶 鞘（X、+0x0A〜+0x0B）は上級者モードでだけ書け、そのバイトだけを変える', () => {
    const before = makeSave()
    const o = beltOffset(0)
    const v = readWeapon(before, o)
    expect(v.weaponType).toMatchObject({ value: 0, label: '刀', problem: null })
    expect(v.sheath).toMatchObject({ value: 0x18, label: '中道刀・なまくら刀', problem: null })

    const b = before.slice()
    expect(() => writeWeaponType(b, o, 1)).toThrow()
    expect(() => writeWeaponSheath(b, o, 0x26)).toThrow()
    expect(diffOffsets(before, b)).toEqual([])

    writeWeaponType(b, o, 1, { advanced: true })
    expect(diffOffsets(before, b)).toEqual([o + 0x1e])
    expect(readWeapon(b, o).weaponType.label).toBe('槍')

    const c = before.slice()
    writeWeaponSheath(c, o, 0x139, { advanced: true }) // クルセイダー（上位バイト 01）
    expect(diffOffsets(before, c)).toEqual([o + 0x0a, o + 0x0b])
    expect(readWeapon(c, o).sheath.label).toBe('クルセイダー')

    expect(() => writeWeaponType(b, o, 5, { advanced: true })).toThrow()
    expect(() => writeWeaponSheath(b, o, 0x1234, { advanced: true })).toThrow()
  })

  it('[U] 2026-10-05：特殊武器の刃は 0xFF0000〜0xFF000B の12件（FF0006 は鬼ヶ島）。0x0C 以降はない', () => {
    const b = makeSave()
    const o = beltOffset(0)
    b.set([0x0b, 0x00, 0xff, 0xff, 0xff, 0xff], o + 0x08) // M2リボルバーの刃、鍔なし
    // [U] 2026-10-05：X 0xFFFF は鞘なし
    expect(readWeapon(b, o).sheath).toMatchObject({ value: 0xffff, label: '鞘なし', warning: null })
    writeWeaponSheath(b, o, 0xffff, { advanced: true })
    writeWeaponPart(b, o, 'blade', ts(0xff0006))
    expect(readWeapon(b, o).blade).toMatchObject({ value: { label: '鬼ヶ島' }, warning: null })
    writeWeaponId(b, o, 0x006a) // 完成武器 0x006A も鬼ヶ島（[U] 2026-10-05）
    expect(readWeapon(b, o).weaponId).toMatchObject({ value: 0x006a, label: '鬼ヶ島', warning: null })
    // [U] 2026-10-05：0x01・0x02・0x03・0x05・0x07・0x09 も名前が分かった
    writeWeaponPart(b, o, 'blade', ts(0xff0003))
    expect(readWeapon(b, o).blade.value.label).toBe('竹富士')
    expect(() => writeWeaponPart(b, o, 'blade', ts(0xff000c))).toThrow()
  })

  it('D-15：特殊武器は特殊武器の刃の間だけで変えられ、鍔・柄は変えられない', () => {
    const b = makeSave()
    const o = beltOffset(0)
    b.set([0x08, 0x00, 0xff], o + 0x08) // 出刃包丁の刃
    const v = readWeapon(b, o)
    expect(v.special).toBe(true)
    expect(v.blade.value.label).toBe('出刃包丁')
    expect(v.guard.problem).not.toBeNull()
    expect(() => writeWeaponPart(b, o, 'blade', ts(0x180006))).toThrow()
    writeWeaponPart(b, o, 'blade', ts(0xff0004)) // 十手
    expect(() => writeWeaponPart(b, o, 'grip', ts(0x000c))).toThrow()
  })

  it('❓ U-1：サイズが 0x48BB0 でなければ読み取り専用', () => {
    const b = new Uint8Array(TS_SAVE_SIZE + 8)
    b.set(makeSave())
    const v = readBelt(b)
    expect(v.layoutProblem).not.toBeNull()
    expect(v.state.problem).not.toBeNull()
    expect(v.weapons[0].name.problem).not.toBeNull()
    expect(() => writeBeltMineuchi(b, true)).toThrow()
  })

  it('[U] 2026-10-05：右手（0xA6A9）が 0xFF なら何も選んでいない', () => {
    const b = makeSave()
    b[BELT_STATE.right] = 0xff
    expect(readBelt(b).state).toMatchObject({ right: null, left: null, problem: null })
    // 何も持っていないときは二刀流にできない
    expect(() => writeBeltDual(b, 0)).toThrow()
    writeBeltRight(b, 0)
    expect(readBelt(b).state.right).toBe(0)
    writeBeltRight(b, null)
    expect(b[BELT_STATE.right]).toBe(0xff)
  })

  it('二刀流のままでは右手を空にできない。右手なしの二刀流は読み取り専用', () => {
    const b = makeSave()
    b.set([0x43, 0x00], beltOffset(1) + WEAPON_FIELDS.name) // 2本目も使える武器にする
    b[beltOffset(1) + 6] = 0xff
    b[beltOffset(1) + 7] = 0xff
    b.set([0x06, 0x00, 0x18], beltOffset(1) + 0x08)
    writeBeltDual(b, 1)
    expect(() => writeBeltRight(b, null)).toThrow()
    b[BELT_STATE.right] = 0xff
    expect(readBelt(b).state.problem).not.toBeNull()
  })

  it('帯刀の状態が想定外の値なら読み取り専用', () => {
    const b = makeSave()
    b[BELT_STATE.dual] = 1 // 左手が 0xFF のまま二刀流
    expect(readBelt(b).state.problem).not.toBeNull()
    expect(() => writeBeltMineuchi(b, true)).toThrow()
  })
})

describe('武器の数値：ゲーム上の範囲とシステム上の範囲', () => {
  it('通常はゲーム上の範囲（§5.7）で、上級者モードではシステム上の範囲で検証する', () => {
    expect(validateWeaponNumber('attack', 500)).toBeNull()
    expect(validateWeaponNumber('attack', 501)).not.toBeNull()
    expect(validateWeaponNumber('attack', -1)).not.toBeNull()
    // ✅ 攻撃力は int16（ユーザー確認 2026-10-05）
    expect(validateWeaponNumber('attack', 32767, { advanced: true })).toBeNull()
    expect(validateWeaponNumber('attack', -32768, { advanced: true })).toBeNull()
    expect(validateWeaponNumber('attack', 32768, { advanced: true })).not.toBeNull()
    // ✅ 質・質の最大値も int16（ユーザー確認 2026-10-05）
    expect(validateWeaponNumber('quality', -32768, { advanced: true })).toBeNull()
    expect(validateWeaponNumber('quality', 32768, { advanced: true })).not.toBeNull()
    expect(validateWeaponNumber('qualityMax', -1, { advanced: true })).toBeNull()
    // ✅ 耐久（現在・最大）も int16（ユーザー確認 2026-10-05）
    expect(validateWeaponNumber('durability', -1, { advanced: true })).toBeNull()
    expect(validateWeaponNumber('durabilityMax', 32768, { advanced: true })).not.toBeNull()
    // ✅ 斬殺数は uint16（ユーザー確認 2026-10-05）
    expect(validateWeaponNumber('kills', 65535, { advanced: true })).toBeNull()
    expect(validateWeaponNumber('kills', 65536, { advanced: true })).not.toBeNull()
    expect(validateWeaponNumber('kills', -1, { advanced: true })).not.toBeNull()
    // 🔶 つま斬り数も uint16 と推測
    expect(validateWeaponNumber('tsumaKills', 65535, { advanced: true })).toBeNull()
    expect(validateWeaponNumber('tsumaKills', -1, { advanced: true })).not.toBeNull()
  })
})
