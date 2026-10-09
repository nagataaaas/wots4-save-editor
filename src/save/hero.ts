// 主人公の基本情報。出典：docs/save_format/chunks/money・player-name・stats・vitals（[TS][I-1][I-3]）、chunks/date-location と datatable/place/start-location.csv（[W-PC]）。
//
// [TS] の固定オフセットを使い、
// 次の2段階の妥当性検証を通ったフィールドだけを編集可能にする。
//   1. ファイルサイズが [TS] の構造体サイズ 0x48BB0 と一致する
//   2. 各フィールドの値が妥当な範囲にある
import { readF32, readU32, readU8, readUtf16Fixed, writeF32, writeU32, writeU8, writeUtf16Fixed } from './binary'
import { formatHex2 } from '@/lib/format'
import { findLocation } from './locations'

/** [TS] が扱うファイルサイズ（docs/save_format/README.md §2） */
export const TS_SAVE_SIZE = 0x48bb0

export const HERO_OFFSETS = {
  money: 0x08, // u32 ✅
  cashbox: 0x0c, // u32 ✅
  /** u8 ✅ [U]（U-7 解決。0x13 の1バイトを書き換えてゲーム内で反映されることをユーザーが確認、2026-10-04） */
  location: 0x13,
  name: 0xdc, // UTF-16LE 64 B、最大31文字 ✅ [I-1]
  samuraiPoint: 0xb3c, // u32 ✅
  // 0x35A4（❓ [TS] では活力、PS3版の並びでは現在HP）と 0x35AC（❓ 活力の現在値の関連値）は
  // 意味が確定しないため扱わない（ユーザー判断、2026-10-04）。chunks/vitals・U-4 を参照
  /** float32。最大HP ✅ [U]（2026-10-04 ユーザー確認） */
  hp: 0x35a8,
  /** float32。活力の最大値 ✅ [U]（2026-10-04 ユーザー確認） */
  vitalityMax: 0x35b0,
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
 * 侍点はユーザー指定の上限（2026-10-04）。ゲーム内の上限ではなく、これ以上あっても意味がないため。
 */
export const AMOUNT_LIMITS: Record<U32Key, number> = {
  money: 99_999,
  cashbox: 999_999,
  samuraiPoint: 9_999_999,
}

/**
 * 最大HP・活力の最大値の上限。入力の上限と、読み込み時の妥当性の上限を兼ねる。
 * ユーザー指定の暫定値（2026-10-04）。ゲーム内の上限は未確認。
 */
export const GAUGE_MAX = 99_999

export type U32Key = 'money' | 'cashbox' | 'samuraiPoint'
export type F32Key = 'hp' | 'vitalityMax'

export type Field<T> = {
  value: T
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null
  /** 編集はできるが、現在の値に注意が必要な理由（正規範囲外など） */
  warning?: string | null
}

export type HeroView = {
  /** ファイル全体のレイアウト検証に落ちた理由。null なら通過 */
  layoutProblem: string | null
  name: Field<string>
  money: Field<number>
  cashbox: Field<number>
  samuraiPoint: Field<number>
  hp: Field<number>
  vitalityMax: Field<number>
  location: Field<number>
}

export function checkLayout(bytes: Uint8Array): string | null {
  if (bytes.byteLength !== TS_SAVE_SIZE) {
    return `ファイルサイズが想定（${TS_SAVE_SIZE.toLocaleString()} B）と異なります（${bytes.byteLength.toLocaleString()} B）。読み取り専用にしています。`
  }
  return null
}

function hasControlChar(text: string): boolean {
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) < 0x20) return true
  return false
}

export function validateName(text: string): string | null {
  if (text.length === 0) return '名前が空です'
  if (text.length > NAME_MAX_CHARS) return `名前は${NAME_MAX_CHARS}文字までです（${text.length}文字）`
  if (hasControlChar(text)) return '制御文字は使えません'
  return null
}

/** 入力値の検証（正規の上限まで） */
export function validateAmount(key: U32Key, value: number): string | null {
  const max = AMOUNT_LIMITS[key]
  if (!Number.isInteger(value)) return '整数を入力してください'
  if (value < 0 || value > max) return `0〜${max.toLocaleString()} の範囲で入力してください`
  return null
}

export function validateGauge(value: number): string | null {
  if (!Number.isFinite(value)) return '数値を入力してください'
  if (value < 0 || value > GAUGE_MAX) return `0〜${GAUGE_MAX.toLocaleString()} の範囲で入力してください`
  return null
}

export function validateLocation(value: number): string | null {
  const loc = findLocation(value)
  if (!loc) return `未調査の値です（${formatHex2(value)}）`
  if (loc.crash) return 'クラッシュが報告されている値です'
  return null
}

function field<T>(layoutProblem: string | null, value: T, problem: string | null): Field<T> {
  return { value, problem: layoutProblem ?? problem }
}

export function readHero(bytes: Uint8Array): HeroView {
  const layoutProblem = checkLayout(bytes)
  // サイズが違うファイルでも、範囲内なら値は表示する（読み取り専用）
  const canRead = bytes.byteLength >= HERO_OFFSETS.vitalityMax + 4
  if (!canRead) throw new RangeError('ファイルが小さすぎて主人公の情報を読めません')

  const name = readUtf16Fixed(bytes, HERO_OFFSETS.name, NAME_BYTES)
  const nameProblem = !name.terminated
    ? '終端（0x0000）が見つかりません'
    : !name.paddingClean
      ? '終端以降が 0 で埋まっていません'
      : validateName(name.text)

  const u32 = (key: U32Key) => {
    const v = readU32(bytes, HERO_OFFSETS[key])
    const implausible = v > AMOUNT_PLAUSIBLE_MAX ? `値が大きすぎます（${v.toLocaleString()}）。位置がずれている可能性があります` : null
    const outOfRange =
      v > AMOUNT_LIMITS[key] ? `現在の値（${v.toLocaleString()}）は正規の上限（${AMOUNT_LIMITS[key].toLocaleString()}）を超えています` : null
    return { ...field(layoutProblem, v, implausible), warning: outOfRange }
  }
  const f32 = (key: F32Key) => {
    const v = readF32(bytes, HERO_OFFSETS[key])
    return field(layoutProblem, v, validateGauge(v))
  }
  const location = readU8(bytes, HERO_OFFSETS.location)

  return {
    layoutProblem,
    name: field(layoutProblem, name.text, nameProblem),
    money: u32('money'),
    cashbox: u32('cashbox'),
    samuraiPoint: u32('samuraiPoint'),
    hp: f32('hp'),
    vitalityMax: f32('vitalityMax'),
    location: field(layoutProblem, location, validateLocation(location)),
  }
}

// 書き込み。呼び出し側で妥当性検証を通したフィールドに対してだけ使う。
// 不正な値は例外にして、バイト列を変えない。

export function writeName(bytes: Uint8Array, text: string): void {
  const problem = validateName(text)
  if (problem) throw new RangeError(problem)
  writeUtf16Fixed(bytes, HERO_OFFSETS.name, NAME_BYTES, text)
}

export function writeAmount(bytes: Uint8Array, key: U32Key, value: number): void {
  const problem = validateAmount(key, value)
  if (problem) throw new RangeError(problem)
  writeU32(bytes, HERO_OFFSETS[key], value)
}

/**
 * 最大HP（0x35A8）・活力の最大値（0x35B0 ✅ [U]）の4バイトだけを書く。 */
export function writeGauge(bytes: Uint8Array, key: F32Key, value: number): void {
  const problem = validateGauge(value)
  if (problem) throw new RangeError(problem)
  writeF32(bytes, HERO_OFFSETS[key], value)
}

/** 0x13 の1バイトだけを書く（✅ U-7 案A） */
export function writeLocation(bytes: Uint8Array, value: number): void {
  const problem = validateLocation(value)
  if (problem) throw new RangeError(problem)
  writeU8(bytes, HERO_OFFSETS.location, value)
}
