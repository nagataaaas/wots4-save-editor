// ✅ [U] 2026-10-07 体型・身長の書き込み反映、肌色の値の意味、低い・高いがふつうの身長の0.9倍・1.1倍であることを確認。
// 肌色の書き込み反映は 🔶 U-18、関連値は ❓ U-18。
// ❓ U-1：固定オフセットを採用（ユーザー判断 2026-10-07）。サイズ・境界・身長が有限の数値であることを検証する。
import { readF32, readU8, writeF32, writeU8 } from './binary'
import { checkLayout } from './hero'

export type AppearanceCurrentKey = 'skin' | 'body' | 'height' | 'related'
// ✅ 体型・身長・肌色の位置、❓ U-18 関連値。差分：04 copy 2〜5。
export const APPEARANCE_CURRENT_OFFSETS = {
  skin: 0x3aad8,
  body: 0x3aadd,
  height: 0x3aae0,
  related: 0x4633c,
} as const

/** ✅ [U] 肌色の値。 */
export const SKIN_COLORS = ['ふつう', '褐色', '色黒', '色白', '赤', '白', '緑', '青'] as const

/** ✅ [U] 体型の値。 */
export const BODY_TYPES = ['ふつう', '細め', '太め'] as const

/**
 * ✅ [U] 身長は人物（容姿）ごとの基準身長×0.9（低い）・×1.0（ふつう）・×1.1（高い）。
 * 🟢 選べる容姿の基準身長は150〜200なので、ゲーム内でありうるのは135〜220。範囲外は警告だけ出して書き込みは許可する。
 */
export const HEIGHT_NORMAL_RANGE = [135, 220] as const

/** 身長がゲーム内でありうる範囲の外なら警告文を返す。 */
export function heightWarning(value: number): string | null {
  const [min, max] = HEIGHT_NORMAL_RANGE
  return value >= min && value <= max ? null : `ゲーム内で存在しうる値(${min}~${max}cm)の範囲を超えているため、不具合が発生する可能性があります`
}

export const APPEARANCE_CURRENT_NOTES = {
  skin: '✅ [U] 値の意味。0＝ふつう、1＝褐色、2＝色黒、3＝色白、4＝赤、5＝白、6＝緑、7＝青。書き込みの反映は要ゲーム内確認（🔶 U-18）。変更するのは1 Bのみ。',
  body: '✅ 0＝ふつう、1＝細め、2＝太め。1 Bの変更による反映をゲーム内で確認済み。',
  height: '✅ cm 単位の float32 LE（4 B）。低い・高いは、ふつうの身長の0.9倍・1.1倍の値になる。',
  related: '❓ U-18：3件で0・1・2だった関連値。意味と保存幅は未確認。変更するのは1 Bのみ。',
} as const

export type AppearanceCurrentField = {
  offset: number | null
  value: number | null
  raw: string
  problem: string | null
}
export type AppearanceCurrentView = Record<AppearanceCurrentKey, AppearanceCurrentField>

export function readAppearanceCurrent(bytes: Uint8Array): AppearanceCurrentView {
  const layoutProblem = checkLayout(bytes)
  const makeField = (offset: number, width: number): AppearanceCurrentField => {
    if (offset + width > bytes.length) return { offset, value: null, raw: '', problem: layoutProblem ?? 'ファイルが小さすぎて読めません' }
    const value = width === 4 ? readF32(bytes, offset) : readU8(bytes, offset)
    const problem = width === 4 && !Number.isFinite(value) ? '身長が有限の数値ではありません' : null
    return {
      offset, value,
      raw: Array.from(bytes.subarray(offset, offset + width), b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
      problem: layoutProblem ?? problem,
    }
  }
  return {
    skin: makeField(APPEARANCE_CURRENT_OFFSETS.skin, 1),
    body: makeField(APPEARANCE_CURRENT_OFFSETS.body, 1),
    height: makeField(APPEARANCE_CURRENT_OFFSETS.height, 4),
    related: makeField(APPEARANCE_CURRENT_OFFSETS.related, 1),
  }
}

/** 通常モードは意味の分かる値だけ。身長は有限の数値なら許可する。上級者モードでは検証用の値も許可する（🔶❓ U-18）。 */
export function validateAppearanceCurrent(key: AppearanceCurrentKey, value: number, advanced: boolean): string | null {
  if (!Number.isFinite(value)) return '有限の数値を入力してください'
  if (key === 'height') {
    // 範囲外は heightWarning で警告するだけ（ユーザー判断 2026-10-07）。
    return null
  }
  if (!Number.isInteger(value) || value < 0 || value > 255) return '0〜255の整数を入力してください'
  if (advanced) return null
  const max = key === 'skin' ? SKIN_COLORS.length - 1 : key === 'body' ? BODY_TYPES.length - 1 : 2
  return value <= max ? null : `通常モードでは0〜${max}を入力してください`
}

/** 指定した1項目だけ上書きする。体型・身長は ✅、肌色・関連値の反映は 🔶❓ U-18。 */
export function writeAppearanceCurrent(bytes: Uint8Array, key: AppearanceCurrentKey, value: number, advanced = false): void {
  const error = validateAppearanceCurrent(key, value, advanced)
  if (error) throw new RangeError(error)
  const field = readAppearanceCurrent(bytes)[key]
  if (field.problem || field.offset === null) throw new RangeError(field.problem ?? '固定位置を読めません')
  if (key === 'height') writeF32(bytes, field.offset, value)
  else writeU8(bytes, field.offset, value)
}
