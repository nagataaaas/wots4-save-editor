// 難易度。出典：docs/save_format/chunks/difficulty（[U] 2026-10-08 の差分とゲーム内での確認）。
//
//   0x0000 u8   難易度。易しい＝0・超難しい＝3 ✅ [U]（難易度だけが違う周回開始前のセーブ2つの差分。差分はこの1バイトだけ）。
//               超難しいの周回を始めて大通りでセーブしても 3 のままで、スロット一覧の表示も「超難しい」だった ✅ [U]
//               書き換えるとゲーム内の難易度に反映される ✅ [U] 2026-10-08
//               🟢 普通＝1・難しい＝2。難しいは特典 0x4331C、超難しいは 0x4331D が解除済みのときだけ選べる
//               🟢 幅は u8。0x0001〜0x0007 は詰め物（見たセーブではすべて 0）。書くのは 0x0000 の1バイトだけ
//
// 新しい周回を始める状態（0x0010＝0）は段階の一つとして scenario-date.ts で扱う。
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from './binary'
import { checkLayout } from './hero'

/** u8 ✅ [U] 難易度の位置 */
export const DIFFICULTY_OFFSET = 0x0

export const DIFFICULTIES: readonly { value: number; label: string }[] = [
  { value: 0, label: '易しい' }, // ✅
  { value: 1, label: '普通' }, // 🟢
  { value: 2, label: '難しい' }, // 🟢
  { value: 3, label: '超難しい' }, // ✅
]

export type DifficultyView = {
  value: number
  /** 難易度の名前。0〜3 以外なら null */
  label: string | null
  /** 0〜3 の外の値や、0x0001〜0x0003 が 0 でないなど、編集はできるが注意が必要な理由 */
  warning: string | null
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null
}

export function readDifficulty(bytes: Uint8Array): DifficultyView {
  if (bytes.byteLength < 4) throw new RangeError('ファイルが小さすぎて難易度を読めません')
  const value = readU8(bytes, DIFFICULTY_OFFSET)
  const known = DIFFICULTIES.find((d) => d.value === value)
  const warnings: string[] = []
  if (!known) warnings.push('難易度が想定外の状態になっています')
  // 🟢 0x0001〜0x0007 は詰め物。0 でなければ書き換えられたファイルとして知らせる
  if (bytes.subarray(1, 8).some((b) => b !== 0)) warnings.push('使われていないはずの領域に値が入っています')
  return {
    value,
    label: known?.label ?? null,
    warning: warnings.length ? warnings.join('。') : null,
    problem: checkLayout(bytes),
  }
}

/** 0x0000 の1バイトだけを書く。0〜3 のみ（✅ 0・3 ／ 🟢 1・2。書き換えの反映は ✅ [U]） */
export function writeDifficulty(bytes: Uint8Array, value: number): void {
  const view = readDifficulty(bytes)
  if (view.problem) throw new RangeError(view.problem)
  if (!DIFFICULTIES.some((d) => d.value === value)) throw new RangeError(`難易度を選び直してください: ${value}`)
  writeU8(bytes, DIFFICULTY_OFFSET, value)
}
