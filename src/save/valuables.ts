// 重要品（貴重品）。出典：docs/save_format/chunks/items（[TS][I-3]）、docs/save_format/datatable/item/valuable.csv（貴重品ID ✅ [TS][I-3]、D-12）。
//
// ❓ U-1（固定オフセットで扱えるか）が判定待ちのため、[TS] の固定オフセット（案A）を使い、
// 次の2段階の妥当性検証を通った枠だけを編集可能にする（check-diff.md U-1「採用までの扱い」）。
//   1. ファイルサイズが [TS] の構造体サイズ 0x48BB0 と一致する（案A の条件）
//   2. 各枠の ID が既知の一覧にあり、個数が妥当な範囲にある
//
// 枠の構造（8 B）と書き込み方は手持ちの道具と共通（item-slot.ts）。
import { checkLayout } from './hero'
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
import { formatHex4 } from '@/lib/format'

export const VALUABLES_OFFSET = 0x5b90 // ✅ [TS][I-3]
export const VALUABLE_SLOT_BYTES = ITEM_SLOT_BYTES
export const VALUABLE_SLOT_COUNT = 10

/**
 * [TS] が読み書きする枠の数（製錬用の鉄4種として先頭4件）。
 * 5件目以降は同じ構造と推定しているが、[TS] は扱っておらず I-3 の範囲外（🔶）。
 */
export const TS_EDITED_SLOTS = 4

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
 * ❓ U-14 未解決（2026-10-05 時点で調査を中断）：謎の鍵・拷問部屋の鍵の ID は見つかっていない。
 *   - 調べた範囲：0x00〜0xA8、0xAC、0xAF、0xB5、0xB9、0xBC、0xBF、0xC0〜0xD6（結果は PROBED_LABELS）
 *   - 未調査：0xA9〜0xBE の残り（茶器が続くと推測）、0xD7〜0xFF、0x100 以上
 *   - 再開するなら：ID調査モードで 0xD7 から続けるか、鍵を手に入れる前後のセーブを比べて重要品の枠に入る ID を直接読む（確実）
 * チップ（0x2D）・木札（0x2E）は ❓ U-12 判定待ち。Steam版で書き込むと、フリーズはしないが
 * ゲーム内でセーブできなくなった（[U] 2026-10-04）ため、選択肢に出さない。
 */
export const VALUABLES: readonly Valuable[] = [
  {
    id: 0x0000,
    label: '会談の手紙',
    caution: '表示は確認済み（U-14）。ゲーム内でセーブできるか・イベントで使えるかは未確認です',
  },
  { id: 0x0029, label: 'くず鉄' },
  { id: 0x002a, label: '卸し鉄' },
  { id: 0x002b, label: '堂島鋼' },
  { id: 0x002c, label: '緋緋色金' },
]

/** ❓ U-12：PS3版での意味 [SE-BBS]。PC版では未確認のため、表示だけに使い書き込まない */
const U12_LABELS: Record<number, string> = {
  0x002d: 'チップ？（U-12）',
  0x002e: '木札？（U-12）',
}

/**
 * ❓ U-14 の調査で、重要品の枠に書いてゲーム内の重要品一覧に出た名前（[U] 2026-10-04、2026-10-05）。
 * チラシ以外は食べ物で、通常アイテムの ID と考えられる。重要品として扱ってよいかは未確認のため、
 * 表示だけに使い選択肢には出さない（ID調査モードでは書ける）。
 */
const PROBED_LABELS: Record<number, string> = {
  0x002f: 'チラシ',
  0x0030: 'うなぎ丼',
  0x0031: '天丼',
  0x0032: '鉄火丼',
  0x0033: '熱燗',
  0x0034: 'ししゃも',
  // 2回目（[U] 2026-10-05）。空き枠に 0x35〜0x3E を順に入れ、一覧の並び順で対応させた
  0x0035: '野沢菜',
  0x0036: '里芋のにっころがし',
  0x0037: '刺身の盛り合わせ',
  0x0038: 'マグロ',
  0x0039: 'アナゴ',
  0x003a: '海老',
  0x003b: '玉子',
  0x003c: '三色団子',
  0x003d: 'あんころもち',
  0x003e: 'ビッグステーキ',
  // 3回目（[U] 2026-10-05）。空き枠に 0x3F、0x41〜0x49 を順に入れ、一覧の並び順で対応させた
  0x003f: '骨付き肉',
  0x0041: '鮎の塩焼き',
  0x0042: '南蛮炒め蕎麦',
  0x0043: 'かけそば',
  0x0044: 'きつねそば',
  0x0045: 'たぬきそば',
  0x0046: '月見そば',
  0x0047: 'お茶づけ',
  0x0048: '冷や',
  // 丼は効果の説明がなく、画像が別のアイテムのもの。🔶 未実装のアイテムと推測（[U]）
  0x0049: '丼',
  // 4回目（[U] 2026-10-05）。空き枠に 0x4A〜0x4F、0x60〜0x62、0x70 を順に入れ、一覧の並び順で対応させた
  0x004a: 'かけうどん',
  0x004b: 'きつねうどん',
  0x004c: 'たぬきうどん',
  0x004d: '月見うどん',
  0x004e: '饅頭',
  0x004f: '箸',
  0x0060: '伝説の魚（中、売却用）',
  0x0061: '伝説の魚（大、売却用）',
  0x0062: '空き缶',
  // 竹の間は宿泊設備で、アイテムではない（[U]）
  0x0070: '竹の間',
  // 5回目（[U] 2026-10-05）。空き枠に 0x71〜0x73、0x75〜0x7B を順に入れ、一覧の並び順で対応させた
  // 松の間・入院は宿泊設備で、アイテムではない（[U]）
  0x0071: '松の間',
  0x0072: '入院',
  // 0x73、0x75〜0x7B はすべて「茶器」（アイテムの画像、説明は「武士の心得」）。🔶 同じ表示が続くので仮のデータと推測
  0x0073: '茶器',
  0x0075: '茶器',
  0x0076: '茶器',
  0x0077: '茶器',
  0x0078: '茶器',
  0x0079: '茶器',
  0x007a: '茶器',
  0x007b: '茶器',
  // 6回目（[U] 2026-10-05）。0x7C〜0x99 もすべて「茶器」
  ...Object.fromEntries(Array.from({ length: 0x99 - 0x7c + 1 }, (_, i) => [0x7c + i, '茶器'])),
  // 7回目（[U] 2026-10-05）。空き枠に 0x00、0x01、0x0D〜0x0F、0x14〜0x18 を順に入れた。部品箱の「刃？」などはユーザーの推測。
  // 訂正（[U] 2026-10-05）：一覧の並び順での対応づけが1つずれていた（先頭の名前が最後の ID のもので、残りは1つ前の ID のもの）。根拠：
  //   - 道具の枠に 0x00、0x0D〜0x0F、0x14〜0x19 を順に入れると、一覧は 会談の手紙・部品箱×3・お金袋（小〜特大）・がらくた・お宝 の順だった
  //   - 道具の枠に 0x01 を入れると伯爵の寿司だった
  // 0x00 は会談の手紙で、VALUABLES に昇格した
  0x0001: '伯爵の寿司',
  0x000d: '部品箱（刃？）',
  0x000e: '部品箱（鍔？）',
  0x000f: '部品箱（柄？）',
  0x0014: 'お金袋（小）',
  0x0015: 'お金袋（中）',
  0x0016: 'お金袋（大）',
  0x0017: 'お金袋（特大）',
  0x0018: 'がらくた',
  // 8回目（[U] 2026-10-05）。空き枠に 0x19、0x1B、0x1C、0x20、0x21、0x9A〜0x9E を順に入れ、一覧の並び順で対応させた
  0x0019: 'お宝',
  0x001b: '百両箱',
  // 0x1C は本来の茶器（ユーザー確認）。0x73 以降の「茶器」はこれと同じ表示の仮データと推測（🔶）
  0x001c: '茶器',
  0x0020: 'プリセット目録',
  0x0021: '俺流目録',
  ...Object.fromEntries(Array.from({ length: 0x9e - 0x9a + 1 }, (_, i) => [0x9a + i, '茶器'])),
  // 9回目（[U] 2026-10-05）。0x9F〜0xBF から飛び飛びに選んだ ID も、すべて「茶器」
  0x00a0: '茶器',
  0x00a8: '茶器',
  0x00ac: '茶器',
  0x00af: '茶器',
  0x00b5: '茶器',
  0x00b9: '茶器',
  0x00bc: '茶器',
  0x00bf: '茶器',
  // 10回目（[U] 2026-10-05）。空き枠に 0x51、0x54、0x56、0x66、0x6A〜0x6C、0x6F、0xC0、0xC1 を順に入れ、一覧の並び順で対応させた
  // 0x51 は魚のアナゴ（シロギス 0x50 などの釣果の並び）。料理のアナゴ 0x39 と区別するため「（魚）」を付けた
  0x0051: 'アナゴ（魚）',
  0x0054: 'コイ',
  0x0056: 'ハゼ',
  0x0066: 'ウニ',
  0x006a: 'おにぎり(昆布)',
  0x006b: '朱美のにっころがし',
  0x006c: '秘蔵の熱燗',
  // 梅の間は宿泊設備で、アイテムではない（0x70 竹の間、0x71 松の間と続く）
  0x006f: '梅の間',
  0x00c0: '茶器',
  0x00c1: '茶器',
  // 11回目（[U] 2026-10-05）。0xC2、0xC3、0x9F、0xA1〜0xA7 もすべて「茶器」
  0x00c2: '茶器',
  0x00c3: '茶器',
  0x009f: '茶器',
  0x00a1: '茶器',
  0x00a2: '茶器',
  0x00a3: '茶器',
  0x00a4: '茶器',
  0x00a5: '茶器',
  0x00a6: '茶器',
  0x00a7: '茶器',
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
 * ID調査モード（上級者モード）。❓ U-14：謎の鍵・拷問部屋の鍵・会談の手紙の ID を探すため、
 * 一覧にない ID を書けるようにする。ゲーム内で名前を見て ID を特定したら VALUABLES に昇格させる。
 * U-12 の ID（0x2D／0x2E）はセーブできなくなることが分かっているので、このモードでも拒否する。
 */
export type ValuableOptions = { investigate?: boolean }

/**
 * ❓ U-14：調査の候補 ID。🔶 推測。この順に調べる（ID の昇順ではない）。
 * 貴重品と通常アイテムは共通の ID 空間（datatable/README.md のアイテムの ID 空間。PS3版の一覧でも 0x22 白紙目録・0x29 くず鉄・0x74 コインが同じ空間）。
 * 0x00〜0x9E のうち、通常アイテムとして名前のない ID はすべて調査済み（PROBED_LABELS）。0x73〜0x9E は「茶器」（仮データ）が続いた。
 * 0x29 以降で [TS] に番号だけ定義のある ID もすべて調査済み（0xC0〜0xC3 は茶器）。
 * 1. 0xCD〜0xFF（[TS] の定義の外。釣り餌 0xC4〜0xCC の後ろ）。0xCD〜0xD6 は調査済み（開発用？）
 * 2. 0x9F〜0xBF の残り。調べた 18件がすべて「茶器」だったので、茶器が続くと推測
 * 調査済みの ID（PROBED_LABELS）は除く。
 */
export const PROBE_CANDIDATES: readonly number[] = [
  ...Array.from({ length: 0xff - 0xcd + 1 }, (_, i) => 0xcd + i),
  ...Array.from({ length: 0xbf - 0x9f + 1 }, (_, i) => 0x9f + i),
].filter((id) => !(id in PROBED_LABELS))

/** 個数の上限。🔶 推測（item-slot.ts の ITEM_COUNT_MAX） */
export const VALUABLE_COUNT_MAX = ITEM_COUNT_MAX

/**
 * label は、U-12 の ID なら「？」付き、U-14 で調べた ID なら調査結果の名前。
 * idWritable が false になるのは U-12 の ID と未知の ID
 */
export type ValuableSlot = ItemSlot & {
  /** [TS] が編集する枠か（✅）。false なら 🔶 */
  tsEdited: boolean
}

export type ValuablesView = {
  layoutProblem: string | null
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
 * ID調査モードでは u16 の任意の ID（U-12 の ID を除く）。
 */
export function validateValuableId(id: number, options: ValuableOptions = {}): string | null {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff) return `ID は 0x0000〜0xFFFF です（${id}）`
  if (id === EMPTY_ID || findValuable(id)) return null
  if (id in U12_LABELS) {
    return `${formatHex4(id)} は判定待ち（U-12）で、Steam版で書き込むとゲーム内でセーブできなくなったため書き込めません`
  }
  if (options.investigate) return null
  if (id in PROBED_LABELS) return `${PROBED_LABELS[id]}（${formatHex4(id)}）は重要品として確認されていません（U-14）`
  return `未知の ID です（${formatHex4(id)}）`
}

export const validateValuableCount = validateItemCount

export function readValuables(bytes: Uint8Array, options: ValuableOptions = {}): ValuablesView {
  const end = VALUABLES_OFFSET + VALUABLE_SLOT_BYTES * VALUABLE_SLOT_COUNT
  if (bytes.byteLength < end) throw new RangeError('ファイルが小さすぎて重要品を読めません')
  const layoutProblem = checkLayout(bytes)

  const slots: ValuableSlot[] = []
  const seen = new Map<number, number>()
  for (let index = 0; index < VALUABLE_SLOT_COUNT; index++) {
    const { offset, id, count, unknown } = readItemSlotRaw(bytes, slotOffset(index))

    const idProblem = validateValuableId(id, options)
    let problem: string | null = null
    if (!idProblem && id !== EMPTY_ID && count > VALUABLE_COUNT_MAX) {
      problem = `個数が大きすぎます（${count}）。位置がずれている可能性があります`
    }

    let warning: string | null = null
    if (id !== EMPTY_ID) {
      const first = seen.get(id)
      if (first !== undefined) warning = `${first + 1}件目と同じ重要品です`
      else seen.set(id, index)
      if (count === 0) warning = '個数が 0 です'
      if (idProblem) warning = `${idProblem}。ほかの値に変更してください`
      const caution = findValuable(id)?.caution
      if (caution) warning = caution
      if (!idProblem && id in PROBED_LABELS) warning = `${PROBED_LABELS[id]} は重要品として確認されていない ID です（U-14）`
      if (!idProblem && valuableLabel(id) === null) warning = `未知の ID です（${formatHex4(id)}）。ゲーム内の表示を確認してください（U-14）`
    }

    slots.push({
      index,
      offset,
      id,
      count,
      unknown,
      label: valuableLabel(id),
      tsEdited: index < TS_EDITED_SLOTS,
      problem: layoutProblem ?? problem,
      idWritable: idProblem === null,
      warning,
    })
  }
  return { layoutProblem, slots }
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
  options: ValuableOptions = {},
): void {
  const offset = slotOffset(index)
  const idProblem = validateValuableId(id, options)
  if (idProblem) throw new RangeError(idProblem)
  writeItemSlotRaw(bytes, offset, id, count)
}

/**
 * ❓ U-14：空き枠（なし）に、PROBE_CANDIDATES の start から順に候補 ID を1つずつ個数 1 で入れる（ID調査モード専用）。
 * 既に入っている枠と、セーブ内に既にある ID は使わない。入れた ID を返す。
 * 1回のゲーム内確認で最大10件の ID を調べるための機能。
 */
export function fillEmptySlotsWithProbes(bytes: Uint8Array, start: number): number[] {
  const view = readValuables(bytes, { investigate: true })
  if (view.layoutProblem) throw new RangeError(view.layoutProblem)
  const used = new Set(view.slots.map((s) => s.id))
  const from = PROBE_CANDIDATES.indexOf(start)
  if (from < 0) throw new RangeError(`${formatHex4(start)} は調査の候補ではありません`)
  const ids = PROBE_CANDIDATES.slice(from).filter((id) => !used.has(id))
  const filled: number[] = []
  for (const slot of view.slots) {
    if (slot.id !== EMPTY_ID || slot.problem) continue
    const id = ids.shift()
    if (id === undefined) break
    writeValuable(bytes, slot.index, id, 1, { investigate: true })
    filled.push(id)
  }
  return filled
}
