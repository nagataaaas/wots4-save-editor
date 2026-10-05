// 武器レコード（0xA0 B 固定長）。帯刀・武器袋・武器箪笥で共通の構造。
// 出典：解析ノート §5（[TS][I-2][I-3]）、§5.3 魅力・§5.4 銘（[U][TS][I-3]）、§5.5 パーツ（U-3：[TS] の値は案A、[CT] の ID は案C）、§3.4（[U] 2026-10-05 の差分）。
//
// 書き込みは各フィールドのバイトだけを上書きする。次の領域は書き換えない：
//   - +0x00〜+0x05：❓ 用途不明。武器袋[0] ではここが帯刀の状態（峰打など）と重なる（§3.4）
//   - +0x10〜+0x15、+0x1F〜+0x23、+0x70〜+0x8D、+0x94、+0x99〜+0x9B：❓ 用途不明
//   - 耐久回復の累積（+0x8E ✅）：編集機能は持たない
// 0x1A78C 付近などにある帯刀武器のコピー（🔶 §3.4）は書き換えない（[TS] も 0xA4C2 側だけを書き換えて動く。I-3）。
import { readU16, readU32, readU8, readUtf16Fixed, writeU16, writeU8, writeUtf16Fixed } from './binary'
import { BLADES, GRIPS, GUARDS, SHEATHS, SPECIAL_BLADES, WEAPON_IDS, type PartOption } from './weapon-ids'
import { formatHex4 } from '@/lib/format'

export const WEAPON_RECORD_BYTES = 0xa0

/** レコード内の位置（§5.2） */
export const WEAPON_FIELDS = {
  weaponId: 0x06, // u16 ✅ 完成武器ID。0xFFFF は自作
  blade: 0x08, // 3 B ✅（[TS] の値）
  guard: 0x0b, // 3 B ✅（[TS] の値）
  /** u16 ✅ 鞘の ID（§5.5 の X。[U] 2026-10-05 鞘だけを書き換えてゲーム内で反映を確認）。下位バイトは刃の 3 B、上位バイトは鍔の 3 B にも含まれる */
  sheath: 0x0a,
  grip: 0x0e, // 2 B ✅
  attack: 0x16, // u16 ✅
  durabilityMax: 0x18, // u16 ✅ 最大耐久
  quality: 0x1a, // u16 ✅
  /**
   * u8 武器種（U-8 解決、[U] 2026-10-05）。sample/S4-DATA_02 copy 2 の帯刀に刀・槍・拳銃を置くと 0・1・3。
   * 全サンプルの武器で、槍（藤奈美・立奈美）は 1、ほかの刀は 0。+0x1F は常に 0（書き換えない）
   */
  weaponType: 0x1e,
  qualityMax: 0x1c, // u16 ✅
  charms: 0x24, // 4 B × 3組 ✅
  name: 0x30, // UTF-16LE 64 B ✅位置 ／ ✅最大17文字（U-5）
  /** u32 🔶 手に持っていた時間（秒。メニュー画面は数えない）。+0x8A と常に同じ値（§3.4、[U] 2026-10-05）。表示だけ */
  heldTime: 0x86,
  durability: 0x92, // u16 ✅ 現在の耐久
  title: 0x96, // 3 B ✅
  kills: 0x9c, // u16 ✅ 斬殺数
  tsumaKills: 0x9e, // u16 ✅ つま斬り数
} as const

export type PartKind = 'blade' | 'guard' | 'grip'

const PART_LISTS: Record<PartKind, readonly PartOption[]> = { blade: BLADES, guard: GUARDS, grip: GRIPS }
const PART_NOUNS: Record<PartKind, string> = { blade: '刃', guard: '鍔', grip: '柄' }

export const WEAPON_NAME_BYTES = 64
/** ✅ 17文字まで（U-5 案A で確定、[U] 2026-10-05。[TS] 作者の注記「ゲーム内では17文字まで」） */
export const WEAPON_NAME_MAX_CHARS = 17

export type NumberKey = 'attack' | 'durabilityMax' | 'durability' | 'quality' | 'qualityMax' | 'kills' | 'tsumaKills'

/**
 * 入力を受け付ける正規の上限（§5.7。AGENTS.md：正規範囲を超える値は通常モードでは拒否する）。
 * 斬殺数・つま斬り数は型の上限が不明で、4万を超えると表示が崩れるという報告がある（🔶 §5.7）ので 40,000 までにする。
 */
export const WEAPON_LIMITS: Record<NumberKey, number> = {
  attack: 500,
  durabilityMax: 2000,
  durability: 2000,
  quality: 21,
  qualityMax: 21,
  kills: 40_000,
  tsumaKills: 40_000,
}

export const NUMBER_KEYS: readonly NumberKey[] = ['attack', 'durabilityMax', 'durability', 'quality', 'qualityMax', 'kills', 'tsumaKills']

// ---- 武器種（U-8） ----

/** 値は [W-PC]。5種ともゲーム内で確認した（[U] 2026-10-05） */
export const WEAPON_TYPES: readonly { id: number; label: string }[] = [
  { id: 0, label: '刀' },
  { id: 1, label: '槍' },
  { id: 2, label: '爪' },
  { id: 3, label: '拳銃' },
  { id: 4, label: 'ライフル' },
]

/**
 * 上級者モード（ユーザー判断 2026-10-05）。鞘（X）と武器種を書けるようにする。
 * 鞘：表にある鞘だけを書き換えると反映された（[U] 2026-10-05）。表にない X（規則を延ばした見栄春の 0xD9）では、ロード時にエラーが出て鞘が表示されなかった（ゲーム内で分解・再組み立てすると直った）。
 * 武器種：パーツと合わない武器種にしたときの動作は未確認（要ゲーム内確認）。
 */
export type AdvancedOptions = { advanced?: boolean }

// ---- 魅力（§5.3 ✅） ----

export const CHARM_SLOTS = 3
/** 個数の合計の上限（4以上で箪笥を開けなくなった報告あり。§5.3） */
export const CHARM_TOTAL_MAX = 3
export const NO_CHARM = 0xffff

export const CHARMS: readonly { id: number; label: string }[] = [
  { id: 0, label: '天運' },
  { id: 1, label: '暗刃' },
  { id: 2, label: '明刃' },
  { id: 3, label: '銭呼' },
  { id: 4, label: '活復' },
  { id: 5, label: '疾風' },
  { id: 6, label: '背水' },
  { id: 7, label: '投抜' },
  { id: 8, label: '頑健' },
  { id: 9, label: '重撃' },
]

// ---- 銘（§5.4 ✅） ----

/** 銘の番号 → 名前。バイト列は `<0x6A + 番号> 01 <番号>` */
export const TITLES: readonly { no: number; label: string }[] = [
  { no: 0x00, label: '人斬り' },
  { no: 0x01, label: '狂事' },
  { no: 0x02, label: '血河' },
  { no: 0x03, label: '黄泉路' },
  { no: 0x04, label: '猟奇守' },
  { no: 0x05, label: '石頭' },
  { no: 0x06, label: '鉄壁' },
  { no: 0x07, label: '白金造' },
  { no: 0x08, label: '金剛造' },
  { no: 0x09, label: '不壊' },
  { no: 0x0a, label: '一輝' },
  { no: 0x0b, label: '二条' },
  { no: 0x0c, label: '三晃' },
  { no: 0x0d, label: '四海' },
  { no: 0x0e, label: '悟道' },
  { no: 0x0f, label: '剃刀' },
  { no: 0x10, label: '鋭刃' },
  { no: 0x11, label: '冷刃' },
  { no: 0x12, label: '鬼神' },
  { no: 0x13, label: '散華' },
]

export type Field<T> = {
  value: T
  /** 読み取り専用にする理由。null なら編集可能 */
  problem: string | null
  /** 編集はできるが注意が必要な理由 */
  warning?: string | null
}

export type PartView = {
  /** 読んだ値（刃・鍔は 3 B、柄は 2 B を LE で読んだもの） */
  value: number
  /** ID 表にあれば名前 */
  label: string | null
  /** 一致した選択肢の識別子（partKey）。null は表にない値 */
  key: string | null
}

export type WeaponView = {
  /** レコードの先頭位置 */
  offset: number
  /** 空き枠（完成武器ID 0x0000、刃 0xFFFFFF）。編集しない */
  empty: boolean
  /** レコード全体の妥当性検証に落ちた理由。null なら通過 */
  problem: string | null
  name: Field<string>
  weaponId: Field<number> & { label: string | null }
  /** 特殊武器（刃の3バイト目が 0xFF。D-15） */
  special: boolean
  blade: Field<PartView>
  guard: Field<PartView>
  grip: Field<PartView>
  numbers: Record<NumberKey, Field<number>>
  /** 魅力を最大3つまで並べたもの（同じ ID が複数あれば個数分並べる）。空きは null */
  charms: Field<(number | null)[]>
  /** 銘の番号。null は銘なし。label が null なら未知のバイト列 */
  title: Field<number | null> & { label: string | null; raw: number }
  heldTime: number
  /** 鞘（X）。label は同じ鞘を使う刃の名前。表にない X は null */
  sheath: Field<number> & { label: string | null }
  /** 武器種（U-8）。label は WEAPON_TYPES の名前、未知の値は null */
  weaponType: Field<number> & { label: string | null }
}

export function readU24(bytes: Uint8Array, offset: number): number {
  return readU16(bytes, offset) | (bytes[offset + 2] << 16)
}

function writeU24(bytes: Uint8Array, offset: number, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffff) throw new RangeError(`3 B の範囲外です: ${value}`)
  writeU16(bytes, offset, value & 0xffff)
  writeU8(bytes, offset + 2, value >>> 16)
}

/** 選択肢の識別子 */
export const partKey = (p: PartOption) => `${p.source}:${p.value}`

/** 3 B／2 B の値から部品の ID（u16）を取り出す（§5.5：刃は下位 2 B、鍔は上位 2 B） */
function partId(kind: PartKind, raw: number, source: PartOption['source']): number {
  if (kind === 'grip' || source === 'ct') return raw
  return kind === 'blade' ? raw & 0xffff : (raw >>> 8) & 0xffff
}

/**
 * 読んだ値に一致する選択肢を探す。[TS] の値と完全一致するものを優先し、なければ ID（u16）が一致するものを使う。
 * ID だけが一致した [TS] の選択肢は、X（§5.5）が [TS] の値と違うことを xDiffers で示す。
 */
function findPart(kind: PartKind, list: readonly PartOption[], raw: number): { option: PartOption; xDiffers: boolean } | undefined {
  const exact = list.find((p) => p.source === 'ts' && p.value === raw)
  if (exact) return { option: exact, xDiffers: false }
  const id = kind === 'grip' ? raw : partId(kind, raw, 'ts')
  const byId = list.find((p) => partId(kind, p.value, p.source) === id)
  return byId && { option: byId, xDiffers: byId.source === 'ts' && kind !== 'grip' }
}

export function isSpecialBlade(value: number): boolean {
  return value >>> 16 === 0xff && value !== 0xffffff
}

export function weaponIdLabel(id: number): string | null {
  return WEAPON_IDS.find((w) => w.id === id)?.label ?? null
}

export function charmLabel(id: number): string | null {
  return CHARMS.find((c) => c.id === id)?.label ?? null
}

/** 銘の 3 B を番号に変換する。銘なしは null、未知のバイト列は undefined */
export function decodeTitle(raw: number): number | null | undefined {
  if (raw === 0xffffff) return null
  const b0 = raw & 0xff
  const b1 = (raw >>> 8) & 0xff
  const b2 = raw >>> 16
  // ✅ U-2 案A：人斬りもほかの19種と同じ規則（6A 01 00）。[TS] の定義値 00 6A 01 はゲーム内で「……」と表示されたので未知として扱う
  if (b1 === 0x01 && b2 <= 0x13 && b0 === 0x6a + b2) return b2
  return undefined
}

export function encodeTitle(no: number | null): number {
  if (no === null) return 0xffffff
  if (!TITLES.some((t) => t.no === no)) throw new RangeError(`未知の銘です（${no}）`)
  return (0x6a + no) | (0x01 << 8) | (no << 16)
}

function hasControlChar(text: string): boolean {
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) < 0x20) return true
  return false
}

export function validateWeaponName(text: string): string | null {
  if (text.length === 0) return '名前が空です'
  if (text.length > WEAPON_NAME_MAX_CHARS) return `武器名は${WEAPON_NAME_MAX_CHARS}文字までです（${text.length}文字）`
  if (hasControlChar(text)) return '制御文字は使えません'
  return null
}

export function validateWeaponNumber(key: NumberKey, value: number): string | null {
  const max = WEAPON_LIMITS[key]
  if (!Number.isInteger(value)) return '整数を入力してください'
  if (value < 0 || value > max) return `0〜${max.toLocaleString()} の範囲で入力してください`
  return null
}

/** 魅力の並び（最大3つ、空きは null）を検証する */
export function validateCharms(charms: readonly (number | null)[]): string | null {
  if (charms.length > CHARM_SLOTS) return `魅力は${CHARM_SLOTS}つまでです`
  for (const c of charms) if (c !== null && !charmLabel(c)) return `未知の魅力です（${c}）`
  if (charms.filter((c) => c !== null).length > CHARM_TOTAL_MAX) return `魅力の個数の合計は${CHARM_TOTAL_MAX}までです`
  return null
}

/** 魅力の 12 B を読み、個数分に展開する。妥当でなければ problem を返す */
function readCharms(bytes: Uint8Array, base: number): Field<(number | null)[]> {
  const list: number[] = []
  let problem: string | null = null
  for (let i = 0; i < CHARM_SLOTS; i++) {
    const id = readU16(bytes, base + i * 4)
    const count = readU16(bytes, base + i * 4 + 2)
    if (id === NO_CHARM) {
      if (count !== 0) problem = `魅力なしの組に個数（${count}）が入っています`
      continue
    }
    if (!charmLabel(id)) problem = `未知の魅力ID です（${formatHex4(id)}）`
    else if (count === 0 || count > CHARM_TOTAL_MAX) problem = `魅力の個数が範囲外です（${count}）`
    else for (let n = 0; n < count; n++) list.push(id)
  }
  if (!problem && list.length > CHARM_TOTAL_MAX) problem = `魅力の個数の合計が${CHARM_TOTAL_MAX}を超えています（${list.length}）`
  const value: (number | null)[] = [...list.slice(0, CHARM_SLOTS)]
  while (value.length < CHARM_SLOTS) value.push(null)
  return { value, problem }
}


export function readWeapon(bytes: Uint8Array, offset: number, layoutProblem: string | null = null): WeaponView {
  if (offset < 0 || offset + WEAPON_RECORD_BYTES > bytes.byteLength) throw new RangeError('ファイルが小さすぎて武器を読めません')
  const at = (k: keyof typeof WEAPON_FIELDS) => offset + WEAPON_FIELDS[k]

  const weaponId = readU16(bytes, at('weaponId'))
  const bladeValue = readU24(bytes, at('blade'))
  const empty = weaponId === 0 && bladeValue === 0xffffff
  const special = isSpecialBlade(bladeValue)

  const nameRaw = readUtf16Fixed(bytes, at('name'), WEAPON_NAME_BYTES)
  // レコード全体の妥当性（位置がずれていないか）。名前の終端と魅力で判定する
  const nameProblem = !nameRaw.terminated
    ? '武器名の終端（0x0000）が見つかりません'
    : !nameRaw.paddingClean
      ? '武器名の終端以降が 0 で埋まっていません'
      : hasControlChar(nameRaw.text)
        ? '武器名に制御文字があります'
        : null
  const charms = readCharms(bytes, at('charms'))
  const recordProblem = layoutProblem ?? (empty ? '空き枠です' : nameProblem ?? (charms.problem ? `魅力：${charms.problem}` : null))
  const f = <T>(value: T, problem: string | null = null, warning: string | null = null): Field<T> => ({
    value,
    problem: recordProblem ?? problem,
    warning,
  })

  const numbers = {} as Record<NumberKey, Field<number>>
  for (const key of NUMBER_KEYS) {
    const v = readU16(bytes, at(key))
    const max = WEAPON_LIMITS[key]
    numbers[key] = f(v, null, v > max ? `現在の値（${v.toLocaleString()}）は正規の上限（${max.toLocaleString()}）を超えています` : null)
  }
  if (!numbers.durability.warning && numbers.durability.value > numbers.durabilityMax.value) {
    numbers.durability.warning = '最大耐久より大きい値です'
  }
  if (!numbers.quality.warning && numbers.quality.value > numbers.qualityMax.value) {
    numbers.quality.warning = '質の最大値より大きい値です'
  }

  const titleRaw = readU24(bytes, at('title'))
  const titleNo = decodeTitle(titleRaw)
  const titleLabel = titleNo === null ? 'なし' : titleNo === undefined ? null : (TITLES.find((t) => t.no === titleNo)?.label ?? null)

  const sheathValue = readU16(bytes, at('sheath'))
  const sheathLabel = SHEATHS.find((x) => x.id === sheathValue)?.label ?? null
  const typeValue = readU8(bytes, at('weaponType'))
  const typeLabel = WEAPON_TYPES.find((t) => t.id === typeValue)?.label ?? null

  const nameLength = nameRaw.text.length
  const specialProblem = special ? '特殊武器の鍔・柄は変更できません' : null
  const part = (kind: PartKind, raw: number): Field<PartView> => {
    const hit = findPart(kind, special && kind === 'blade' ? SPECIAL_BLADES : PART_LISTS[kind], raw)
    const view = { value: raw, label: hit?.option.label ?? null, key: hit ? partKey(hit.option) : null }
    const noun = PART_NOUNS[kind]
    const warning = !hit
      ? special && kind !== 'blade'
        ? null
        : `ID 表にない${noun}です（U-10）。既知の${noun}への変更だけができます`
      : hit.option.label.includes('？')
        ? `ゲーム内での名前が未確認の ID です（U-13）。ゲーム内の表示を教えてください`
        : hit.xDiffers && kind === 'blade'
          ? `鞘（X）がこの刃の標準の鞘と違います（${raw.toString(16).padStart(6, '0')}）。刃を選び直すと標準の鞘に戻ります`
          : hit.option.xExtended
            ? `X は規則を確かめた範囲の外に延ばして計算した値です（U-3）。ゲーム内の名前・外観を確認してください`
            : null
    return f(view, kind === 'blade' ? null : specialProblem, warning)
  }

  return {
    offset,
    empty,
    problem: recordProblem,
    name: f(
      nameRaw.text,
      null,
      nameLength > WEAPON_NAME_MAX_CHARS ? `${WEAPON_NAME_MAX_CHARS}文字を超えています（${nameLength}文字）` : null,
    ),
    weaponId: { ...f(weaponId, null, weaponIdLabel(weaponId) ? null : `未知の完成武器ID です（${formatHex4(weaponId)}）`), label: weaponIdLabel(weaponId) },
    special,
    blade: part('blade', bladeValue),
    guard: part('guard', readU24(bytes, at('guard'))),
    grip: part('grip', readU16(bytes, at('grip'))),
    numbers,
    charms: { ...charms, problem: recordProblem ?? charms.problem },
    title: {
      ...f(titleNo ?? null, null, titleLabel === null ? `未知の銘のバイト列です（${titleRaw.toString(16).padStart(6, '0')}）` : null),
      label: titleLabel,
      raw: titleRaw,
    },
    heldTime: readU32(bytes, at('heldTime')),
    sheath: { ...f(sheathValue, null, sheathLabel ? null : `表にない鞘です（${formatHex4(sheathValue)}）`), label: sheathLabel },
    weaponType: {
      ...f(
        typeValue,
        bytes[at('weaponType') + 1] !== 0 ? `武器種の次のバイト（+0x1F）が 0 ではありません（${bytes[at('weaponType') + 1]}）` : null,
        typeLabel ? null : `未知の武器種です（${typeValue}）`,
      ),
      label: typeLabel,
    },
  }
}

// 書き込み。呼び出し側で妥当性検証を通したレコードに対してだけ使う。
// 不正な値は例外にして、バイト列を変えない。

function assertEditable(bytes: Uint8Array, offset: number): void {
  const view = readWeapon(bytes, offset)
  if (view.problem) throw new RangeError(view.problem)
}

export function writeWeaponName(bytes: Uint8Array, offset: number, text: string): void {
  const problem = validateWeaponName(text)
  if (problem) throw new RangeError(problem)
  assertEditable(bytes, offset)
  writeUtf16Fixed(bytes, offset + WEAPON_FIELDS.name, WEAPON_NAME_BYTES, text)
}

export function writeWeaponNumber(bytes: Uint8Array, offset: number, key: NumberKey, value: number): void {
  const problem = validateWeaponNumber(key, value)
  if (problem) throw new RangeError(problem)
  assertEditable(bytes, offset)
  writeU16(bytes, offset + WEAPON_FIELDS[key], value)
}

/** 完成武器ID（+0x06 の 2 B）だけを書く。名前・パーツは変えない */
export function writeWeaponId(bytes: Uint8Array, offset: number, id: number): void {
  if (!weaponIdLabel(id)) throw new RangeError(`未知の完成武器ID です（${formatHex4(id)}）`)
  assertEditable(bytes, offset)
  writeU16(bytes, offset + WEAPON_FIELDS.weaponId, id)
}

/**
 * 選択肢の一覧。特殊武器の刃は特殊武器の刃の間だけで変えられ、鍔・柄は変えられない（D-15）。
 * 規則で X を計算できない [CT] の刃（x が null）も含む。書けるかは isPartWritable で判定する
 */
export function partOptions(kind: PartKind, special: boolean): readonly PartOption[] {
  if (kind === 'blade') return special ? SPECIAL_BLADES : BLADES
  if (special) return []
  return PART_LISTS[kind]
}

/** [CT] の刃は、🔶 X を規則で計算できるものだけ書ける（U-3 案C） */
export function isPartWritable(kind: PartKind, option: PartOption): boolean {
  return !(kind === 'blade' && option.source === 'ct' && option.x == null)
}

/**
 * パーツを書く。key は partKey の値。
 * - [TS] の値（source 'ts'）：❓ U-3 案A（✅ I-3 の範囲）。刃・鍔は 3 B、柄は 2 B をそのまま書く。
 *   刃・鍔の 3 B には 🔶 X（§5.5）の一部が含まれ、[TS] と同じく一緒に書き換わる
 * - [CT] の ID（source 'ct'、ユーザー判断で確定扱い 2026-10-05）：❓ U-3 案C（ユーザー判断 2026-10-05、要ゲーム内確認）。
 *   刃は ID（+0x08）と 🔶 規則で計算した X（+0x0A〜+0x0B の u16）、鍔は ID（+0x0C）、柄は ID（+0x0E）を書く
 */
export function writeWeaponPart(bytes: Uint8Array, offset: number, kind: PartKind, key: string): void {
  const view = readWeapon(bytes, offset)
  if (view.problem) throw new RangeError(view.problem)
  const option = partOptions(kind, view.special).find((p) => partKey(p) === key)
  if (!option) throw new RangeError(`書き込めないパーツです（${key}）`)
  if (!isPartWritable(kind, option)) throw new RangeError(`${option.label}は X（§5.5）を規則で計算できないため書き込めません（U-3）`)

  if (kind === 'grip') return writeU16(bytes, offset + WEAPON_FIELDS.grip, option.value)
  if (option.source === 'ts') return writeU24(bytes, offset + WEAPON_FIELDS[kind], option.value)
  if (kind === 'guard') return writeU16(bytes, offset + WEAPON_FIELDS.guard + 1, option.value)
  writeU16(bytes, offset + WEAPON_FIELDS.blade, option.value)
  writeU16(bytes, offset + WEAPON_FIELDS.blade + 2, option.x as number)
}

/**
 * 魅力を書く（D-7）。同じ ID は1組にまとめて個数で表し、使う組を前に詰める。空いた組は `FF FF 00 00`。
 * 直前の +0x22（❓ 実例では常に `01 00`）は変えない。
 */
export function writeWeaponCharms(bytes: Uint8Array, offset: number, charms: readonly (number | null)[]): void {
  const problem = validateCharms(charms)
  if (problem) throw new RangeError(problem)
  assertEditable(bytes, offset)
  const groups: { id: number; count: number }[] = []
  for (const c of charms) {
    if (c === null) continue
    const g = groups.find((x) => x.id === c)
    if (g) g.count++
    else groups.push({ id: c, count: 1 })
  }
  const base = offset + WEAPON_FIELDS.charms
  for (let i = 0; i < CHARM_SLOTS; i++) {
    const g = groups[i]
    writeU16(bytes, base + i * 4, g ? g.id : NO_CHARM)
    writeU16(bytes, base + i * 4 + 2, g ? g.count : 0)
  }
}

/** 銘（+0x96 の 3 B）だけを書く。null は銘なし */
export function writeWeaponTitle(bytes: Uint8Array, offset: number, no: number | null): void {
  const raw = encodeTitle(no)
  assertEditable(bytes, offset)
  writeU24(bytes, offset + WEAPON_FIELDS.title, raw)
}

/**
 * ✅ 鞘（X、+0x0A〜+0x0B の u16）を書く。上級者モード専用（AdvancedOptions）。
 * 表にある鞘だけを書ける（表にない X ではロード時にエラーが出て鞘が表示されなかった。[U] 2026-10-05）
 */
export function writeWeaponSheath(bytes: Uint8Array, offset: number, x: number, options: AdvancedOptions = {}): void {
  if (!options.advanced) throw new RangeError('鞘は上級者モードでだけ変更できます')
  if (!SHEATHS.some((s) => s.id === x)) throw new RangeError(`表にない鞘です（${formatHex4(x)}）`)
  assertEditable(bytes, offset)
  writeU16(bytes, offset + WEAPON_FIELDS.sheath, x)
}

/** 武器種（+0x1E の1バイト）を書く。上級者モード専用（AdvancedOptions）。パーツは変えない */
export function writeWeaponType(bytes: Uint8Array, offset: number, type: number, options: AdvancedOptions = {}): void {
  if (!options.advanced) throw new RangeError('武器種は上級者モードでだけ変更できます')
  if (!WEAPON_TYPES.some((t) => t.id === type)) throw new RangeError(`未知の武器種です（${type}）`)
  const view = readWeapon(bytes, offset)
  if (view.weaponType.problem) throw new RangeError(view.weaponType.problem)
  writeU8(bytes, offset + WEAPON_FIELDS.weaponType, type)
}
