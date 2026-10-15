// 帯刀（帯刀中の武器3本と、帯刀の状態）。
// 出典：docs/save_format/chunks/weapon-record（帯刀 3件 ✅ [TS][I-2][I-3]）、docs/save_format/chunks/belt-state（帯刀の状態 0xA6A8〜0xA6AF）。
//
// 固定オフセットを使い、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
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
import { tr, type Localized } from '@/lib/i18n'
import { readU8, writeU8 } from './binary'
import { type ViewStatus } from './field'
import { assertWritable, checkLayout } from './layout'
import { WEAPON_RECORD_BYTES, readWeapon, type WeaponView } from './weapon'

export const BELT_OFFSET = 0xa4c8 // ✅ [TS][I-2][I-3] の 0xA4C2 ＋ 🟢 0x06
export const BELT_COUNT = 3

export const BELT_STATE = {
  count: 0xa6a8, // 🟢
  right: 0xa6a9,
  left: 0xa6aa,
  dual: 0xa6ab,
} as const
/** 帯刀の状態の範囲の最後のバイト（0xA6AC 以降は扱わないが、武器袋の直前までが帯刀の状態） */
export const BELT_STATE_LAST = 0xa6af

/** 左手・右手とも、0xFF は何も持っていない */
export const NO_LEFT = 0xff
export const NO_RIGHT = 0xff

export function beltOffset(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= BELT_COUNT) throw new RangeError(tr({ ja: "帯刀の番号が範囲外です", en: "Equipped weapon slot out of range" }))
  return BELT_OFFSET + index * WEAPON_RECORD_BYTES
}

/** warnings は、編集はできるが、ゲームの読み込みと食い違う点 */
export type BeltState = ViewStatus & {
  /** 🟢 帯刀している本数。ロード時は帯刀[0]〜[count−1] だけが読まれる */
  count: number
  /** 右手（選んでいる武器）。何も選んでいなければ null（0xFF） */
  right: number | null
  /** 二刀流の左手。二刀流でなければ null */
  left: number | null
}

export type BeltView = ViewStatus & {
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
  if (count > BELT_COUNT)
    problem = tr({ ja: "帯刀の本数が範囲外です", en: "The number of equipped weapons is out of range." })
  else if (right !== null && right >= BELT_COUNT)
    problem = tr({ ja: "右手の指定が範囲外です", en: "The right-hand weapon is out of range." })
  else if (dual > 1) problem = tr({ ja: "二刀流の状態が想定外です", en: "The Dual Arms setting has an unexpected value." })
  else if (dual === 0 && leftRaw !== NO_LEFT)
    problem = tr({
      ja: "二刀流でないのに左手の指定が入っています",
      en: "A left-hand weapon is set without Dual Arms.",
    })
  else if (dual === 1 && right === null)
    problem = tr({ ja: '右手に何も持たずに二刀流になっています', en: 'Dual Arms is on with nothing in the right hand.' })
  else if (dual === 1 && (leftRaw >= BELT_COUNT || leftRaw === right))
    problem = tr({ ja: "左手の指定が想定外です", en: "The left-hand weapon has an unexpected value." })

  // 🟢 ロード時の扱いと食い違う点。値はそのまま編集できる
  const warnings: string[] = []
  if (!problem) {
    weapons.forEach((w, i) => {
      if (i < count && w.empty)
        warnings.push(
          tr({
            ja: `${i + 1}本目は帯刀の本数（${count}）の内側ですが空きです`,
            en: `Weapon ${i + 1} is empty although it is within the number of equipped weapons (${count}).`,
          }),
        )
      if (i >= count && !w.empty)
        warnings.push(
          tr({
            ja: `${i + 1}本目は帯刀の本数（${count}）より後ろなので、ゲームでは読まれません`,
            en: `Weapon ${i + 1} is beyond the number of equipped weapons (${count}), so the game does not load it.`,
          }),
        )
    })
    if (right !== null && right >= count)
      warnings.push(
        tr({
          ja: '右手が帯刀の本数より後ろの武器です。ロード時に右手・左手・二刀流が解除されます',
          en: 'The right-hand weapon is beyond the number of equipped weapons. The right hand, left hand and Dual Arms are cleared on load.',
        }),
      )
    else if (dual === 1 && leftRaw >= count)
      warnings.push(
        tr({
          ja: '左手が帯刀の本数より後ろの武器です。ロード時に二刀流が解除されます',
          en: 'The left-hand weapon is beyond the number of equipped weapons. Dual Arms is cleared on load.',
        }),
      )
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
  if (bytes.byteLength < BELT_STATE.dual + 1) throw new RangeError(
      tr({ ja: 'ファイルが小さすぎて帯刀を読めません', en: 'The file is too small to read the equipped weapons.' }),
    )
  const layoutProblem = checkLayout(bytes)
  const weapons = Array.from({ length: BELT_COUNT }, (_, i) => readWeapon(bytes, beltOffset(i), layoutProblem))
  return { warnings: [], problem: layoutProblem, weapons, state: readState(bytes, weapons, layoutProblem) }
}

// 帯刀の状態の書き込み。❓ 書き込みの反映はゲーム内で未確認（要ゲーム内確認）。
// 現在の状態が妥当性検証に落ちていれば書かない。

function editableState(bytes: Uint8Array): BeltView {
  const view = readBelt(bytes)
  if (view.state.problem) throw new RangeError(view.state.problem)
  return view
}

/**
 * 🟢 手に持てる帯刀の番号（帯刀の本数の内側にある空きでない武器）。exclude はもう一方の手に持っている番号で、一覧から除く。
 * 帯刀の状態が読み取り専用でも一覧は作る（選択肢の表示に使う）
 */
export function usableBeltWeapons(view: BeltView, exclude: number | null): number[] {
  return view.weapons.flatMap((w, i) => (!w.empty && i !== exclude && i < view.state.count ? [i] : []))
}

/** 二刀流にするときの左手の既定：右手のほかで、手に持てる最初の武器。なければ null */
export function defaultDualLeft(view: BeltView): number | null {
  return usableBeltWeapons(view, view.state.right)[0] ?? null
}

/** 🟢 手に持てるのは、帯刀の本数の内側にある空きでない武器 */
function assertUsable(view: BeltView, index: number, hand: Localized): void {
  if (!Number.isInteger(index) || index < 0 || index >= BELT_COUNT)
    throw new RangeError(tr({ ja: `${hand.ja}の指定が範囲外です`, en: `The ${hand.en}-hand weapon is out of range.` }))
  if (view.weapons[index].empty)
    throw new RangeError(
      tr({
        ja: `${index + 1}本目は空きなので${hand.ja}に持てません`,
        en: `Weapon ${index + 1} is empty, so it cannot be held in the ${hand.en} hand.`,
      }),
    )
  if (index >= view.state.count)
    throw new RangeError(
      tr({
        ja: `${index + 1}本目は帯刀の本数（${view.state.count}）より後ろなので${hand.ja}に持てません`,
        en: `Weapon ${index + 1} is beyond the number of equipped weapons (${view.state.count}), so it cannot be held in the ${hand.en} hand.`,
      }),
    )
}

const RIGHT_HAND: Localized = { ja: '右手', en: 'right' }
const LEFT_HAND: Localized = { ja: '左手', en: 'left' }

/**
 * 右手（選んでいる）帯刀武器の番号（0xA6A9）だけを書く。null は何も選んでいない（0xFF）。
 * 二刀流の左手と同じ番号と、二刀流のまま何も選ばないことは拒否する
 */
export function writeBeltRight(bytes: Uint8Array, index: number | null): void {
  assertWritable(bytes)
  const view = editableState(bytes)
  if (index === null) {
    if (view.state.left !== null)
      throw new RangeError(
        tr({
          ja: '二刀流のままでは右手を空にできません。先に二刀流をやめてください',
          en: 'The right hand cannot be emptied while Dual Arms is on. Turn off Dual Arms first.',
        }),
      )
    writeU8(bytes, BELT_STATE.right, NO_RIGHT)
    return
  }
  assertUsable(view, index, RIGHT_HAND)
  if (view.state.left === index)
    throw new RangeError(
      tr({
        ja: '左手と同じ武器は右手に持てません',
        en: 'The weapon in the left hand cannot also be held in the right hand.',
      }),
    )
  writeU8(bytes, BELT_STATE.right, index)
}

/**
 * 二刀流を設定する。left が null なら二刀流をやめる（0xA6AB＝0、0xA6AA＝0xFF）。
 * 番号を渡すと二刀流にする（0xA6AB＝1、0xA6AA＝番号）。
 * 🟢 左手に持てない武器ならロード時に二刀流が解除される。🔶 どの武器の組み合わせで二刀流にできるか（武器の種類の制限）は未確認。
 */
export function writeBeltDual(bytes: Uint8Array, left: number | null): void {
  assertWritable(bytes)
  const view = editableState(bytes)
  if (left === null) {
    writeU8(bytes, BELT_STATE.left, NO_LEFT)
    writeU8(bytes, BELT_STATE.dual, 0)
    return
  }
  assertUsable(view, left, LEFT_HAND)
  if (view.state.right === null)
    throw new RangeError(
      tr({
        ja: '右手に何も持っていないときは二刀流にできません',
        en: 'Dual Arms cannot be turned on with nothing in the right hand.',
      }),
    )
  if (left === view.state.right)
    throw new RangeError(
      tr({
        ja: '右手と同じ武器は左手に持てません',
        en: 'The weapon in the right hand cannot also be held in the left hand.',
      }),
    )
  writeU8(bytes, BELT_STATE.left, left)
  writeU8(bytes, BELT_STATE.dual, 1)
}

/**
 * 二刀流のオン・オフ。オンにするときは左手に既定の武器（defaultDualLeft）を持たせる。
 * 左手に持てる武器がなければ例外にして、バイト列を変えない
 */
export function writeBeltDualEnabled(bytes: Uint8Array, on: boolean): void {
  if (!on) return writeBeltDual(bytes, null)
  assertWritable(bytes)
  const left = defaultDualLeft(editableState(bytes))
  if (left === null)
    throw new RangeError(tr({ ja: '左手に持てる武器がありません', en: 'No weapon can be held in the left hand.' }))
  writeBeltDual(bytes, left)
}
