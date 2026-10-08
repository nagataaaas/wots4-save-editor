// 帯刀（帯刀中の武器3本と、帯刀の状態）。
// 出典：docs/save_format/chunks/weapon-record（帯刀 3件 ✅ [TS][I-2][I-3]）、docs/save_format/chunks/belt-state（帯刀の状態 0xA6A8〜0xA6AF）。
//
// ❓ U-1 判定待ちのため、固定オフセット（案A）を使い、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
//
// 🟢 武器レコードの本当の先頭は [TS] の配置の +0x06。帯刀は 0xA4C8 + n * 0xA0（[TS] の 0xA4C2 + n * 0xA0 の +0x06）。
//
// 帯刀の状態（chunks/belt-state。位置は [U] 2026-10-05 の差分、読み込みでの扱いは 🟢）。0xA6AC 以降は扱わない：
//   0xA6A8 u8  🟢 帯刀している本数（0〜3）。ロード時は帯刀[0]〜[本数−1] だけから武器を作る。ゲームは武器のある枠を前に詰めて保存する。
//              編集しない（ユーザー判断 2026-10-08）。右手・左手の選択肢を絞るのに使う
//   0xA6A9 u8  右手（選んでいる）帯刀武器の番号（0始まり。0xFF＝何も選んでいない [U] 2026-10-05 ユーザー確認）
//   0xA6AA u8  二刀流の左手の帯刀武器の番号（0xFF＝なし）
//   0xA6AB u8  二刀流（0／1）
//   0xA6AC u8  峰打（0／1）。✅ ロード時に読まれない（[U] 2026-10-08 書き換えても反映されないことを確認）
//   0xA6AD u8  🟢 保存したときの構えが無手なら 1。ロード時に読まれない
//   0xA6AE〜0xA6AF  🟢 使われない（0）
// 右手・左手・二刀流の書き込みの反映は要ゲーム内確認。峰打・無手はエディタに出さない（ユーザー判断 2026-10-08）。
import { readU8, writeU8 } from './binary'
import { checkLayout } from './hero'
import { WEAPON_RECORD_BYTES, readWeapon, type WeaponView } from './weapon'

export const BELT_OFFSET = 0xa4c8 // ✅ [TS][I-2][I-3] の 0xA4C2 ＋ 🟢 0x06
export const BELT_COUNT = 3

export const BELT_STATE = {
  count: 0xa6a8, // 🟢
  right: 0xa6a9,
  left: 0xa6aa,
  dual: 0xa6ab,
} as const

/** 左手・右手とも、0xFF は何も持っていない */
export const NO_LEFT = 0xff
export const NO_RIGHT = 0xff

export function beltOffset(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= BELT_COUNT) throw new RangeError(`帯刀の番号が範囲外です: ${index}`)
  return BELT_OFFSET + index * WEAPON_RECORD_BYTES
}

export type BeltState = {
  /** 🟢 帯刀している本数。ロード時は帯刀[0]〜[count−1] だけが読まれる */
  count: number
  /** 右手（選んでいる武器）。何も選んでいなければ null（0xFF） */
  right: number | null
  /** 二刀流の左手。二刀流でなければ null */
  left: number | null
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null
  /** 編集はできるが、ゲームの読み込みと食い違う点 */
  warnings: string[]
}

export type BeltView = {
  layoutProblem: string | null
  weapons: WeaponView[]
  state: BeltState
}

function readState(bytes: Uint8Array, weapons: readonly WeaponView[], layoutProblem: string | null): BeltState {
  const count = readU8(bytes, BELT_STATE.count)
  const rightRaw = readU8(bytes, BELT_STATE.right)
  const right = rightRaw === NO_RIGHT ? null : rightRaw
  const leftRaw = readU8(bytes, BELT_STATE.left)
  const dual = readU8(bytes, BELT_STATE.dual)

  let problem: string | null = null
  if (count > BELT_COUNT) problem = `帯刀の本数が範囲外です（${count}）`
  else if (right !== null && right >= BELT_COUNT) problem = `右手の番号が範囲外です（${right}）`
  else if (dual > 1) problem = `二刀流の値が想定外です（${dual}）`
  else if (dual === 0 && leftRaw !== NO_LEFT) problem = `二刀流でないのに左手の番号が入っています（${leftRaw}）`
  else if (dual === 1 && right === null) problem = '右手に何も持たずに二刀流になっています'
  else if (dual === 1 && (leftRaw >= BELT_COUNT || leftRaw === right)) problem = `左手の番号が想定外です（${leftRaw}）`

  // 🟢 ロード時の扱いと食い違う点。値はそのまま編集できる
  const warnings: string[] = []
  if (!problem) {
    weapons.forEach((w, i) => {
      if (i < count && w.empty) warnings.push(`${i + 1}本目は帯刀の本数（${count}）の内側ですが空きです`)
      if (i >= count && !w.empty) warnings.push(`${i + 1}本目は帯刀の本数（${count}）より後ろなので、ゲームでは読まれません`)
    })
    if (right !== null && right >= count) warnings.push('右手の番号が帯刀の本数より後ろです。ロード時に右手・左手・二刀流が解除されます')
    else if (dual === 1 && leftRaw >= count) warnings.push('左手の番号が帯刀の本数より後ろです。ロード時に二刀流が解除されます')
  }

  return {
    count,
    right,
    left: dual === 1 ? leftRaw : null,
    problem: layoutProblem ?? problem,
    warnings,
  }
}

export function readBelt(bytes: Uint8Array): BeltView {
  if (bytes.byteLength < BELT_STATE.dual + 1) throw new RangeError('ファイルが小さすぎて帯刀を読めません')
  const layoutProblem = checkLayout(bytes)
  const weapons = Array.from({ length: BELT_COUNT }, (_, i) => readWeapon(bytes, beltOffset(i), layoutProblem))
  return { layoutProblem, weapons, state: readState(bytes, weapons, layoutProblem) }
}

// 帯刀の状態の書き込み。❓ 書き込みの反映はゲーム内で未確認（要ゲーム内確認）。
// 現在の状態が妥当性検証に落ちていれば書かない。

function editableState(bytes: Uint8Array): BeltView {
  const view = readBelt(bytes)
  if (view.state.problem) throw new RangeError(view.state.problem)
  return view
}

/** 🟢 手に持てるのは、帯刀の本数の内側にある空きでない武器 */
function assertUsable(view: BeltView, index: number, hand: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= BELT_COUNT) throw new RangeError(`${hand}の番号が範囲外です: ${index}`)
  if (view.weapons[index].empty) throw new RangeError(`${index + 1}本目は空きなので${hand}に持てません`)
  if (index >= view.state.count) throw new RangeError(`${index + 1}本目は帯刀の本数（${view.state.count}）より後ろなので${hand}に持てません`)
}

/**
 * 右手（選んでいる）帯刀武器の番号（0xA6A9）だけを書く。null は何も選んでいない（0xFF）。
 * 二刀流の左手と同じ番号と、二刀流のまま何も選ばないことは拒否する
 */
export function writeBeltRight(bytes: Uint8Array, index: number | null): void {
  const view = editableState(bytes)
  if (index === null) {
    if (view.state.left !== null) throw new RangeError('二刀流のままでは右手を空にできません。先に二刀流をやめてください')
    writeU8(bytes, BELT_STATE.right, NO_RIGHT)
    return
  }
  assertUsable(view, index, '右手')
  if (view.state.left === index) throw new RangeError('左手と同じ武器は右手に持てません')
  writeU8(bytes, BELT_STATE.right, index)
}

/**
 * 二刀流を設定する。left が null なら二刀流をやめる（0xA6AB＝0、0xA6AA＝0xFF）。
 * 番号を渡すと二刀流にする（0xA6AB＝1、0xA6AA＝番号）。
 * 🟢 左手に持てない武器ならロード時に二刀流が解除される。🔶 どの武器の組み合わせで二刀流にできるか（武器の種類の制限）は未確認。
 */
export function writeBeltDual(bytes: Uint8Array, left: number | null): void {
  const view = editableState(bytes)
  if (left === null) {
    writeU8(bytes, BELT_STATE.left, NO_LEFT)
    writeU8(bytes, BELT_STATE.dual, 0)
    return
  }
  assertUsable(view, left, '左手')
  if (view.state.right === null) throw new RangeError('右手に何も持っていないときは二刀流にできません')
  if (left === view.state.right) throw new RangeError('右手と同じ武器は左手に持てません')
  writeU8(bytes, BELT_STATE.left, left)
  writeU8(bytes, BELT_STATE.dual, 1)
}
