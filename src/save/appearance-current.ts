// ✅ [U] 2026-10-07 体型・身長の書き込み反映を確認。肌色は 🔶 U-18、関連値は ❓ U-18。
// ❓ U-1：固定オフセットを採用（ユーザー判断 2026-10-07）。サイズ・境界・身長の範囲を検証する。
import { readF32, readU8, writeF32, writeU8 } from './binary'
import { checkLayout } from './hero'

export type AppearanceCurrentKey = 'skin' | 'body' | 'height' | 'related'
// ✅ 体型・身長、🔶❓ U-18 肌色・関連値。差分：04 copy 2〜5。
export const APPEARANCE_CURRENT_OFFSETS = {
  skin: 0x3aad8,
  body: 0x3aadd,
  height: 0x3aae0,
  related: 0x4633c,
} as const
export const APPEARANCE_CURRENT_NOTES = {
  skin: '🔶 U-18：0＝ふつう、1＝褐色、3＝白。保存幅は未確認。変更するのは1 Bのみ。',
  body: '✅ 0＝ふつう、1＝細め、2＝太め。1 Bの変更による反映をゲーム内で確認済み。',
  height: '✅ float32 LE の4 B。144・160・176の変更による反映をゲーム内で確認済み。性別変更後のセーブでは175も観測。',
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
    // 🔶 U-18：100〜250は暫定の検証用範囲。
    const problem = width === 4 && (!Number.isFinite(value) || value < 100 || value > 250)
      ? '身長が検証用範囲100〜250の有限値ではありません（U-18）' : null
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

/** 🔶❓ U-18：通常モードは観測した値だけ。上級者モードでは検証用の値も許可する。 */
export function validateAppearanceCurrent(key: AppearanceCurrentKey, value: number, advanced: boolean): string | null {
  if (!Number.isFinite(value)) return '有限の数値を入力してください'
  if (key === 'height') {
    if (advanced) return value >= 100 && value <= 250 ? null : '検証用の身長は100〜250で入力してください'
    return [144, 160, 175, 176].includes(value) ? null : '通常モードでは144・160・175・176を入力してください'
  }
  if (!Number.isInteger(value) || value < 0 || value > 255) return '0〜255の整数を入力してください'
  if (advanced) return null
  const observed = key === 'skin' ? [0, 1, 3] : [0, 1, 2]
  return observed.includes(value) ? null : `通常モードでは${observed.join('・')}を入力してください`
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
