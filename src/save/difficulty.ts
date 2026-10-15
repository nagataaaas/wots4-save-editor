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
import { tr } from '@/lib/i18n'
import { readU8, writeU8 } from './binary'
import { type ViewStatus } from './field'
import { flagValues } from './flags/byte-flag'
import { assertWritable, checkLayout } from './layout'

/** u8 ✅ [U] 難易度の位置 */
export const DIFFICULTY_OFFSET = 0x0

/** label は読むたびに今の言語で返す */
export const DIFFICULTIES: readonly { value: number; label: string }[] = flagValues([
  { value: 0, label: { ja: '易しい', en: 'Easy' } }, // ✅
  { value: 1, label: { ja: '普通', en: 'Normal' } }, // 🟢
  { value: 2, label: { ja: '難しい', en: 'Hard' } }, // 🟢
  { value: 3, label: { ja: '超難しい', en: 'Harakiri' } }, // ✅
])

/** warnings は、0〜3 の外の値や、0x0001〜0x0007 が 0 でないなど、編集はできるが注意が必要な理由 */
export type DifficultyView = ViewStatus & {
  value: number
  /** 難易度の名前。0〜3 以外なら null */
  label: string | null
}

export function readDifficulty(bytes: Uint8Array): DifficultyView {
  if (bytes.byteLength < 4)
    throw new RangeError(tr({ ja: 'ファイルが小さすぎて難易度を読めません', en: 'The file is too small to read the difficulty' }))
  const value = readU8(bytes, DIFFICULTY_OFFSET)
  const known = DIFFICULTIES.find((d) => d.value === value)
  const warnings: string[] = []
  if (!known)
    warnings.push(tr({ ja: '難易度が想定外の状態になっています', en: 'The difficulty is in an unexpected state' }))
  // 🟢 0x0001〜0x0007 は詰め物。0 でなければ書き換えられたファイルとして知らせる
  if (bytes.subarray(1, 8).some((b) => b !== 0))
    warnings.push(
      tr({ ja: '使われていないはずの領域に値が入っています', en: 'An area that should be unused contains data' }),
    )
  return {
    value,
    label: known?.label ?? null,
    warnings,
    problem: checkLayout(bytes),
  }
}

/** 0x0000 の1バイトだけを書く。0〜3 のみ（✅ 0・3 ／ 🟢 1・2。書き換えの反映は ✅ [U]） */
export function writeDifficulty(bytes: Uint8Array, value: number): void {
  assertWritable(bytes)
  if (!DIFFICULTIES.some((d) => d.value === value)) throw new RangeError(tr({ ja: `難易度を選び直してください: ${value}`, en: `Please choose the difficulty again: ${value}` }))
  writeU8(bytes, DIFFICULTY_OFFSET, value)
}
