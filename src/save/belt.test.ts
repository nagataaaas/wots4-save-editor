// 帯刀と武器レコード。実セーブ（sample/S4-DATA_00、02、02 copy、02 copy 2）があるときはそれでテストし、ないときは飛ばす。
// 合成したバイト列のテストは、実セーブから帯刀の範囲を写したものを使う（実セーブがないときは飛ばす）。
/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BELT_STATE, NO_LEFT, beltOffset, readBelt, writeBeltDual, writeBeltMineuchi, writeBeltRight } from './belt'
import { TS_SAVE_SIZE } from './hero'
import {
  NUMBER_KEYS,
  WEAPON_FIELDS,
  WEAPON_NAME_MAX_CHARS,
  WEAPON_RECORD_BYTES,
  decodeTitle,
  encodeTitle,
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

const sample = (name: string) => new URL(`../../sample/${name}`, import.meta.url)
const SAMPLES = ['S4-DATA_00', 'S4-DATA_02', 'S4-DATA_02 copy', 'S4-DATA_02 copy 2']
const hasSamples = SAMPLES.every((n) => existsSync(sample(n)))
const load = (name: string) => new Uint8Array(readFileSync(sample(name)))

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

// 2026-10-05：ゲーム内で見栄春を組み直したあとの S4-DATA_02（帯刀3本目が見栄春）
describe.skipIf(!existsSync(sample('S4-DATA_02')))('実セーブ（sample/S4-DATA_02、見栄春を組み直したもの）', () => {
  it('[U] 帯刀3本目の刃は見栄春（36 01 26）', () => {
    const b = load('S4-DATA_02')
    const w = readBelt(b).weapons[2]
    if (w.name.value !== '無名') return // 組み直す前の S4-DATA_02 なら確かめない
    expect(w.blade.value).toEqual({ value: 0x260136, label: '見栄春', key: ts(0x260136) })
  })
})

// 2026-10-05：ゲーム内で大天狗・イプスカリバ・立奈美を組み立てた S4-DATA_02 copy（質の最大値は 13・20・12 とユーザーが確認）
describe.skipIf(!existsSync(sample('S4-DATA_02 copy')))('実セーブ（sample/S4-DATA_02 copy、U-13 の3本）', () => {
  it('[U] 帯刀の刃と質の最大値', () => {
    const ws = readBelt(load('S4-DATA_02 copy')).weapons
    if (ws.some((w) => w.name.value !== '無名')) return // 峰打の差分に使った前の 02 copy なら確かめない
    expect(ws.map((w) => w.blade.value.label)).toEqual(['大天狗', 'イプスカリバ', '立奈美'])
    expect(ws.map((w) => w.numbers.qualityMax.value)).toEqual([13, 20, 12])
  })
})

// 2026-10-05：帯刀に上から刀・槍・拳銃を置いた S4-DATA_02 copy 2（U-8 の根拠）
describe.skipIf(!existsSync(sample('S4-DATA_02 copy 2')))('実セーブ（sample/S4-DATA_02 copy 2、刀・槍・拳銃）', () => {
  it('[U] U-8：武器種は +0x1E（刀 0・槍 1・拳銃 3）', () => {
    const ws = readBelt(load('S4-DATA_02 copy 2')).weapons
    if (ws[2].name.value !== 'M2リボルバー') return // 二刀流の差分に使った前の 02 copy 2 なら確かめない
    expect(ws.map((w) => [w.weaponType.value, w.weaponType.label])).toEqual([
      [0, '刀'],
      [1, '槍'],
      [3, '拳銃'],
    ])
  })
})

describe.skipIf(!hasSamples)('実セーブ（sample/）', () => {
  it('✅ [TS][I-3] 帯刀3本を読む（S4-DATA_02 copy 2）', () => {
    const v = readBelt(load('S4-DATA_02 copy 2'))
    expect(v.layoutProblem).toBeNull()
    const [w0, w1, w2] = v.weapons
    expect(w0).toMatchObject({ offset: 0xa4c2, empty: false, problem: null, special: false })
    expect(w0.name.value).toBe('Heavy Wisp')
    expect(w0.weaponId).toMatchObject({ value: 0xffff, label: '自作' })
    expect(w0.blade.value).toEqual({ value: 0x5a0043, label: '氷天過', key: ts(0x5a0043) })
    expect(w0.grip.value).toEqual({ value: 0x14, label: '絶天', key: ts(0x14) })
    // 鍔 0x015400 は [TS] に定義がないが、ゲーム内の表示で霊禍と確認した（[U] 2026-10-05）
    expect(w0.guard.value).toEqual({ value: 0x015400, label: '霊禍', key: ts(0x015400) })
    expect(w0.guard).toMatchObject({ problem: null, warning: null })
    expect(w0.numbers.attack.value).toBe(500)
    expect(w0.numbers.durabilityMax.value).toBe(2000)
    expect(w0.numbers.durability.value).toBe(2000)
    // 質 24 は正規の上限 21 を超えている（警告だけ）
    expect(w0.numbers.quality).toMatchObject({ value: 24, problem: null })
    expect(w0.numbers.quality.warning).not.toBeNull()
    expect(w0.charms.value).toEqual([9, 9, 9]) // 重撃×3（組は 09 00 03 00 の1つ）
    expect(w0.title).toMatchObject({ value: null, label: 'なし' })
    expect(w1.name.value).toBe('RainMaker')
    expect(w1.blade.value.label).toBe('中道刀')
    expect(w1.guard.value.label).toBe('中道刀')
    expect(w2.name.value).toBe('Heal')
    expect(w2.guard.value.label).toBe('数寄者')
  })

  it('[U] 2026-10-05 帯刀の状態：右手・二刀流の左手・峰打（§3.4 の差分）', () => {
    expect(readBelt(load('S4-DATA_00')).state).toMatchObject({ count: 3, right: 0, left: null, mineuchi: false, problem: null })
    expect(readBelt(load('S4-DATA_02')).state).toMatchObject({ right: 1, left: null, mineuchi: false, problem: null })
    expect(readBelt(load('S4-DATA_02 copy')).state).toMatchObject({ right: 1, left: null, mineuchi: true, problem: null })
    expect(readBelt(load('S4-DATA_02 copy 2')).state).toMatchObject({ right: 1, left: 2, mineuchi: true, problem: null })
  })

  it('🔶 手に持っていた時間（+0x86）を読む', () => {
    expect(readBelt(load('S4-DATA_02')).weapons.map((w) => w.heldTime)).toEqual([715, 271, 77])
  })

  it('読み出した値をそのまま書き戻すとバイト一致する（往復テスト）', () => {
    for (const name of SAMPLES) {
      const before = load(name)
      const b = before.slice()
      const v = readBelt(before)
      v.weapons.forEach((w, i) => {
        const o = beltOffset(i)
        writeWeaponName(b, o, w.name.value)
        writeWeaponId(b, o, w.weaponId.value)
        // 実セーブにはゲーム上の範囲外の値（質など）もあるので、上級者モード（システム上の範囲）で書き戻す
        for (const key of NUMBER_KEYS) writeWeaponNumber(b, o, key, w.numbers[key].value, { advanced: true })
        for (const kind of ['blade', 'guard', 'grip'] as const) {
          const key = w[kind].value.key
          // [TS] の値と完全一致するものだけ（[CT] の刃は X を規則で計算し直すので一致しないことがある）
          if (key?.startsWith('ts:')) writeWeaponPart(b, o, kind, key)
        }
        writeWeaponCharms(b, o, w.charms.value)
        writeWeaponTitle(b, o, w.title.value)
      })
      writeBeltMineuchi(b, v.state.mineuchi)
      writeBeltDual(b, v.state.left)
      writeBeltRight(b, v.state.right)
      expect(diffOffsets(before, b), name).toEqual([])
    }
  })

  it('状態の書き込みは各1バイトだけを変え、武器袋[0] のほかのバイトは変えない', () => {
    const before = load('S4-DATA_02')
    const b = before.slice()
    writeBeltMineuchi(b, true)
    expect(diffOffsets(before, b)).toEqual([BELT_STATE.mineuchi])
    // 02 → 02 copy の差分と同じ値になる
    expect(b[BELT_STATE.mineuchi]).toBe(load('S4-DATA_02 copy')[BELT_STATE.mineuchi])

    const c = load('S4-DATA_02 copy')
    const d = c.slice()
    writeBeltDual(d, 2)
    expect(diffOffsets(c, d)).toEqual([BELT_STATE.left, BELT_STATE.dual])
    const want = load('S4-DATA_02 copy 2')
    expect([...d.subarray(0xa6a8, 0xa6b0)]).toEqual([...want.subarray(0xa6a8, 0xa6b0)])

    writeBeltDual(d, null)
    expect([...d.subarray(0xa6a8, 0xa6b0)]).toEqual([...c.subarray(0xa6a8, 0xa6b0)])
  })

  it('右手と左手に同じ武器は持てない', () => {
    const b = load('S4-DATA_02 copy 2')
    const before = b.slice()
    expect(() => writeBeltRight(b, 2)).toThrow()
    expect(() => writeBeltDual(b, 1)).toThrow()
    expect(() => writeBeltRight(b, 3)).toThrow()
    expect(diffOffsets(before, b)).toEqual([])
    writeBeltRight(b, 0)
    expect(readBelt(b).state).toMatchObject({ right: 0, left: 2 })
  })

  it('武器の書き込みは +0x00〜+0x05 を変えない（武器袋[0] の先頭は帯刀の状態と重なる。§3.4）', () => {
    const before = load('S4-DATA_02 copy 2')
    const b = before.slice()
    const o = beltOffset(2)
    writeWeaponName(b, o, 'Test')
    writeWeaponNumber(b, o, 'attack', 123)
    writeWeaponCharms(b, o, [0, 0, 5])
    writeWeaponTitle(b, o, 0x13)
    writeWeaponPart(b, o, 'blade', ts(0x5a0043))
    writeWeaponId(b, o, 0x0002)
    const d = diffOffsets(before, b)
    expect(d.every((i) => i >= o + 6 && i < o + WEAPON_RECORD_BYTES)).toBe(true)
    // 武器袋[0] の先頭（0xA6AA〜0xA6AF）とコピー領域（0x1A78C 付近）は変わらない
    expect(d.some((i) => i >= 0xa6a8 || i < 0xa4c2)).toBe(false)
  })
})

/** 実セーブがなくても動く、合成したバイト列のテスト。帯刀1本目にだけ武器を入れる */
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

  it('✅ U-3 案A：パーツは [TS] の値のまま、刃・鍔は 3 B、柄は 2 B を書く', () => {
    const before = makeSave()
    const o = beltOffset(0)
    const b = before.slice()
    writeWeaponPart(b, o, 'blade', ts(0x5c0045)) // 一文字の刃
    expect(onlyChanged(before, b, o + 0x08, 3)).toBe(true)
    const c = before.slice()
    writeWeaponPart(c, o, 'guard', ts(0x007f00)) // 一文字の鍔
    expect(onlyChanged(before, c, o + 0x0b, 3)).toBe(true)
    const d = before.slice()
    writeWeaponPart(d, o, 'grip', ts(0x007e)) // 一文字の柄
    expect(onlyChanged(before, d, o + 0x0e, 2)).toBe(true)
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

  it('❓ U-3 案B（ユーザー判断 2026-10-05）：X 不明の [CT] の刃は ID だけを書き、X は元のまま残して警告する', () => {
    const before = makeSave()
    const o = beltOffset(0)
    const b = before.slice()
    const x = [...before.subarray(o + 0x0a, o + 0x0c)]
    // 貫誠 0x37（規則外）
    writeWeaponPart(b, o, 'blade', ct(0x37))
    expect([...b.subarray(o + 0x08, o + 0x0c)]).toEqual([0x37, 0x00, ...x])
    expect(onlyChanged(before, b, o + 0x08, 2)).toBe(true)
    const blade = readWeapon(b, o).blade
    expect(blade.value).toMatchObject({ label: '貫誠', key: ct(0x37) })
    expect(blade.warning).toContain('分解→組み立て')
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
