// 門・柵などの開閉フラグの候補。出典：解析ノート §3.5（[U] 2026-10-05 のシナリオ差分）。
//
// 0x3750〜0x3800 あたりには 0／1 のバイトが並び、場所の状態を持っていると推定（🔶）。
//   0x377F  🔶 神社入口の柵が上がった（03 copy 2 → copy 3、志士との出会いの最初で 0 → 1）
//   0x37FA  🔶 剣術大会以後の門の候補。大寄せのあと、根無し草（03 copy 9・04 copy 11）では 01、
//   0x37FB     幕府ルート（04 copy 12）では 00。大寄せの前はどのセーブでも 00
// [U] 2026-10-05：ルート分岐を書き換えても、門が閉じたままだとそのルートに進めなかった。友好度を書き換えても門は開かなかった。
// 0x37FA・0x37FB が門なのかは要ゲーム内確認。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from './binary'
import { checkLayout } from './hero'

export type WorldFlag = { offset: number; label: string; note: string }

export const WORLD_FLAGS: readonly WorldFlag[] = [
  { offset: 0x377f, label: '神社入口の柵', note: '志士との出会いの最初で 0 → 1（柵が上がる）' },
  { offset: 0x37fa, label: '門の候補 A（0x37FA）', note: '大寄せのあと、根無し草では 01、幕府ルートでは 00' },
  { offset: 0x37fb, label: '門の候補 B（0x37FB）', note: '大寄せのあと、根無し草では 01、幕府ルートでは 00' },
]

export type WorldFlagsView = {
  values: number[]
  problem: string | null
}

export function readWorldFlags(bytes: Uint8Array): WorldFlagsView {
  if (bytes.byteLength < 0x3800) throw new RangeError('ファイルが小さすぎてフラグを読めません')
  const layoutProblem = checkLayout(bytes)
  const values = WORLD_FLAGS.map((f) => readU8(bytes, f.offset))
  const bad = values.findIndex((v) => v > 1)
  const problem = bad >= 0 ? `${WORLD_FLAGS[bad].label} の値が 0・1 以外です（${values[bad]}）` : null
  return { values, problem: layoutProblem ?? problem }
}

/** index 番目のフラグの1バイトだけを書く。🔶 要ゲーム内確認。通常モードでは 0・1 だけ、上級者モードでは任意の u8 */
export function writeWorldFlag(bytes: Uint8Array, index: number, value: number, opts: { advanced: boolean }): void {
  const view = readWorldFlags(bytes)
  if (view.problem) throw new RangeError(view.problem)
  const flag = WORLD_FLAGS[index]
  if (!flag) throw new RangeError(`フラグの番号が範囲外です: ${index}`)
  if (!Number.isInteger(value) || value < 0 || value > 0xff) throw new RangeError(`u8 の範囲外です: ${value}`)
  if (!opts.advanced && value > 1) throw new RangeError(`0 か 1 を指定してください: ${value}`)
  writeU8(bytes, flag.offset, value)
}
