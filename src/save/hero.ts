// 主人公の基本情報。出典：docs/save_format/chunks/money・player-name・stats・vitals（[TS][I-1][I-3]）、chunks/date-location と datatable/place/start-location.csv（[W-PC]）。
//
// [TS] の固定オフセットを使い、
// 次の2段階の妥当性検証を通ったフィールドだけを編集可能にする。
//   1. ファイルサイズが [TS] の構造体サイズ 0x48BB0 と一致する
//   2. 各フィールドの値が妥当な範囲にある
import { readF32, readU32, readU8, readUtf16Fixed, writeF32, writeU32, writeU8, writeUtf16Fixed } from './binary'
import { warningsOf, type EditOpts, NORMAL_EDIT_OPTS, type Field, type ViewStatus, fixedStringProblem, validateText } from './field'
import { assertWritable, checkLayout } from './layout'
import { findLocation } from './locations'
import { tr } from '@/lib/i18n'

export const HERO_OFFSETS = {
  money: 0x08, // u32 ✅
  cashbox: 0x0c, // u32 ✅
  /** u8 ✅ [U]（U-7 解決。0x13 の1バイトを書き換えてゲーム内で反映されることをユーザーが確認、2026-10-04） */
  location: 0x13,
  name: 0xdc, // UTF-16LE 64 B、最大31文字 ✅ [I-1]
  samuraiPoint: 0xb3c, // u32 ✅
  /** float32。現在HP 🟢（U-4 案A。0 以下のときはゲームが 1.0 で保存する）。ゲーム内の反映は要確認 */
  hpCurrent: 0x35a4,
  /** float32。最大HP ✅ [U]（2026-10-04 ユーザー確認） */
  hpMax: 0x35a8,
  /** float32。活力の現在値 ✅ [U]（時間とともに減る。chunks/vitals） */
  vitalityCurrent: 0x35ac,
  /** float32。活力の最大値 ✅ [U]（2026-10-04 ユーザー確認） */
  vitalityMax: 0x35b0,
  /** float32。つま斬りゲージの現在値 🟢。ゲーム内の反映は要確認 */
  tsumaCurrent: 0x35b4,
  /** float32。つま斬りゲージの最大値 🟢。ゲーム内の反映は要確認 */
  tsumaMax: 0x35b8,
} as const

export const NAME_BYTES = 64
export const NAME_MAX_CHARS = 31

/**
 * 金額・侍点の読み込み時の妥当性の上限。🔶 推測。
 * レイアウトがずれて無関係なバイトを読んだことを検出するための目安で、これを超えたら読み取り専用にする。
 */
export const AMOUNT_PLAUSIBLE_MAX = 99_999_999

/**
 * 入力を受け付ける正規の上限（AGENTS.md：正規範囲を超える値は通常モードでは拒否する）。
 * 所持金・金庫はゲーム内の上限 [U]（ユーザー確認、2026-10-04）。
 * 侍点は、ゲームが評価の結果画面で足すときの上限 🟢（chunks/stats）。
 */
export const AMOUNT_LIMITS: Record<U32Key, number> = {
  money: 99_999,
  cashbox: 999_999,
  samuraiPoint: 999_999,
}

/**
 * HP・活力・つま斬りゲージ（現在値・最大値とも）の上限。入力の上限と、読み込み時の妥当性の上限を兼ねる。
 * ユーザー指定の暫定値（2026-10-04）。ゲーム内の上限は未確認。
 */
export const GAUGE_MAX = 99_999

export type U32Key = 'money' | 'cashbox' | 'samuraiPoint'
export type GaugeKind = 'hp' | 'vitality' | 'tsuma'
export type MaxKey = 'hpMax' | 'vitalityMax' | 'tsumaMax'
export type CurrentKey = 'hpCurrent' | 'vitalityCurrent' | 'tsumaCurrent'
export type F32Key = MaxKey | CurrentKey

/** ゲージごとの現在値・最大値の組 */
export const GAUGES: Record<GaugeKind, { current: CurrentKey; max: MaxKey }> = {
  hp: { current: 'hpCurrent', max: 'hpMax' },
  vitality: { current: 'vitalityCurrent', max: 'vitalityMax' },
  tsuma: { current: 'tsumaCurrent', max: 'tsumaMax' },
}

/** 現在値の欄から、同じゲージの最大値の欄を引く（GAUGES から作る） */
const MAX_OF = Object.fromEntries(
  Object.values(GAUGES).map(({ current, max }) => [current, max]),
) as Record<CurrentKey, MaxKey>

function isCurrentKey(key: F32Key): key is CurrentKey {
  return key in MAX_OF
}

/** problem は、ファイル全体のレイアウト検証に落ちた理由。項目ごとの理由は各 Field にある */
export type HeroView = ViewStatus & {
  name: Field<string>
  money: Field<number>
  cashbox: Field<number>
  samuraiPoint: Field<number>
  hpCurrent: Field<number>
  hpMax: Field<number>
  vitalityCurrent: Field<number>
  vitalityMax: Field<number>
  tsumaCurrent: Field<number>
  tsumaMax: Field<number>
  location: Field<number>
}

export function validateName(text: string): string | null {
  return validateText(text, NAME_MAX_CHARS)
}

/** 入力値の検証（正規の上限まで） */
export function validateAmount(key: U32Key, value: number): string | null {
  const max = AMOUNT_LIMITS[key]
  if (!Number.isInteger(value)) return tr({ ja: '整数を入力してください', en: 'Enter a whole number' })
  if (value < 0 || value > max)
    return tr({ ja: `0〜${max.toLocaleString()} の範囲で入力してください`, en: `Enter a value from 0 to ${max.toLocaleString()}` })
  return null
}

export function validateGauge(value: number): string | null {
  if (!Number.isFinite(value)) return tr({ ja: '数値を入力してください', en: 'Enter a number' })
  if (value < 0 || value > GAUGE_MAX)
    return tr({ ja: `0〜${GAUGE_MAX.toLocaleString()} の範囲で入力してください`, en: `Enter a value from 0 to ${GAUGE_MAX.toLocaleString()}` })
  return null
}

/**
 * 現在値の検証。最大値を超える値は正規範囲外として、上級者モードのときだけ受け付ける。
 * 🟢 ゲームはロード時に現在値を最大値で頭打ちにする（chunks/vitals「編集時の注意」）。
 */
export function validateCurrent(value: number, max: number, opts: EditOpts = NORMAL_EDIT_OPTS): string | null {
  const base = validateGauge(value)
  if (base) return base
  if (!opts.advanced && value > max) {
    const shown = Number(max.toPrecision(7)).toLocaleString()
    return tr({ ja: `最大値（${shown}）以下で入力してください`, en: `Enter a value no greater than the max (${shown})` })
  }
  return null
}

export function validateLocation(value: number): string | null {
  const loc = findLocation(value)
  if (!loc) return tr({ ja: '未調査の場所です', en: 'Unknown location' })
  if (loc.crash) return tr({ ja: 'クラッシュが報告されている値です', en: 'This location has been reported to crash the game' })
  return null
}

function field<T>(layoutProblem: string | null, value: T, problem: string | null): Field<T> {
  return { warnings: [], value, problem: layoutProblem ?? problem }
}

export function readHero(bytes: Uint8Array): HeroView {
  const layoutProblem = checkLayout(bytes)
  // サイズが違うファイルでも、範囲内なら値は表示する（読み取り専用）
  const canRead = bytes.byteLength >= HERO_OFFSETS.tsumaMax + 4
  if (!canRead)
    throw new RangeError(tr({ ja: 'ファイルが小さすぎて主人公の情報を読めません', en: 'The file is too small to read the player character' }))

  const name = readUtf16Fixed(bytes, HERO_OFFSETS.name, NAME_BYTES)
  const nameProblem = fixedStringProblem(name, tr({ ja: '名前', en: 'Name' })) ?? validateName(name.text)

  const u32 = (key: U32Key) => {
    const v = readU32(bytes, HERO_OFFSETS[key])
    const implausible =
      v > AMOUNT_PLAUSIBLE_MAX ? tr({ ja: `値が大きすぎます（${v.toLocaleString()}）`, en: `The value is too large (${v.toLocaleString()})` }) : null
    const limit = AMOUNT_LIMITS[key].toLocaleString()
    const outOfRange =
      v > AMOUNT_LIMITS[key]
        ? tr({
            ja: `現在の値（${v.toLocaleString()}）は正規の上限（${limit}）を超えています`,
            en: `The current value (${v.toLocaleString()}) exceeds the normal limit (${limit})`,
          })
        : null
    return { ...field(layoutProblem, v, implausible), warnings: warningsOf(outOfRange) }
  }
  const f32 = (key: MaxKey) => {
    const v = readF32(bytes, HERO_OFFSETS[key])
    return field(layoutProblem, v, validateGauge(v))
  }
  const current = (key: CurrentKey) => {
    const v = readF32(bytes, HERO_OFFSETS[key])
    const max = readF32(bytes, HERO_OFFSETS[MAX_OF[key]])
    const shownMax = Number(max.toPrecision(7)).toLocaleString()
    const overMax =
      v > max ? tr({ ja: `現在値が最大値（${shownMax}）を超えています`, en: `The current value exceeds the max (${shownMax})` }) : null
    return { ...field(layoutProblem, v, validateGauge(v)), warnings: warningsOf(overMax) }
  }
  const location = readU8(bytes, HERO_OFFSETS.location)

  return {
    warnings: [],
    problem: layoutProblem,
    name: field(layoutProblem, name.text, nameProblem),
    money: u32('money'),
    cashbox: u32('cashbox'),
    samuraiPoint: u32('samuraiPoint'),
    hpCurrent: current('hpCurrent'),
    hpMax: f32('hpMax'),
    vitalityCurrent: current('vitalityCurrent'),
    vitalityMax: f32('vitalityMax'),
    tsumaCurrent: current('tsumaCurrent'),
    tsumaMax: f32('tsumaMax'),
    location: field(layoutProblem, location, validateLocation(location)),
  }
}

// 書き込み。呼び出し側で妥当性検証を通したフィールドに対してだけ使う。
// 不正な値は例外にして、バイト列を変えない。

export function writeName(bytes: Uint8Array, text: string): void {
  assertWritable(bytes)
  const problem = validateName(text)
  if (problem) throw new RangeError(problem)
  writeUtf16Fixed(bytes, HERO_OFFSETS.name, NAME_BYTES, text)
}

export function writeAmount(bytes: Uint8Array, key: U32Key, value: number): void {
  assertWritable(bytes)
  const problem = validateAmount(key, value)
  if (problem) throw new RangeError(problem)
  writeU32(bytes, HERO_OFFSETS[key], value)
}

/**
 * HP・活力・つま斬りゲージの現在値・最大値（0x35A4〜0x35BB の float32）のうち、1つの4バイトだけを書く。
 * 現在値は最大値（セーブ上の値）以下に限る。opts.advanced のときだけ超えてよい。
 */
export function writeGauge(bytes: Uint8Array, key: F32Key, value: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const problem = isCurrentKey(key)
    ? validateCurrent(value, readF32(bytes, HERO_OFFSETS[MAX_OF[key]]), opts)
    : validateGauge(value)
  if (problem) throw new RangeError(problem)
  writeF32(bytes, HERO_OFFSETS[key], value)
}

/** 0x13 の1バイトだけを書く（✅ U-7 案A） */
export function writeLocation(bytes: Uint8Array, value: number): void {
  assertWritable(bytes)
  const problem = validateLocation(value)
  if (problem) throw new RangeError(problem)
  writeU8(bytes, HERO_OFFSETS.location, value)
}
