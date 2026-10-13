// 新しい周回の始め。出典：docs/save_format/chunks/date-location「周回の終わりの初期化」（🟢）と、
// 調査記録 2026-10-08_new-cycle.md（[U] 2026-10-08）。
//
// 2つの書き込みを用意する（[U] 2026-10-08 のユーザー判断）：
//
// 1. enableCharacterSetup：0x0010（段階）を 0 にするだけ。
//    ✅ [U] 「続きから」で難易度と主人公の設定に進む。イベントの状態は前の周回のままなので、序章のイベントは始まらず、セーブした場所から始まる
//
// 2. startNewCycle：物語を終えたときにゲームが行う処理を、同じ順序で行う（すべてゲームと同じにする。ユーザー判断 2026-10-09）。
//    終わり方は「クリア」（結末を見た）か「立ち去り」（町を立ち去った）を選ぶ。死亡の終わり方は扱わない。
//    🟢 処理の中身。✅ [U] 2026-10-08 以前の版（同じ初期化の一部）で、新しい周回として遊べた。
//    ✅ [U] 2026-10-09 クリアのあとに保存したセーブは難易度が普通（1）になる
//
//    引き継ぎ（クリア・立ち去り）🟢：
//    - クリアだけ：難易度ごとのクリア回数 0x43398 + 難易度×2（u16、1000 まで）+1
//    - 立ち去りだけ：立ち去った回数 0x46340（u32、99,999 まで）+1
//    - 記録 B（0x3838〜、166件）：状態 A が 00〜05 で、B が 04 でなければ B ← A
//    - 流通の記録の経過の数 +1（武器 15件・道具 10件・刃・鍔・柄 各100件）
//    - なりわいのフラグ 4〜14・18・19・23〜31（0x011C + 番号）を 0
//    - 武器袋（9 → 0 の順）→ 武器箪笥の空き枠（先頭から容量×10 枠。本数が容量以上なら入れない）。本数 +1。入らなければ袋に残す
//    - 所持金 → 金庫（999,999 まで）
//    - 手持ちの道具（9 → 0 の順）→ 道具の箪笥（同じ品で 99 個未満の枠を優先し、99 で止めて残りを次の枠へ。空きがなければ手持ちに残す）
//    - 持っている刃・鍔・柄（99 → 0 の順）→ 部品の箪笥の最初の空き枠。部品 ID ごとの数（0x131F8 + ID、u8、255 まで）+1
//    ゲームは流通の武器を確率で消したり変えたりするが、乱数を使い中身も分かっていないので、ここでは行わない
//
//    共通の初期化 🟢（下の resetCycle の表）
//
// 固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readI16, readI8, readU16, readU32, readU8, writeF32, writeU16, writeU32, writeU8 } from './binary'
import { HERO_OFFSETS, AMOUNT_LIMITS, checkLayout } from './hero'
import { DIFFICULTY_OFFSET } from './difficulty'
import { CLEAR_COUNTS_OFFSET, GONE_COUNT_OFFSET } from './cycle-counts'
import { HINT_OFFSET, HINT_NONE } from './hint'
import { TOOLS_AREA, CHEST_AREA } from './item-box'
import { ITEM_SLOT_BYTES } from './item-slot'
import { VALUABLES_OFFSET, VALUABLE_SLOT_COUNT } from './valuables'
import { MARKET_WEAPON_OFFSET, MARKET_WEAPON_SLOTS, MARKET_WEAPON_BYTES, MARKET_ELAPSED, MARKET_OTHERS } from './market-weapons'
import { OCCUPATION_FLAG_START, PERSON_RECORDS_START, PERSON_RECORD_SIZE, PERSON_COUNT } from './townsfolk'
import { statField, ACTION_COUNTS_OFFSET, ACTION_COUNT_SLOTS, DAMAGE_CYCLE_OFFSET, DAMAGE_KINDS } from './stats'
import { SCORE_TABLES } from './score-tables'
import { RAID_OFFSET } from './dojo'
import { RECORDS_OFFSET, RECORD_SIZE, RECORD_CAPACITY, RECORD_EMPTY_BYTES, STAGE_OFFSET, LOVE_COUNT_OFFSET, PROMISE_OFFSET, PROMISE_CODEC } from './yobai'
import { findItem } from './master/item-names'
import { DATE_OFFSETS } from './scenario-date'
import { EVENT_STATE_OFFSET, EVENT_RECORD_OFFSET, EVENT_COUNT } from './scenario-events'
import { WEAPON_RECORD_BYTES, WEAPON_FIELDS } from './weapon'
import { WEAPON_BAG_COUNT, weaponBagOffset } from './weapon-bag'
import { WEAPON_CHEST_CAPACITY, WEAPON_CHEST_COUNT, WEAPON_CHEST_OFFSET } from './weapon-chest'

/** 物語の終わり方。clear＝結末を見た、gone＝町を立ち去った */
export type CycleEnd = 'clear' | 'gone'

/** シナリオのフラグ（通し番号 166〜399） */
const SCENARIO_FLAGS = { start: EVENT_STATE_OFFSET + EVENT_COUNT, end: EVENT_RECORD_OFFSET - 1 } as const
/** 🟢 シナリオのフラグのうち初期化で残すもの：施設 0x375D〜0x375F・0x3760、堂島の職 0x3799・0x379A */
export const NEW_CYCLE_KEEP_FLAGS: readonly number[] = [0x375d, 0x375e, 0x375f, 0x3760, 0x3799, 0x379a]

/** 🟢 なりわいのフラグの先頭（0x011C + 番号） */
const OCCUPATION_FLAGS = OCCUPATION_FLAG_START
/** 🟢 クリア・立ち去りで 0 にするなりわいのフラグの番号 */
export const NEW_CYCLE_CLEARED_OCCUPATION_FLAGS: readonly number[] = [
  4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 18, 19, 23, 24, 25, 26, 27, 28, 29, 30, 31,
]

/** 🟢 難易度（u8）。初期化で 1（普通）にする */
const DIFFICULTY = DIFFICULTY_OFFSET
const DIFFICULTY_AFTER = 1
/** 🟢 難易度ごとのクリア回数（u16 × 4） */
const CLEAR_COUNTS = CLEAR_COUNTS_OFFSET
const CLEAR_COUNT_MAX = 1000
/** 🟢 立ち去った回数（u32） */
const GONE_COUNT = GONE_COUNT_OFFSET
const GONE_COUNT_MAX = 99_999

const MONEY = HERO_OFFSETS.money
const VAULT = HERO_OFFSETS.cashbox
const VAULT_MAX = AMOUNT_LIMITS.cashbox

/** 🟢 武器レコードの刃・X・鍔・柄（u16 × 4）。どれも負なら空き */
const WEAPON_PARTS = WEAPON_FIELDS.blade

/** 🟢 道具の枠（8 B）。手持ち 10 枠・箪笥 80 枠・貴重品 10 枠 */
const ITEM_SLOT = ITEM_SLOT_BYTES
const ITEM_HAND = { offset: TOOLS_AREA.offset, slots: TOOLS_AREA.slotCount }
const ITEM_CHEST = { offset: CHEST_AREA.offset, slots: CHEST_AREA.slotCount }
const VALUABLES = { offset: VALUABLES_OFFSET, slots: VALUABLE_SLOT_COUNT }
/** 🟢 箪笥で同じ品をまとめる上限 */
const ITEM_CHEST_STACK = 99
/** 🟢 貴重品のうち初期化で残す品：くず鉄・卸し鉄・堂島鋼・緋緋色金。道具の表にない品も残す */
export const NEW_CYCLE_KEEP_VALUABLES: readonly number[] = [0x29, 0x2a, 0x2b, 0x2c]

/** 🟢 持っている部品と部品の箪笥（先頭 u16 が部品 ID、FFFF で空き） */
const PARTS = [
  { kind: '刃', carried: 0x6326, chest: 0x738e, bytes: 0x12 },
  { kind: '鍔', carried: 0x6a2e, chest: 0x88a6, bytes: 0x0c },
  { kind: '柄', carried: 0x6ede, chest: 0x96b6, bytes: 0x0c },
] as const
const PARTS_CARRIED_SLOTS = 100
const PARTS_CHEST_SLOTS = 300
/** 🟢 部品 ID ごとの数（u8 × 0x400、255 まで） */
const PARTS_COUNT = 0x131f8
const PARTS_ID_LIMIT = 0x400

/** 🟢 流通の記録。経過の数（u16）を周回の終わりに +1 する */
const DISTRIBUTION = [
  { offset: MARKET_WEAPON_OFFSET, slots: MARKET_WEAPON_SLOTS, bytes: MARKET_WEAPON_BYTES, age: MARKET_ELAPSED, weapon: true },
  ...MARKET_OTHERS.map(d => ({ ...d, age: d.elapsed, weapon: false })),
] as const

/** 🔶 現在地 0x27（港（騒乱／希望の光用））。🟢 初期化で書く値 */
export const NEW_CYCLE_LOCATION = 0x27

/** startNewCycle の結果。入りきらずに元の場所に残った数も返す */
export type NewCycleReport = {
  end: CycleEnd
  weaponsMoved: number
  weaponsLeft: number
  itemsMoved: number
  itemsLeft: number
  partsMoved: number
  partsLeft: number
  valuablesRemoved: number
  vaultAdded: number
}

function assertLayout(bytes: Uint8Array): void {
  const problem = checkLayout(bytes)
  if (problem) throw new RangeError(problem)
}

/** 0x0010（u16）だけを 0 にする。✅ [U] 次のロードで難易度と主人公の設定に進む */
export function enableCharacterSetup(bytes: Uint8Array): void {
  assertLayout(bytes)
  writeU16(bytes, DATE_OFFSETS.dayTime, 0)
}

// 🟢 周回移行時は4語がすべて負なら空き。表示用 isEmptyWeapon の FFFF 判定とは対象が違う。
const isEmptyWeaponForCycleTransfer = (bytes: Uint8Array, at: number) => {
  for (let i = 0; i < 4; i++) if (readI16(bytes, at + WEAPON_PARTS + i * 2) >= 0) return false
  return true
}

/** 🟢 記録 B の更新 */
function updateEventRecords(bytes: Uint8Array): void {
  for (let n = 0; n < EVENT_COUNT; n++) {
    const a = readU8(bytes, EVENT_STATE_OFFSET + n)
    if (a > 5) continue
    if (readU8(bytes, EVENT_RECORD_OFFSET + n) === 0x04) continue
    writeU8(bytes, EVENT_RECORD_OFFSET + n, a)
  }
}

/** 🟢 流通の記録の経過の数を +1（u16 で回る） */
function ageDistribution(bytes: Uint8Array): void {
  for (const d of DISTRIBUTION) {
    for (let i = 0; i < d.slots; i++) {
      const at = d.offset + i * d.bytes
      const used = d.weapon ? !isEmptyWeaponForCycleTransfer(bytes, at) : readI16(bytes, at) >= 0
      if (used) writeU16(bytes, at + d.age, (readU16(bytes, at + d.age) + 1) & 0xffff)
    }
  }
}

/** 🟢 武器箪笥の空き枠。先頭から容量×10 枠だけを見て、本数が容量以上なら -1 */
function weaponChestFreeSlot(bytes: Uint8Array): number {
  const capacity = readI8(bytes, WEAPON_CHEST_CAPACITY) * 10
  if (capacity <= readI16(bytes, WEAPON_CHEST_COUNT)) return -1
  for (let i = 0; i < capacity; i++) if (isEmptyWeaponForCycleTransfer(bytes, WEAPON_CHEST_OFFSET + i * WEAPON_RECORD_BYTES)) return i
  return -1
}

/** 🟢 武器袋 → 武器箪笥。空けた袋の枠は全部 0、刃・X・鍔・柄が FFFF */
function moveBagWeapons(bytes: Uint8Array, report: NewCycleReport): void {
  for (let i = WEAPON_BAG_COUNT - 1; i >= 0; i--) {
    const at = weaponBagOffset(i)
    // 🟢 袋から移せるかは刃だけで判定する。箪笥の空き判定（4語）とは別。
    if (readI16(bytes, at + WEAPON_PARTS) < 0) continue
    const slot = weaponChestFreeSlot(bytes)
    if (slot < 0) {
      report.weaponsLeft++
      continue
    }
    bytes.copyWithin(WEAPON_CHEST_OFFSET + slot * WEAPON_RECORD_BYTES, at, at + WEAPON_RECORD_BYTES)
    writeU16(bytes, WEAPON_CHEST_COUNT, (readU16(bytes, WEAPON_CHEST_COUNT) + 1) & 0xffff)
    bytes.fill(0, at, at + WEAPON_RECORD_BYTES)
    bytes.fill(0xff, at + WEAPON_PARTS, at + WEAPON_PARTS + 8)
    report.weaponsMoved++
  }
}

/**
 * 🟢 道具を1つの枠ぶん箪笥に入れる。返り値は入りきらなかった個数（0 なら全部入った）、-1 は入れる枠がない。
 * 同じ品で 99 個未満の最初の枠を優先し、99 を超えた分は空き枠へ入れ直す。どちらもなければ最初の空き枠に枠ごと写す
 */
function putItemInChest(bytes: Uint8Array, record: Uint8Array): number {
  const id = record[0] | (record[1] << 8)
  let same = -1
  let empty = -1
  for (let i = 0; i < ITEM_CHEST.slots && (same < 0 || empty < 0); i++) {
    const at = ITEM_CHEST.offset + i * ITEM_SLOT
    const slotId = readU16(bytes, at)
    if (slotId === 0xffff) {
      if (empty < 0) empty = i
    } else if (same < 0 && slotId === id && readU16(bytes, at + 2) < ITEM_CHEST_STACK) {
      same = i
    }
  }
  if (same >= 0) {
    const at = ITEM_CHEST.offset + same * ITEM_SLOT
    const total = readU16(bytes, at + 2) + (record[2] | (record[3] << 8))
    const over = Math.max(0, total - ITEM_CHEST_STACK)
    writeU16(bytes, at + 2, total - over)
    if (over <= 0) return 0
    if (empty < 0) return over
    const rest = record.slice()
    rest[2] = over & 0xff
    rest[3] = over >> 8
    return putItemInChest(bytes, rest)
  }
  if (empty < 0) return -1
  bytes.set(record, ITEM_CHEST.offset + empty * ITEM_SLOT)
  return 0
}

/** 🟢 手持ちの道具 → 箪笥。全部入った枠は空き（FFFF、残りは 0）、入りきらなかった分は個数を減らして残す */
function moveHandItems(bytes: Uint8Array, report: NewCycleReport): void {
  for (let i = ITEM_HAND.slots - 1; i >= 0; i--) {
    const at = ITEM_HAND.offset + i * ITEM_SLOT
    if (readI16(bytes, at) < 0) continue
    const left = putItemInChest(bytes, bytes.slice(at, at + ITEM_SLOT))
    if (left === 0) {
      bytes.fill(0, at, at + ITEM_SLOT)
      writeU16(bytes, at, 0xffff)
      report.itemsMoved++
    } else {
      if (left > 0) writeU16(bytes, at + 2, left)
      report.itemsLeft++
    }
  }
}

/** 🟢 持っている刃・鍔・柄 → 部品の箪笥の最初の空き枠 */
function moveParts(bytes: Uint8Array, report: NewCycleReport): void {
  for (const p of PARTS) {
    for (let i = PARTS_CARRIED_SLOTS - 1; i >= 0; i--) {
      const at = p.carried + i * p.bytes
      const id = readI16(bytes, at)
      if (id < 0) continue
      let slot = -1
      for (let k = 0; k < PARTS_CHEST_SLOTS && slot < 0; k++) if (readU16(bytes, p.chest + k * p.bytes) === 0xffff) slot = k
      if (slot < 0) {
        report.partsLeft++
        continue
      }
      bytes.copyWithin(p.chest + slot * p.bytes, at, at + p.bytes)
      if (id < PARTS_ID_LIMIT) {
        const c = readU8(bytes, PARTS_COUNT + id)
        if (c < 0xff) writeU8(bytes, PARTS_COUNT + id, c + 1)
      }
      bytes.fill(0, at, at + p.bytes)
      writeU16(bytes, at, 0xffff)
      report.partsMoved++
    }
  }
}

/**
 * 🟢 貴重品から、道具の表にある品（kind＝0）を取り除く。鉄4種と表にない品は残す。
 * 🔶 残した品を前に詰め、空けた枠は FF FF 00 00 00 00 00 00 にする（並びは実セーブ1件と合う）
 */
function removeValuables(bytes: Uint8Array, report: NewCycleReport): void {
  const kept: Uint8Array[] = []
  for (let i = 0; i < VALUABLES.slots; i++) {
    const at = VALUABLES.offset + i * ITEM_SLOT
    const id = readU16(bytes, at)
    if (id === 0xffff) continue
    const removable = findItem(id)?.kind === 0 && !NEW_CYCLE_KEEP_VALUABLES.includes(id)
    if (removable) report.valuablesRemoved++
    else kept.push(bytes.slice(at, at + ITEM_SLOT))
  }
  if (report.valuablesRemoved === 0) return
  for (let i = 0; i < VALUABLES.slots; i++) {
    const at = VALUABLES.offset + i * ITEM_SLOT
    if (i < kept.length) bytes.set(kept[i], at)
    else {
      bytes.fill(0, at, at + ITEM_SLOT)
      writeU16(bytes, at, 0xffff)
    }
  }
}

/**
 * 🟢 どの終わり方でも行う初期化
 *
 * | 位置 | 値 |
 * | 0x0000 難易度 | 1（普通）✅ [U] |
 * | 0x0008 所持金 | 0 |
 * | 0x0010 段階（u16）・0x0012 保留量・0x0014 時間帯 | 0 |
 * | 0x0013 現在地 | 0x27 |
 * | 0x0018（u32）踏み倒した店 | 0 |
 * | 0x001C〜0x00DB 予約 | FF |
 * | 0x015C〜0x0B33 町の人のレコード（死亡のビット） | 0 |
 * | 0x0B44・0x0B48（u32）侍度の分子・分母、0x0B4C〜0x0B8B 行動の回数 | 0 |
 * | 0x0B90・0x0B98・0x0BC8・0x0BD0（u32）、0x0BBA（u8）、0x0BC0（f32）、0x0BD8（u16） | 0 |
 * | 0x0BDC〜0x0C1F 人物ごとの痛手、技ごとの斬殺数（周回中）0x0C64〜0x1C03、道具の使用回数（周回中）0x2BA4〜0x2FA3 | 0 |
 * | 0x35A4・0x35A8・0x35AC・0x35B0・0x35B8（f32） | 1000.0。0x35B4 は 0.0 |
 * | 貴重品 0x5B90〜 | removeValuables |
 * | イベントの状態 A 0x36A8〜0x374D | FF 以外を 00 |
 * | シナリオのフラグ 0x374E〜0x3837 | 0（NEW_CYCLE_KEEP_FLAGS は残す） |
 * | 0x3900 ヒント（u16）・0x6324（u16） | FFFF |
 * | 夜這いの記録 0x137F0〜（16 B × 100） | FF×8・00×4・FF FF 00 00 |
 * | 0x13E30・0x13E34（u32） | 0 |
 * | 夜の約束の枠 0x14038〜0x1405F | FF。0x14060（u16）・0x14062 は 0 |
 * | 0x14064 道場破りが来ている（🟢。道場の弟子・評判は残す） | 0 |
 * | 0x45F40〜0x45F4D、0x45F4E〜0x4626D | 0 |
 */
function resetCycle(bytes: Uint8Array, report: NewCycleReport): void {
  for (const key of ['hpCurrent', 'hpMax', 'vitalityCurrent', 'vitalityMax', 'tsumaMax'] as const) writeF32(bytes, HERO_OFFSETS[key], 1000)
  writeF32(bytes, HERO_OFFSETS.tsumaCurrent, 0)
  removeValuables(bytes, report)
  writeU32(bytes, MONEY, 0)

  for (let n = 0; n < EVENT_COUNT; n++) {
    if (readU8(bytes, EVENT_STATE_OFFSET + n) !== 0xff) writeU8(bytes, EVENT_STATE_OFFSET + n, 0x00)
  }
  const keep = new Set(NEW_CYCLE_KEEP_FLAGS)
  for (let p = SCENARIO_FLAGS.start; p <= SCENARIO_FLAGS.end; p++) if (!keep.has(p)) writeU8(bytes, p, 0)

  writeU8(bytes, DIFFICULTY, DIFFICULTY_AFTER)
  writeU16(bytes, DATE_OFFSETS.dayTime, 0)
  writeU8(bytes, DATE_OFFSETS.pending, 0)
  writeU8(bytes, HERO_OFFSETS.location, NEW_CYCLE_LOCATION)
  writeU8(bytes, DATE_OFFSETS.slot, 0)
  writeU16(bytes, HINT_OFFSET, HINT_NONE)
  writeU16(bytes, 0x6324, 0xffff)
  writeU32(bytes, 0x0018, 0)
  writeU8(bytes, RAID_OFFSET, 0)

  for (let i = 0; i < RECORD_CAPACITY; i++) {
    bytes.set(RECORD_EMPTY_BYTES, RECORDS_OFFSET + i * RECORD_SIZE)
  }
  writeU32(bytes, STAGE_OFFSET, 0)
  writeU32(bytes, LOVE_COUNT_OFFSET, 0)
  bytes.fill(0xff, PROMISE_OFFSET, PROMISE_CODEC.offset(PROMISE_OFFSET, 'day'))
  PROMISE_CODEC.writeField(bytes, PROMISE_OFFSET, 'day', 0)
  PROMISE_CODEC.writeField(bytes, PROMISE_OFFSET, 'helpSeen', 0)

  bytes.fill(0, PERSON_RECORDS_START, PERSON_RECORDS_START + PERSON_RECORD_SIZE * PERSON_COUNT)
  bytes.fill(0, 0x45f40, 0x4626e)
  bytes.fill(0, statField('degreeNumerator').offset, ACTION_COUNTS_OFFSET + ACTION_COUNT_SLOTS * 4)
  bytes.fill(0, DAMAGE_CYCLE_OFFSET, DAMAGE_CYCLE_OFFSET + DAMAGE_KINDS.length * 4)
  writeF32(bytes, statField('distanceCycle').offset, 0)
  writeU32(bytes, statField('playTimeCycle').offset, 0)
  writeU32(bytes, statField('deathStage').offset, 0)
  writeU8(bytes, 0x0bba, 0)
  writeU32(bytes, statField('killsCycle').offset, 0)
  writeU32(bytes, statField('comboCycle').offset, 0)
  writeU16(bytes, DATE_OFFSETS.dayIndex, 0)
  for (const table of Object.values(SCORE_TABLES)) bytes.fill(0, table.cycleStart, table.cycleStart + table.count * 4)
  bytes.fill(0xff, 0x001c, 0x00dc)
}

/** 物語を終えたときの処理（冒頭のコメント）を行い、新しい周回の開始前の状態にする */
export function startNewCycle(bytes: Uint8Array, end: CycleEnd = 'clear'): NewCycleReport {
  assertLayout(bytes)
  const report: NewCycleReport = {
    end,
    weaponsMoved: 0,
    weaponsLeft: 0,
    itemsMoved: 0,
    itemsLeft: 0,
    partsMoved: 0,
    partsLeft: 0,
    valuablesRemoved: 0,
    vaultAdded: 0,
  }

  if (end === 'clear') {
    const difficulty = readU8(bytes, DIFFICULTY)
    if (difficulty < 4) {
      const at = CLEAR_COUNTS + difficulty * 2
      const n = readU16(bytes, at)
      if (n < CLEAR_COUNT_MAX) writeU16(bytes, at, n + 1)
    }
  }
  updateEventRecords(bytes)
  ageDistribution(bytes)
  for (const n of NEW_CYCLE_CLEARED_OCCUPATION_FLAGS) writeU8(bytes, OCCUPATION_FLAGS + n, 0)
  moveBagWeapons(bytes, report)

  const money = readU32(bytes, MONEY) | 0
  const vault = readU32(bytes, VAULT) | 0
  const total = Math.min(VAULT_MAX, Math.max(0, vault + money))
  writeU32(bytes, VAULT, total)
  report.vaultAdded = total - vault

  moveHandItems(bytes, report)
  moveParts(bytes, report)
  if (end === 'gone') {
    const n = readU32(bytes, GONE_COUNT)
    if (n < GONE_COUNT_MAX) writeU32(bytes, GONE_COUNT, n + 1)
  }

  resetCycle(bytes, report)
  return report
}
