// 道具（手持ち）と箪笥の通常アイテム。出典：docs/save_format/chunks/items（[TS] の `CarriedItems`、✅ [TS][I-3]）、
// docs/save_format/datatable/item/item.csv、check-diff.md D-11（手持ち 0x5B40、8 B × 10件。PS3 の値とも一致）。
//
// ❓ U-1（固定オフセットで扱えるか）が判定待ちのため、[TS] の固定オフセット（案A）を使い、
// 次の2段階の妥当性検証を通った枠だけを編集可能にする（check-diff.md U-1「採用までの扱い」）。
//   1. ファイルサイズが [TS] の構造体サイズ 0x48BB0 と一致する（案A の条件）
//   2. 各枠の ID が既知の一覧にあり、個数が妥当な範囲にある
//
// 枠の構造（8 B）は重要品と共通（item-slot.ts）。+0x04 の1バイトは 0x06（ITEM_MARK）。
import { readU8, writeU32 } from "./binary";
import { checkLayout } from "./hero";
import {
  EMPTY_ID,
  ITEM_COUNT_MAX,
  ITEM_SLOT_BYTES,
  readItemSlotRaw,
  writeItemSlotRaw,
  type ItemOption,
  type ItemOptionGroup,
  type ItemSlot,
} from "./item-slot";
import { labelOf } from "./master/labels";
import { ITEMS, ITEM_KIND_LABELS, findItem, type ItemEntry } from "./master/item-names";
import { formatHex4 } from "@/lib/format";

/** 上級者モード。種別が料理・宿・なし（手に入る経路がない）の ID と、最大数を超える個数を書ける */
export type ItemBoxOptions = { advanced?: boolean };

/** 個数として書ける値の上限（u16）。上級者モードで使う */
export const ITEM_COUNT_SYSTEM_MAX = 0xffff;

export type ItemBoxArea = {
  /** 画面での呼び名 */
  noun: string;
  offset: number;
  slotCount: number;
  /** 通常モードの個数の上限 */
  normalCountMax: (item: ItemEntry) => number;
};

/**
 * 手持ちの道具。✅ [TS][I-3]（D-11）。
 * 個数の上限は、1枠にまとめて持てる最大数（item.csv の max_stack 🟢）。ほとんどの道具は 1 で、
 * がらくた 10・お宝 5・鉄 999・コイン 9999・エサ 10。店で買った砥石が別々の2枠に1個ずつ入っていた（[U] sample）こととも合う
 */
export const TOOLS_AREA: ItemBoxArea = {
  noun: "道具",
  offset: 0x5b40,
  slotCount: 10,
  normalCountMax: (item) => Math.max(1, item.maxStack),
};

/**
 * 箪笥の通常アイテム。✅（chunks/items：0x58C0 から 8 B × 80件。直後が手持ち 0x5B40）。
 * 箪笥では max_stack を超える個数が入っている（刀油×13 など [U] sample）ので、上限は ITEM_COUNT_MAX（🔶 999）
 */
export const CHEST_AREA: ItemBoxArea = {
  noun: "箪笥",
  offset: 0x58c0,
  slotCount: 80,
  normalCountMax: () => ITEM_COUNT_MAX,
};

/**
 * 道具の入った枠の +0x04（u8）。🟢 アイテムの種類（道具＝6）。これがないとゲームが落ちる [U]（2026-10-05、sample/S4-DATA_03-*）。
 * - ゲームが書いた枠は、箪笥・手持ち・重要品とも、すべて +0x04＝0x06（[U] sample）
 * - 手持ちの空き枠におにぎりを入れて +0x04〜+0x07 が 00 00 00 00 のままだと、店で売却一覧を開くときに
 *   「ShoSell.cpp, Expression: pItemList, message: Pointer is NULL」で落ちた（-4）
 * - 同じ枠を 06 EE E8 50（-5）、06 00 00 00（-7）にすると開けた。01 00 00 00（-6）、00 EE E8 50（-8）では落ちた
 * +0x05〜+0x07 は枠ごとに違う値（❓）で、0 でも一覧は開いた（-7）。
 * 箪笥の枠に 06 00 00 00 を書いてゲームで読めるかは要ゲーム内確認。
 */
export const ITEM_MARK = 0x06;
const ITEM_MARK_OFFSET = 4;

/**
 * 選択肢に出さない ID。
 * - チップ・木札（0x2D／0x2E）：❓ U-12。Steam版で書くとゲーム内でセーブできなくなった（[U] 2026-10-04）。上級者モードでも拒否する
 * - 重要品の画面で扱う ID（会談の手紙・鉄4種・鍵2本。valuables.ts）
 */
const U12_IDS = new Set([0x2d, 0x2e]);
const VALUABLE_IDS = new Set([0x00, 0x29, 0x2a, 0x2b, 0x2c, 0xed, 0xee]);

const KIND_CAUTION: Record<1 | 2 | 3, string> = {
  1: "料理屋でその場で食べる料理で、道具としては手に入りません（🟢）。枠に入れたときの動作は要ゲーム内確認です",
  2: "宿の部屋で、道具としては手に入りません（🟢）。枠に入れたときの動作は要ゲーム内確認です",
  3: "手に入る経路がない ID です（🟢）。ゲーム内での表示・使用は要ゲーム内確認です",
};

const ALL_KINDS = [0, 1, 2, 3] as const;

const itemDisplayLabel = (it: ItemEntry) => labelOf({ kind: "item", id: it.labelId });

function toOption(it: ItemEntry): ItemOption {
  const hex = it.id.toString(16).toUpperCase().padStart(2, "0");
  return {
    id: it.id,
    label: itemDisplayLabel(it),
    keywords: [itemDisplayLabel(it), it.en, it.reading, hex, `0x${hex}`].filter((k) => k !== ""),
    description: it.descJa,
    caution: it.kind === 0 ? undefined : KIND_CAUTION[it.kind],
  };
}

const SELECTABLE = ITEMS.filter((it) => !U12_IDS.has(it.id) && !VALUABLE_IDS.has(it.id));
const OPTIONS_BY_KIND = ALL_KINDS.map((k) => SELECTABLE.filter((it) => it.kind === k).map(toOption));

/** 通常モードは「道具」だけ。上級者モードは「料理」「宿」「なし」も、種別の見出しをつけて出す */
export function itemOptionGroups(options: ItemBoxOptions = {}): ItemOptionGroup[] {
  if (!options.advanced) return [{ items: OPTIONS_BY_KIND[0] }];
  return ALL_KINDS.map((k) => ({ label: ITEM_KIND_LABELS[k], items: OPTIONS_BY_KIND[k] }));
}

export function itemLabel(id: number): string | null {
  if (id === EMPTY_ID) return "なし";
  const it = findItem(id);
  return it ? itemDisplayLabel(it) : null;
}

/** 書き込める ID。選択肢にある道具か、なし */
export function validateItemId(id: number, options: ItemBoxOptions = {}): string | null {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff) return `ID は 0x0000〜0xFFFF です（${id}）`;
  if (id === EMPTY_ID) return null;
  if (U12_IDS.has(id)) return `${formatHex4(id)} は書くとゲーム内でセーブできなくなる ID です（U-12）`;
  if (VALUABLE_IDS.has(id)) return `${formatHex4(id)} は重要品の画面で扱う ID です`;
  const it = findItem(id);
  if (!it) return `道具の一覧にない ID です（${formatHex4(id)}）`;
  if (it.kind !== 0 && !options.advanced) {
    return `${itemDisplayLabel(it)} は種別「${ITEM_KIND_LABELS[it.kind]}」で、上級者モードでだけ書けます`;
  }
  return null;
}

/** 通常モードの個数の上限（画面に出す値）。手持ちは最大数、箪笥は 999 */
export function itemNormalCountMax(area: ItemBoxArea, id: number): number {
  const it = findItem(id);
  return it ? area.normalCountMax(it) : ITEM_COUNT_MAX;
}

/** その ID に書ける個数の上限。通常モードは area の上限、上級者モードは u16 の上限 */
export function itemCountMax(area: ItemBoxArea, id: number, options: ItemBoxOptions = {}): number {
  return options.advanced ? ITEM_COUNT_SYSTEM_MAX : itemNormalCountMax(area, id);
}

export function validateItemBoxCount(
  area: ItemBoxArea,
  id: number,
  count: number,
  options: ItemBoxOptions = {},
): string | null {
  if (!Number.isInteger(count)) return "整数を入力してください";
  const max = itemCountMax(area, id, options);
  if (count < 1 || count > max) {
    return options.advanced
      ? `1〜${max} の範囲で入力してください`
      : `1〜${max} の範囲で入力してください（上級者モードでは最大数を超えて書けます）`;
  }
  return null;
}

export type ItemBoxView = {
  layoutProblem: string | null;
  slots: ItemSlot[];
};

export function itemBoxSlotOffset(area: ItemBoxArea, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= area.slotCount) {
    throw new RangeError(`${area.noun}の枠番号が範囲外です: ${index}`);
  }
  return area.offset + index * ITEM_SLOT_BYTES;
}

const MISSING_MARK_WARNING =
  "+0x04 が 0x06 ではありません。手持ちではこのままだと店の売却一覧を開くときにゲームが落ちます（[U]）。「修復」で直せます";

export function readItemBox(bytes: Uint8Array, area: ItemBoxArea, options: ItemBoxOptions = {}): ItemBoxView {
  const end = area.offset + ITEM_SLOT_BYTES * area.slotCount;
  if (bytes.byteLength < end) throw new RangeError(`ファイルが小さすぎて${area.noun}を読めません`);
  const layoutProblem = checkLayout(bytes);

  const slots: ItemSlot[] = [];
  for (let index = 0; index < area.slotCount; index++) {
    const { offset, id, count, unknown } = readItemSlotRaw(bytes, itemBoxSlotOffset(area, index));
    const item = findItem(id);

    const idProblem = validateItemId(id, options);
    // 🔶 妥当性の上限：位置のずれを見分けるための目安。通常モードは max(999, 最大数)、上級者モードは u16 の上限
    const sanityMax = options.advanced
      ? ITEM_COUNT_SYSTEM_MAX
      : Math.max(ITEM_COUNT_MAX, item ? area.normalCountMax(item) : 0);
    let problem: string | null = null;
    if (id !== EMPTY_ID && item && count > sanityMax) {
      problem = `個数が大きすぎます（${count}）。位置がずれている可能性があります`;
    }

    let warning: string | null = null;
    if (id !== EMPTY_ID) {
      if (item && count > area.normalCountMax(item)) {
        warning = `個数 ${count} は最大数 ${area.normalCountMax(item)} を超えています（上級者モードでだけ書ける値）`;
      }
      if (count === 0) warning = "個数が 0 です";
      if (item && item.kind !== 0) warning = KIND_CAUTION[item.kind];
      if (!hasItemMark(bytes, area, index)) warning = MISSING_MARK_WARNING;
      if (idProblem) warning = `${idProblem}。ほかの値に変更できます`;
    }

    slots.push({
      index,
      offset,
      id,
      count,
      unknown,
      label: itemLabel(id),
      problem: layoutProblem ?? problem,
      idWritable: idProblem === null,
      warning,
    });
  }
  return { layoutProblem, slots };
}

function hasItemMark(bytes: Uint8Array, area: ItemBoxArea, index: number): boolean {
  return readU8(bytes, itemBoxSlotOffset(area, index) + ITEM_MARK_OFFSET) === ITEM_MARK;
}

/** アイテムが入っているのに +0x04 が 0x06 でない枠の番号 */
export function slotsMissingMark(bytes: Uint8Array, area: ItemBoxArea): number[] {
  const out: number[] = [];
  for (const slot of readItemBox(bytes, area, { advanced: true }).slots) {
    if (slot.id !== EMPTY_ID && !slot.problem && !hasItemMark(bytes, area, slot.index)) out.push(slot.index);
  }
  return out;
}

// 書き込み。呼び出し側で妥当性検証を通した枠に対してだけ使う。
// 不正な値は例外にして、バイト列を変えない。

/**
 * 枠の ID と個数（+0x00〜+0x03）を書く。「なし」なら個数 0。
 * +0x04〜+0x07 は次のようにする。
 * - アイテムを入れるとき：+0x04 が既に 0x06 なら変えない（+0x05〜+0x07 の値を保つ）。
 *   0x06 でなければ 06 00 00 00 を書く（[U] -7 で売却一覧が開くことを確認した値。箪笥も同じ値を書く）
 * - 「なし」にするとき：00 00 00 00 を書く（普通の空き枠はすべてこの値 [U]。S4-DATA_03-1、S4-DATA_04）
 */
export function writeItemBoxSlot(
  bytes: Uint8Array,
  area: ItemBoxArea,
  index: number,
  id: number,
  count: number,
  options: ItemBoxOptions = {},
): void {
  const offset = itemBoxSlotOffset(area, index);
  const idProblem = validateItemId(id, options);
  if (idProblem) throw new RangeError(idProblem);
  if (id !== EMPTY_ID) {
    const countProblem = validateItemBoxCount(area, id, count, options);
    if (countProblem) throw new RangeError(countProblem);
  }
  writeItemSlotRaw(bytes, offset, id, id === EMPTY_ID ? 0 : count, ITEM_COUNT_SYSTEM_MAX);
  if (id === EMPTY_ID) writeU32(bytes, offset + ITEM_MARK_OFFSET, 0);
  else if (!hasItemMark(bytes, area, index)) writeU32(bytes, offset + ITEM_MARK_OFFSET, ITEM_MARK);
}

/** アイテムが入っているのに +0x04 が 0x06 でない枠に 06 00 00 00 を書く。直した枠の番号を返す */
export function repairItemMarks(bytes: Uint8Array, area: ItemBoxArea): number[] {
  const layoutProblem = checkLayout(bytes);
  if (layoutProblem) throw new RangeError(layoutProblem);
  const targets = slotsMissingMark(bytes, area);
  for (const i of targets) writeU32(bytes, itemBoxSlotOffset(area, i) + ITEM_MARK_OFFSET, ITEM_MARK);
  return targets;
}
