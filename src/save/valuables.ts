// 重要品（貴重品）。出典：docs/save_format/chunks/items（[TS][I-3]）、docs/save_format/datatable/item/valuable.csv（貴重品ID ✅ [TS][I-3]、D-12）。
//
// [TS] の固定オフセットを使い、
// ファイルサイズが [TS] の構造体サイズ 0x48BB0 と一致するときだけ編集可能にする。
// 一覧にない ID・通常の上限を超える個数は警告にとどめ、書き込みのときにモードで制限する。
//
// 枠の構造（8 B）と書き込み方は手持ちの道具と共通（item-slot.ts）。
import { type EditOpts, NORMAL_EDIT_OPTS, type ViewStatus } from './field'
import { assertWritable, checkLayout } from './layout'
import {
  EMPTY_ID,
  ITEM_COUNT_MAX,
  ITEM_SLOT_BYTES,
  readItemSlotRaw,
  validateItemCount,
  writeItemSlotRaw,
  type ItemOption,
  type ItemSlot,
} from './item-slot'
import { itemLabel, nameOf } from './master/labels'
import { itemLabelId } from './master/label-types'

/** アイテムの表（item.csv）の名前。表の名前どおりに表示するものはここから引く */
const item = nameOf.item

export const VALUABLES_OFFSET = 0x5b90 // ✅ [TS][I-3]
export const VALUABLE_SLOT_BYTES = ITEM_SLOT_BYTES
export const VALUABLE_SLOT_COUNT = 10

// [TS] が読み書きするのは先頭4件（製錬用の鉄4種）。
// 5件目以降は同じ構造と推定しているが、[TS] は扱っておらず I-3 の範囲外（🔶）。

export { EMPTY_ID }

export type Valuable = ItemOption

/**
 * 選択肢に出す貴重品ID。
 * - くず鉄〜緋緋色金：datatable/item/valuable.csv ✅ [TS][I-3]。0x2A／0x2B の順は D-12 で判定済み
 * - 会談の手紙（0x00）：U-14 の調査で分かった（[U] 2026-10-05）。7回目の調査では 0x01 としていたが、
 *   対応づけが1つずれていた（PROBED_LABELS の7回目の訂正を参照）。訂正後、重要品の枠に 0x00 を書いて
 *   会談の手紙と表示されることを確認した（[U] 2026-10-05）。
 *   ゲーム内でセーブできるか・イベントで使えるかは未確認（要ゲーム内確認）
 *
 * - 拷問部屋の鍵（0xED）・謎の鍵（0xEE）：🟢（U-14 判明、2026-10-07）。重要品の枠で 0x00〜0xD6 を調べた調査
 *   （PROBED_LABELS）の範囲の外にあった。ゲーム内での表示・イベントでの使用は未確認（要ゲーム内確認）。
 *   謎の鍵は3日目夜に領事館のローラの部屋の扉で1本使う（docs/save_format/chunks/night-visit）
 * チップ（0x2D）・木札（0x2E）は ❓ U-12 判定待ち。Steam版で書き込むと、フリーズはしないが
 * ゲーム内でセーブできなくなった（[U] 2026-10-04）ため、選択肢に出さない。
 */
export const VALUABLES: readonly Valuable[] = [
  {
    id: 0x0000,
    label: item(0x0000),
    // ✅ 表示（U-14）。❓ ゲーム内でセーブできるか・イベントで使えるか
    caution: 'イベントで使えない、またはゲーム内でセーブできなくなることがあります',
  },
  { id: 0x0029, label: item(0x0029) },
  { id: 0x002a, label: item(0x002a) },
  { id: 0x002b, label: item(0x002b) },
  { id: 0x002c, label: item(0x002c) },
  {
    id: 0x00ed,
    label: item(0x00ed),
    // 🟢 ID（U-14）。❓ ゲーム内での表示・イベントで使えるか
    caution: 'ゲーム内で表示されない、またはイベントで使えないことがあります',
  },
  {
    id: 0x00ee,
    label: item(0x00ee),
    // 🟢 ID（U-14）。❓ ゲーム内での表示・ローラの部屋の扉で使えるか
    caution: 'ゲーム内で表示されない、またはローラの部屋の扉で使えないことがあります',
  },
]

/** ❓ U-12：PS3版での意味 [SE-BBS]。PC版では未確認のため、表示だけに使い書き込まない */
const U12_LABELS: Record<number, string> = {
  0x002d: 'チップ？',
  0x002e: '木札？',
}

/**
 * ❓ U-14 の調査で、重要品の枠に書いてゲーム内の重要品一覧に出た名前（[U] 2026-10-04、2026-10-05）。
 * チラシ以外は食べ物で、通常アイテムの ID と考えられる。重要品として扱ってよいかは未確認のため、
 * 表示だけに使い選択肢には出さない（ID調査モードでは書ける）。
 * 見た名前がアイテムの表の名前と同じものは表から引く（itemsByIds）。注記を付けたものだけ文字列で書く。
 */
const itemsByIds = (...ids: number[]): Record<number, string> =>
  Object.fromEntries(ids.map((id) => [id, itemLabel(itemLabelId(id))]))
const itemRange = (first: number, last: number): number[] => Array.from({ length: last - first + 1 }, (_, i) => first + i)

const PROBED_LABELS: Record<number, string> = {
  // 1回目：チラシ・うなぎ丼・天丼・鉄火丼・熱燗・ししゃも
  ...itemsByIds(...itemRange(0x2f, 0x34)),
  // 2回目（[U] 2026-10-05）。空き枠に 0x35〜0x3E を順に入れ、一覧の並び順で対応させた
  //   野沢菜・里芋のにっころがし・刺身の盛り合わせ・マグロ・アナゴ・海老・玉子・三色団子・あんころもち・ビッグステーキ
  ...itemsByIds(...itemRange(0x35, 0x3e)),
  // 3回目（[U] 2026-10-05）。空き枠に 0x3F、0x41〜0x49 を順に入れ、一覧の並び順で対応させた
  //   骨付き肉・鮎の塩焼き・南蛮炒め蕎麦・かけそば・きつねそば・たぬきそば・月見そば・お茶づけ・冷や・丼
  // 丼（0x49）は効果の説明がなく、画像が別のアイテムのもの。🔶 未実装のアイテムと推測（[U]）
  ...itemsByIds(0x3f, ...itemRange(0x41, 0x49)),
  // 4回目（[U] 2026-10-05）。空き枠に 0x4A〜0x4F、0x60〜0x62、0x70 を順に入れ、一覧の並び順で対応させた
  //   かけうどん・きつねうどん・たぬきうどん・月見うどん・饅頭・箸、空き缶
  ...itemsByIds(...itemRange(0x4a, 0x4f), 0x62),
  0x0060: '伝説の魚（中、売却用）',
  0x0061: '伝説の魚（大、売却用）',
  // 竹の間（0x70）は宿泊設備で、アイテムではない（[U]）
  // 5回目（[U] 2026-10-05）。空き枠に 0x71〜0x73、0x75〜0x7B を順に入れ、一覧の並び順で対応させた
  // 松の間・入院（0x71・0x72）は宿泊設備で、アイテムではない（[U]）
  // 0x73、0x75〜0x7B はすべて「茶器」（アイテムの画像、説明は「武士の心得」）。🔶 同じ表示が続くので仮のデータと推測
  ...itemsByIds(0x70, 0x71, 0x72, 0x73, ...itemRange(0x75, 0x7b)),
  // 6回目（[U] 2026-10-05）。0x7C〜0x99 もすべて「茶器」
  ...itemsByIds(...itemRange(0x7c, 0x99)),
  // 7回目（[U] 2026-10-05）。空き枠に 0x00、0x01、0x0D〜0x0F、0x14〜0x18 を順に入れた。部品箱の「刃？」などはユーザーの推測。
  // 訂正（[U] 2026-10-05）：一覧の並び順での対応づけが1つずれていた（先頭の名前が最後の ID のもので、残りは1つ前の ID のもの）。根拠：
  //   - 道具の枠に 0x00、0x0D〜0x0F、0x14〜0x19 を順に入れると、一覧は 会談の手紙・部品箱×3・お金袋（小〜特大）・がらくた・お宝 の順だった
  //   - 道具の枠に 0x01 を入れると伯爵の寿司だった
  // 0x00 は会談の手紙で、VALUABLES に昇格した
  //   伯爵の寿司・お金袋（小〜特大）・がらくた
  ...itemsByIds(0x01, ...itemRange(0x14, 0x18)),
  0x000d: '部品箱（刃？）',
  0x000e: '部品箱（鍔？）',
  0x000f: '部品箱（柄？）',
  // 8回目（[U] 2026-10-05）。空き枠に 0x19、0x1B、0x1C、0x20、0x21、0x9A〜0x9E を順に入れ、一覧の並び順で対応させた
  //   お宝・百両箱・茶器・プリセット目録・オレ流目録、0x9A〜0x9E は茶器
  // 0x1C は本来の茶器（ユーザー確認）。0x73 以降の「茶器」はこれと同じ表示の仮データと推測（🔶）
  ...itemsByIds(0x19, 0x1b, 0x1c, 0x20, 0x21, ...itemRange(0x9a, 0x9e)),
  // 9回目（[U] 2026-10-05）。0x9F〜0xBF から飛び飛びに選んだ ID も、すべて「茶器」
  ...itemsByIds(0xa0, 0xa8, 0xac, 0xaf, 0xb5, 0xb9, 0xbc, 0xbf),
  // 10回目（[U] 2026-10-05）。空き枠に 0x51、0x54、0x56、0x66、0x6A〜0x6C、0x6F、0xC0、0xC1 を順に入れ、一覧の並び順で対応させた
  //   コイ・ハゼ・ウニ・おにぎり（昆布）・朱美のにっころがし・秘蔵の熱燗・梅の間・茶器・茶器
  // 梅の間（0x6F）は宿泊設備で、アイテムではない（0x70 竹の間、0x71 松の間と続く）
  ...itemsByIds(0x54, 0x56, 0x66, 0x6a, 0x6b, 0x6c, 0x6f, 0xc0, 0xc1),
  // 0x51 は魚のアナゴ（シロギス 0x50 などの釣果の並び）。料理のアナゴ 0x39 と区別するため「（魚）」を付けた
  0x0051: 'アナゴ（魚）',
  // 11回目（[U] 2026-10-05）。0xC2、0xC3、0x9F、0xA1〜0xA7 もすべて「茶器」
  ...itemsByIds(0xc2, 0xc3, 0x9f, ...itemRange(0xa1, 0xa7)),
  // 12回目（[U] 2026-10-05）。空き枠に 0xCD〜0xD6 を順に入れ、一覧の並び順で対応させた。
  // 🔶 すべて開発用のアイテムとユーザーは推測
  0x00cd: '疲労に効く薬（開発用？）',
  0x00ce: '熱燗（お猪口）（開発用？）',
  0x00cf: '熱燗（徳利）（開発用？）',
  0x00d0: '熱燗（セット）（開発用？）',
  0x00d1: '三色団子（1串）（開発用？）',
  0x00d2: '三色団子（皿）（開発用？）',
  0x00d3: '三色団子（セット）（開発用？）',
  0x00d4: 'あんころもち（1串）（開発用？）',
  0x00d5: 'あんころもち（皿）（開発用？）',
  0x00d6: 'あんころもち（セット）（開発用？）',
}

/**
 * ❓ U-14：調査の候補 ID。🔶 推測。この順に調べる（ID の昇順ではない）。
 * 貴重品と通常アイテムは共通の ID 空間（datatable/README.md のアイテムの ID 空間。PS3版の一覧でも 0x22 白紙目録・0x29 くず鉄・0x74 コインが同じ空間）。
 * 0x00〜0x9E のうち、通常アイテムとして名前のない ID はすべて調査済み（PROBED_LABELS）。0x73〜0x9E は「茶器」（仮データ）が続いた。
 * 0x29 以降で [TS] に番号だけ定義のある ID もすべて調査済み（0xC0〜0xC3 は茶器）。
 * 1. 0xCD〜0xFF（[TS] の定義の外。釣り餌 0xC4〜0xCC の後ろ）。0xCD〜0xD6 は調査済み（開発用？）
 * 2. 0x9F〜0xBF の残り。調べた 18件がすべて「茶器」だったので、茶器が続くと推測
 * 調査済みの ID（PROBED_LABELS）と、選択肢にある ID（VALUABLES。0xED・0xEE の鍵）は除く。
 */
export const PROBE_CANDIDATES: readonly number[] = [
  ...Array.from({ length: 0xff - 0xcd + 1 }, (_, i) => 0xcd + i),
  ...Array.from({ length: 0xbf - 0x9f + 1 }, (_, i) => 0x9f + i),
].filter((id) => !(id in PROBED_LABELS) && !VALUABLES.some((v) => v.id === id))

/** 個数の上限。🔶 推測（item-slot.ts の ITEM_COUNT_MAX） */
export const VALUABLE_COUNT_MAX = ITEM_COUNT_MAX

/**
 * label は、U-12 の ID なら「？」付き、U-14 で調べた ID なら調査結果の名前。
 * idWritable が false になるのは U-12 の ID と未知の ID。
 * [TS] が扱う先頭4件は ✅、5件目以降は 🔶
 */
export type ValuableSlot = ItemSlot

export type ValuablesView = ViewStatus & {
  slots: ValuableSlot[]
}

export function slotOffset(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= VALUABLE_SLOT_COUNT) {
    throw new RangeError(`重要品の枠番号が範囲外です: ${index}`)
  }
  return VALUABLES_OFFSET + index * VALUABLE_SLOT_BYTES
}

export function findValuable(id: number): Valuable | undefined {
  return VALUABLES.find((v) => v.id === id)
}

export function valuableLabel(id: number): string | null {
  if (id === EMPTY_ID) return 'なし'
  return findValuable(id)?.label ?? U12_LABELS[id] ?? PROBED_LABELS[id] ?? null
}

/**
 * 書き込める ID。通常は選択肢にある貴重品か、なし。
 * ID調査モード（画面の切り替えを EditOpts.advanced で受ける）では u16 の任意の ID（U-12 の ID を除く）。
 *
 * ID調査モードは、U-14 で謎の鍵・拷問部屋の鍵・会談の手紙の ID を探すために作った。
 * 3つとも判明したあとも、一覧にない ID をゲーム内で調べるために残している。
 * ゲーム内で名前を見て ID を特定したら VALUABLES に昇格させる。
 * U-12 の ID（0x2D／0x2E）はセーブできなくなることが分かっているので、このモードでも拒否する。
 */
export function validateValuableId(id: number, options: EditOpts = NORMAL_EDIT_OPTS): string | null {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff) return '重要品の一覧から選んでください'
  if (id === EMPTY_ID || findValuable(id)) return null
  if (id in U12_LABELS) {
    return `${U12_LABELS[id]}は書き込むとゲーム内でセーブできなくなるため書き込めません` // ❓ U-12
  }
  if (options.advanced) return null
  if (id in PROBED_LABELS) return `${PROBED_LABELS[id]}は重要品の枠には書けません` // ❓ U-14
  return '重要品の一覧にない値です'
}

export function validateValuableCount(count: number, opts: EditOpts = NORMAL_EDIT_OPTS): string | null {
  return validateItemCount(count, opts.advanced ? 0xffff : VALUABLE_COUNT_MAX)
}

export function readValuables(bytes: Uint8Array, options: EditOpts = NORMAL_EDIT_OPTS): ValuablesView {
  const end = VALUABLES_OFFSET + VALUABLE_SLOT_BYTES * VALUABLE_SLOT_COUNT
  if (bytes.byteLength < end) throw new RangeError('ファイルが小さすぎて重要品を読めません')
  const layoutProblem = checkLayout(bytes)

  const slots: ValuableSlot[] = []
  const seen = new Map<number, number>()
  for (let index = 0; index < VALUABLE_SLOT_COUNT; index++) {
    const { offset, id, count } = readItemSlotRaw(bytes, slotOffset(index))

    const idProblem = validateValuableId(id, options)
    const warnings: string[] = []
    if (id !== EMPTY_ID) {
      const first = seen.get(id)
      if (first !== undefined) warnings.push(`${first + 1}件目と同じ重要品です`)
      else seen.set(id, index)
      if (count === 0) warnings.push('個数が 0 です')
      // 🔶 個数の正規上限は item-slot.ts の ITEM_COUNT_MAX。位置の検査とは分ける。
      if (count > VALUABLE_COUNT_MAX) warnings.push('個数が通常の上限を超えています（上級者モードでだけ書けます）')
      if (idProblem) warnings.push(`${idProblem}。ほかの値に変更してください`)
      const caution = findValuable(id)?.caution
      if (caution) warnings.push(caution)
      if (!idProblem && id in PROBED_LABELS) warnings.push(`${PROBED_LABELS[id]} は重要品ではありません`) // ❓ U-14
      if (!idProblem && valuableLabel(id) === null) warnings.push('重要品の一覧にない値です。ゲーム内の表示を確認してください') // ❓ U-14
    }

    slots.push({
      index,
      offset,
      id,
      count,
      label: valuableLabel(id),
      problem: layoutProblem,
      idWritable: idProblem === null,
      warnings,
    })
  }
  return { warnings: [], problem: layoutProblem, slots }
}

// 書き込み。呼び出し側で妥当性検証を通した枠に対してだけ使う。
// 不正な値は例外にして、バイト列を変えない。

/**
 * 枠の ID と個数（+0x00〜+0x03）を書く。+0x04〜+0x07 は変えない。
 * 「なし」（0xFFFF）にするときは個数を 0 にする（🔶 推測。item-slot.ts の writeItemSlotRaw）。
 */
export function writeValuable(
  bytes: Uint8Array,
  index: number,
  id: number,
  count: number,
  options: EditOpts = NORMAL_EDIT_OPTS,
): void {
  assertWritable(bytes)
  const offset = slotOffset(index)
  const idProblem = validateValuableId(id, options)
  if (idProblem) throw new RangeError(idProblem)
  writeItemSlotRaw(bytes, offset, id, count, options.advanced ? 0xffff : VALUABLE_COUNT_MAX)
}

/**
 * ❓ U-14：空き枠（なし）に、PROBE_CANDIDATES の start から順に候補 ID を1つずつ個数 1 で入れる（ID調査モード専用）。
 * 既に入っている枠と、セーブ内に既にある ID は使わない。入れた ID を返す。
 * 1回のゲーム内確認で最大10件の ID を調べるための機能。
 */
export function fillEmptySlotsWithProbes(bytes: Uint8Array, start: number): number[] {
  assertWritable(bytes)
  const view = readValuables(bytes, { advanced: true })
  if (view.problem) throw new RangeError(view.problem)
  const used = new Set(view.slots.map((s) => s.id))
  const from = PROBE_CANDIDATES.indexOf(start)
  if (from < 0) throw new RangeError('開始 ID が調査の候補にありません')
  const ids = PROBE_CANDIDATES.slice(from).filter((id) => !used.has(id))
  const filled: number[] = []
  for (const slot of view.slots) {
    if (slot.id !== EMPTY_ID || slot.problem) continue
    const id = ids.shift()
    if (id === undefined) break
    writeValuable(bytes, slot.index, id, 1, { advanced: true })
    filled.push(id)
  }
  return filled
}
