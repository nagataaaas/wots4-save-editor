// 流通中の武器・道具・部品（🟢、読み取り専用）。合成したバイト列でテストする（sample/ は解析専用で、テストには使わない。ユーザー判断 2026-10-05）。
// ❓ U-1 位置は固定オフセット（サイズ 0x48BB0 のセーブでの値）。
import { describe, expect, it } from 'vitest'
import { TS_SAVE_SIZE } from './hero'
import {
  MARKET_END,
  MARKET_OTHERS,
  MARKET_WEAPON_SLOTS,
  marketWeaponOffset,
  readMarket,
  refineChance,
  vanishChance,
} from './market-weapons'

/** 🟢 空きの武器の件（0xA4 B）：全体が 0 で、+0x02〜+0x09・+0x94〜+0x95・+0xA0〜+0xA3 が FF */
const EMPTY_WEAPON = (() => {
  const e = new Uint8Array(0xa4)
  e.fill(0xff, 0x02, 0x0a)
  e.fill(0xff, 0x94, 0x96)
  e.fill(0xff, 0xa0, 0xa4)
  return e
})()

/** 空きの流通の記録だけを持つセーブ */
function makeSave(): Uint8Array {
  const b = new Uint8Array(TS_SAVE_SIZE)
  for (let i = 0; i < MARKET_WEAPON_SLOTS; i++) b.set(EMPTY_WEAPON, marketWeaponOffset(i))
  for (const o of MARKET_OTHERS) for (let i = 0; i < o.slots; i++) b.set([0xff, 0xff], o.offset + i * o.bytes)
  return b
}

/** 中道刀相当の部品（完成武器 0x06・刃 0x18・X 0x0D・鍔 0x0C）を入れ、経過の数と持ち主を書く */
function putWeapon(b: Uint8Array, index: number, elapsed: number, holder: number) {
  const at = marketWeaponOffset(index)
  b.set([0x06, 0x00, 0x18, 0x00, 0x0d, 0x00, 0x0c, 0x00, 0x0c, 0x00], at)
  b.set([0x2c, 0x01, 0xe8, 0x03, 0x05, 0x00, 0x0a, 0x00], at + 0x10) // 攻撃力 300・最大耐久 1000・質 5・質の最大 10
  b.fill(0xff, at + 0x1e, at + 0x1e + 2)
  b.fill(0xff, at + 0x22, at + 0x22 + 2)
  b.fill(0xff, at + 0x26, at + 0x26 + 2)
  b.set([elapsed & 0xff, (elapsed >> 8) & 0xff], at + 0x94)
  b.set([holder & 0xff, (holder >> 8) & 0xff, (holder >> 16) & 0xff, (holder >> 24) & 0xff], at + 0xa0)
}

describe('🟢 流通中の武器・道具・部品', () => {
  it('位置：武器は 0x440D8 から 0xA4 × 15 件、道具・刃・鍔・柄が隙間なく続いて 0x45F3B で終わる', () => {
    expect(marketWeaponOffset(0)).toBe(0x440d8)
    expect(marketWeaponOffset(14) + 0xa4).toBe(0x44a74)
    const [item, blade, guard, grip] = MARKET_OTHERS
    expect(item.offset).toBe(0x44a74)
    expect(item.offset + item.slots * item.bytes).toBe(blade.offset)
    expect(blade.offset + blade.slots * blade.bytes).toBe(guard.offset)
    expect(guard.offset + guard.slots * guard.bytes).toBe(grip.offset)
    expect(grip.offset + grip.slots * grip.bytes - 1).toBe(MARKET_END)
  })

  it('空きの記録だけなら、武器も道具・部品も 0 件', () => {
    const view = readMarket(makeSave())
    expect(view.layoutProblem).toBeNull()
    expect(view.weapons).toEqual([])
    expect(view.others.map((o) => o.filled)).toEqual([0, 0, 0, 0])
  })

  it('空きでない武器だけを、経過の数と持ち主（−1 は null）つきで読む', () => {
    const b = makeSave()
    putWeapon(b, 2, 3, -1)
    putWeapon(b, 9, 1, 0x1234)
    b.set([0x05, 0x00], MARKET_OTHERS[0].offset + 0x0c) // 道具 1 件
    const view = readMarket(b)
    expect(view.weapons.map((w) => [w.index, w.offset, w.elapsed, w.holder])).toEqual([
      [2, 0x440d8 + 2 * 0xa4, 3, null],
      [9, 0x440d8 + 9 * 0xa4, 1, 0x1234],
    ])
    expect(view.weapons[0].weapon.numbers.attack.value).toBe(300)
    expect(view.others[0].filled).toBe(1)
  })

  it('道具：ID・名前・個数（✅ +0x02）・経過の数（🟢 +0x08）と、残りのバイト（❓）を読む', () => {
    const b = makeSave()
    const item = MARKET_OTHERS[0]
    b.set([0x05, 0x00, 0x03, 0x00, 0x06, 0x00, 0x00, 0x00, 0x02, 0x00, 0xaa, 0xbb], item.offset + 4 * item.bytes)
    const [entry] = readMarket(b).others[0].entries
    expect(entry).toMatchObject({ index: 4, offset: item.offset + 4 * 0x0c, id: 5, label: 'ひよこういろう', count: 3, elapsed: 2 })
    expect([...entry.rest]).toEqual([0x06, 0x00, 0x00, 0x00, 0xaa, 0xbb])
  })

  it('刃・鍔・柄：部品 ID と名前・経過の数（🟢 刃 +0x12、鍔・柄 +0x0C）を読む。表にない ID は名前なし', () => {
    const b = makeSave()
    const [, blade, guard, grip] = MARKET_OTHERS
    b.set([0x06, 0x00], blade.offset)
    b.set([0x01, 0x00], blade.offset + 0x12)
    b.set([0x0d, 0x00], guard.offset + 99 * guard.bytes)
    b.set([0x03, 0x00], guard.offset + 99 * guard.bytes + 0x0c)
    b.set([0x0c, 0x00], grip.offset + grip.bytes)
    b.set([0xfe, 0x7f], grip.offset + 2 * grip.bytes) // 表にない ID
    const others = readMarket(b).others
    expect(others[1].entries.map((e) => [e.index, e.id, e.label, e.count, e.elapsed, e.rest.length])).toEqual([[0, 6, '中道刀', null, 1, 0x10]])
    expect(others[2].entries.map((e) => [e.index, e.label, e.elapsed, e.rest.length])).toEqual([[99, '中道刀', 3, 0x0c]])
    expect(others[3].entries.map((e) => [e.index, e.label])).toEqual([
      [1, '中道刀'],
      [2, null],
    ])
    expect(others.map((o) => o.filled)).toEqual([0, 1, 1, 2])
  })

  it('読むだけで、バイト列を変えない', () => {
    const b = makeSave()
    putWeapon(b, 0, 5, 7)
    const before = b.slice()
    readMarket(b)
    expect(b).toEqual(before)
  })

  it('サイズが違うファイルは、値を読んだうえで問題として示す（U-1）', () => {
    const b = new Uint8Array(TS_SAVE_SIZE + 2)
    b.set(makeSave())
    expect(readMarket(b).layoutProblem).not.toBeNull()
    expect(() => readMarket(new Uint8Array(MARKET_END))).toThrow(RangeError)
  })

  it('次の周回の終わりの確率は、+1 したあとの経過の数で決まる', () => {
    // 消える：e＝1・2 で 0%、3 で 20%、4 で 33%、5 以上で 51%
    expect([0, 1, 2, 3, 4, 10].map(vanishChance)).toEqual([0, 0, 20, 33, 51, 51])
    // 精錬：e＝1 で 15%、2 で 20%、3 で 30%、4 で 60%、5 以上で 100%
    expect([0, 1, 2, 3, 4, 10].map(refineChance)).toEqual([15, 20, 30, 60, 100, 100])
  })
})
