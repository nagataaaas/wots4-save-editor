// ✅ [U] 2026-10-07 体型・身長・肌色の書き込み反映、低い・高いがふつうの身長の0.9倍・1.1倍であることを確認。
// 🟢 0x4633C は容姿設定で選んだ身長の選択肢（int32 LE）。
// 固定オフセットを使う。サイズ・境界・身長が有限の数値であることを検証する。
import { recordCodec, type TypedField } from './binary'
import { type ViewStatus, type EditOpts, NORMAL_EDIT_OPTS } from './field'
import { assertWritable, checkLayout } from './layout'
import { tr, type Localized } from '@/lib/i18n'

export type AppearanceCurrentKey = 'skin' | 'body' | 'height' | 'heightChoice'
// ✅ 体型・身長・肌色の位置、🟢 身長の選択肢。差分：04 copy 2〜5。
// rel はセーブ先頭からの位置（base 0 で読み書きする）。肌色・体型は u8、身長は float32 LE（cm）、身長の選択肢は int32 LE（0〜2 なので u32 で扱う）。
const FIELDS = {
  skin: { rel: 0x3aad8, type: 'u8' },
  body: { rel: 0x3aadd, type: 'u8' },
  height: { rel: 0x3aae0, type: 'f32' },
  heightChoice: { rel: 0x4633c, type: 'u32' },
} as const satisfies Record<AppearanceCurrentKey, TypedField>
const CODEC = recordCodec<AppearanceCurrentKey>(FIELDS)

export const APPEARANCE_CURRENT_OFFSETS = {
  skin: FIELDS.skin.rel,
  body: FIELDS.body.rel,
  height: FIELDS.height.rel,
  heightChoice: FIELDS.heightChoice.rel,
} as const

/** ✅ [U] 肌色の値。 */
export const SKIN_COLORS: readonly Localized[] = [
  { ja: 'ふつう', en: 'Default' },
  { ja: '褐色', en: 'Brown' },
  { ja: '色黒', en: 'Dark' },
  { ja: '色白', en: 'Light' },
  { ja: '赤', en: 'Red' },
  { ja: '白', en: 'White' },
  { ja: '緑', en: 'Green' },
  { ja: '青', en: 'Blue' },
]

/** ✅ [U] 体型の値。 */
export const BODY_TYPES: readonly Localized[] = [
  { ja: 'ふつう', en: 'Average' },
  { ja: '細め', en: 'Thin' },
  { ja: '太め', en: 'Meaty' },
]

/**
 * 🟢 容姿設定の「身長」で選んだ選択肢。値の順は身長の倍率 ×1.0・×1.1・×0.9。
 * ゲームは容姿設定を開いたときのカーソル位置にだけ使い、実際の身長は 0x3AAE0 で決まる。
 */
export const HEIGHT_CHOICES: readonly Localized[] = [
  { ja: 'ふつう', en: 'Average' },
  { ja: '高い', en: 'Tall' },
  { ja: '低い', en: 'Short' },
]
/** ✅ 身長の倍率。🟢 身長の選択肢と同じ並び（chunks/appearance）。 */
export const HEIGHT_RATIOS = [1, 1.1, 0.9] as const

/**
 * ✅ [U] 身長は人物（容姿）ごとの基準身長×0.9（低い）・×1.0（ふつう）・×1.1（高い）。
 * 🟢 選べる容姿の基準身長は150〜200なので、ゲーム内でありうるのは135〜220。範囲外は警告だけ出して書き込みは許可する。
 */
export const HEIGHT_NORMAL_RANGE = [135, 220] as const

/** 身長がゲーム内でありうる範囲の外なら警告文を返す。 */
export function heightWarning(value: number): string | null {
  const [min, max] = HEIGHT_NORMAL_RANGE
  return value >= min && value <= max
    ? null
    : tr({
        ja: `ゲーム内で存在しうる値(${min}~${max}cm)の範囲を超えているため、不具合が発生する可能性があります`,
        en: `This is outside the range possible in the game (${min}–${max} cm) and may cause problems`,
      })
}

export const APPEARANCE_CURRENT_NOTES: Record<AppearanceCurrentKey, Localized> = {
  // ✅ [U] 肌色（1 B。0＝ふつう、1＝褐色、2＝色黒、3＝色白、4＝赤、5＝白、6＝緑、7＝青）。1 B の変更による反映をゲーム内で確認済み。選択肢のラベルが値の意味を表すので、補足は不要
  skin: { ja: '', en: '' },
  // ✅ 体型（1 B。0＝ふつう、1＝細め、2＝太め）。1 B の変更による反映をゲーム内で確認済み
  body: { ja: '', en: '' },
  // ✅ float32 LE（4 B）、cm 単位
  height: {
    ja: '単位は cm。低い・高いは、ふつうの身長の0.9倍・1.1倍の値になる。',
    en: 'In cm. Short and Tall are 0.9 and 1.1 times the Average height.',
  },
  // 🟢 int32 LE（4 B）。0＝ふつう、1＝高い、2＝低い
  heightChoice: {
    ja: '容姿設定の「身長」で選んだ選択肢。容姿設定を開いたときのカーソル位置に使われ、実際の身長は「身長（cm）」で決まる。身長を変えたら合わせておく。',
    en: 'The option chosen for Height in the Appearance settings. It only sets the cursor position when the Appearance settings open; the actual height is set by "Height (cm)". Match it when you change the height.',
  },
}

export type AppearanceCurrentField = {
  warnings: string[]
  offset: number
  value: number
  problem: string | null
}
export type AppearanceCurrentView = ViewStatus & Record<AppearanceCurrentKey, AppearanceCurrentField>

export function readAppearanceCurrent(bytes: Uint8Array): AppearanceCurrentView {
  const layoutProblem = checkLayout(bytes)
  if (bytes.length < APPEARANCE_CURRENT_OFFSETS.heightChoice + 4)
    throw new RangeError(tr({ ja: 'ファイルが小さすぎて容姿を読めません', en: 'The file is too small to read the appearance' }))
  const makeField = (key: AppearanceCurrentKey): AppearanceCurrentField => {
    const value = CODEC.readField(bytes, 0, key)
    const problem =
      CODEC.type(key) === 'f32' && !Number.isFinite(value)
        ? tr({ ja: '身長が有限の数値ではありません', en: 'The height is not a finite number' })
        : null
    return {
      warnings: [],
      offset: CODEC.offset(0, key), value,
      problem: layoutProblem ?? problem,
    }
  }
  return {
    problem: layoutProblem,
    warnings: [],
    skin: makeField('skin'),
    body: makeField('body'),
    height: makeField('height'),
    heightChoice: makeField('heightChoice'),
  }
}

/** 通常モードは意味の分かる値だけ。身長は有限の数値なら許可する。上級者モードでは 0〜255 を許可する（身長の選択肢も 0〜255）。 */
export function validateAppearanceCurrent(key: AppearanceCurrentKey, value: number, opts: EditOpts = NORMAL_EDIT_OPTS): string | null {
  if (!Number.isFinite(value)) return tr({ ja: '有限の数値を入力してください', en: 'Enter a finite number' })
  if (key === 'height') {
    // 範囲外は heightWarning で警告するだけ（ユーザー判断 2026-10-07）。
    return null
  }
  if (!Number.isInteger(value) || value < 0 || value > 255)
    return tr({ ja: '0〜255の整数を入力してください', en: 'Enter a whole number from 0 to 255' })
  if (opts.advanced) return null
  const max = (key === 'skin' ? SKIN_COLORS : key === 'body' ? BODY_TYPES : HEIGHT_CHOICES).length - 1
  return value <= max ? null : tr({ ja: `通常モードでは0〜${max}を入力してください`, en: `In normal mode, enter 0 to ${max}` })
}

/** 指定した1項目だけ上書きする。体型・身長・肌色は ✅、身長の選択肢は 🟢。 */
export function writeAppearanceCurrent(bytes: Uint8Array, key: AppearanceCurrentKey, value: number, opts: EditOpts = NORMAL_EDIT_OPTS): void {
  assertWritable(bytes)
  const error = validateAppearanceCurrent(key, value, opts)
  if (error) throw new RangeError(error)
  const field = readAppearanceCurrent(bytes)[key]
  if (field.problem) throw new RangeError(field.problem)
  CODEC.writeField(bytes, 0, key, value)
}
