// 帯刀（帯刀中の武器3本と、帯刀の状態）。
// 出典：docs/save_format/chunks/weapon-record（帯刀 0xA4C2 から 0xA0 × 3件 ✅ [TS][I-2][I-3]）、docs/save_format/chunks/belt-state（帯刀の状態 0xA6A8〜0xA6AF）。
//
// ❓ U-1 判定待ちのため、[TS] の固定オフセット（案A）を使い、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
//
// 帯刀の状態（chunks/belt-state、[U] 2026-10-05 の差分）。読みは各項目とも差分1回で確認、**書き込みはゲーム内で未確認**（要ゲーム内確認）：
//   0xA6A8 u8  🔶 帯刀している本数（実例は常に 3。表示だけ）
//   0xA6A9 u8  右手（選んでいる）帯刀武器の番号（0始まり。0xFF＝何も選んでいない [U] 2026-10-05 ユーザー確認）   S4-DATA_00 → 02：0 → 1（2本目に切り替え）
//   0xA6AA u8  二刀流の左手の帯刀武器の番号（0xFF＝なし）      02 copy → 02 copy 2：FF → 02（3本目を左手に）
//   0xA6AB u8  二刀流（0／1）                                  02 copy → 02 copy 2：0 → 1
//   0xA6AC u8  峰打（0／1）                                    02 → 02 copy：0 → 1
//   0xA6AD〜0xA6AF  ❓ すべての例で 0。書き換えない
// 0xA6AA〜0xA6AF は [TS] の配置では武器袋[0] の +0x00〜+0x05 に当たる。weapon.ts はこの範囲を書かない。
import { readU8, writeU8 } from './binary'
import { checkLayout } from './hero'
import { WEAPON_RECORD_BYTES, readWeapon, type WeaponView } from './weapon'

export const BELT_OFFSET = 0xa4c2 // ✅ [TS][I-2][I-3]
export const BELT_COUNT = 3

export const BELT_STATE = {
  count: 0xa6a8, // 🔶
  right: 0xa6a9,
  left: 0xa6aa,
  dual: 0xa6ab,
  mineuchi: 0xa6ac,
} as const

/** 左手・右手とも、0xFF は何も持っていない */
export const NO_LEFT = 0xff
export const NO_RIGHT = 0xff

export function beltOffset(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= BELT_COUNT) throw new RangeError(`帯刀の番号が範囲外です: ${index}`)
  return BELT_OFFSET + index * WEAPON_RECORD_BYTES
}

export type BeltState = {
  /** 🔶 帯刀している本数（表示だけ） */
  count: number
  /** 右手（選んでいる武器）。何も選んでいなければ null（0xFF） */
  right: number | null
  /** 二刀流の左手。二刀流でなければ null */
  left: number | null
  mineuchi: boolean
  /** 妥当性検証に落ちた理由。null なら編集可能 */
  problem: string | null
}

export type BeltView = {
  layoutProblem: string | null
  weapons: WeaponView[]
  state: BeltState
}

function readState(bytes: Uint8Array, layoutProblem: string | null): BeltState {
  const count = readU8(bytes, BELT_STATE.count)
  const rightRaw = readU8(bytes, BELT_STATE.right)
  const right = rightRaw === NO_RIGHT ? null : rightRaw
  const leftRaw = readU8(bytes, BELT_STATE.left)
  const dual = readU8(bytes, BELT_STATE.dual)
  const mineuchi = readU8(bytes, BELT_STATE.mineuchi)

  let problem: string | null = null
  if (right !== null && right >= BELT_COUNT) problem = `右手の番号が範囲外です（${right}）`
  else if (dual > 1) problem = `二刀流の値が想定外です（${dual}）`
  else if (mineuchi > 1) problem = `峰打の値が想定外です（${mineuchi}）`
  else if (dual === 0 && leftRaw !== NO_LEFT) problem = `二刀流でないのに左手の番号が入っています（${leftRaw}）`
  else if (dual === 1 && right === null) problem = '右手に何も持たずに二刀流になっています'
  else if (dual === 1 && (leftRaw >= BELT_COUNT || leftRaw === right)) problem = `左手の番号が想定外です（${leftRaw}）`

  return {
    count,
    right,
    left: dual === 1 ? leftRaw : null,
    mineuchi: mineuchi === 1,
    problem: layoutProblem ?? problem,
  }
}

export function readBelt(bytes: Uint8Array): BeltView {
  if (bytes.byteLength < BELT_STATE.mineuchi + 1) throw new RangeError('ファイルが小さすぎて帯刀を読めません')
  const layoutProblem = checkLayout(bytes)
  const weapons = Array.from({ length: BELT_COUNT }, (_, i) => readWeapon(bytes, beltOffset(i), layoutProblem))
  return { layoutProblem, weapons, state: readState(bytes, layoutProblem) }
}

// 帯刀の状態の書き込み。❓ 書き込みはゲーム内で未確認（要ゲーム内確認）。
// 現在の状態が妥当性検証に落ちていれば書かない。

function editableState(bytes: Uint8Array): BeltView {
  const view = readBelt(bytes)
  if (view.state.problem) throw new RangeError(view.state.problem)
  return view
}

function assertUsable(view: BeltView, index: number, hand: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= BELT_COUNT) throw new RangeError(`${hand}の番号が範囲外です: ${index}`)
  if (view.weapons[index].empty) throw new RangeError(`${index + 1}本目は空きなので${hand}に持てません`)
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
 * 🔶 どの武器の組み合わせで二刀流にできるか（武器の種類の制限）は未確認。
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

/** 峰打（0xA6AC）だけを書く */
export function writeBeltMineuchi(bytes: Uint8Array, on: boolean): void {
  editableState(bytes)
  writeU8(bytes, BELT_STATE.mineuchi, on ? 1 : 0)
}
