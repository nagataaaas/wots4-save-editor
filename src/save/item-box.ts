// 道具（手持ち）と箪笥の通常アイテム。出典：docs/save_format/chunks/items（[TS] の `CarriedItems`、✅ [TS][I-3]）、
// docs/save_format/datatable/item/item.csv、check-diff.md D-11（手持ち 0x5B40、8 B × 10件。PS3 の値とも一致）。
//
// [TS] の固定オフセットを使い、
// ファイルサイズが [TS] の構造体サイズ 0x48BB0 と一致するときだけ編集可能にする。
// 一覧にない ID・最大数を超える個数は警告にとどめ、書き込みのときにモードで制限する。
//
// 枠の構造（8 B）は重要品と共通（item-slot.ts）。+0x04 の1バイトは 0x06（ITEM_MARK）。
import { getLanguage, tr, type Language, type Localized } from "@/lib/i18n";
import { readU8, writeU32 } from "./binary";
import { type EditOpts, NORMAL_EDIT_OPTS, type ViewStatus } from "./field";
import { assertWritable, checkLayout } from "./layout";
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
import { labelKeywords, labelOf } from "./master/labels";
import { ITEMS, ITEM_KIND_LABELS, findItem, type ItemEntry } from "./master/item-names";
import { U12_VALUABLE_IDS, VALUABLE_IDS } from "./valuables";

/** 個数として書ける値の上限（u16）。上級者モードで使う */
export const ITEM_COUNT_SYSTEM_MAX = 0xffff;

export type ItemBoxArea = {
  /** 画面での呼び名。使う所で tr() する */
  noun: Localized;
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
  noun: { ja: "道具", en: "Items" },
  offset: 0x5b40,
  slotCount: 10,
  normalCountMax: (item) => Math.max(1, item.maxStack),
};

/**
 * 箪笥の通常アイテム。✅（chunks/items：0x58C0 から 8 B × 80件。直後が手持ち 0x5B40）。
 * 箪笥では max_stack を超える個数が入っている（刀油×13 など [U] sample）ので、上限は ITEM_COUNT_MAX（🔶 999）
 */
export const CHEST_AREA: ItemBoxArea = {
  noun: { ja: "箪笥", en: "Chest" },
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
const U12_IDS = U12_VALUABLE_IDS;

// 🟢 道具としては手に入らない。❓ 枠に入れたときの動作・表示は要ゲーム内確認
const KIND_CAUTION: Record<1 | 2 | 3, Localized> = {
  1: {
    ja: "料理屋でその場で食べる料理で、道具としては手に入りません",
    en: "A meal eaten on the spot at a restaurant. It cannot be obtained as an item",
  },
  2: { ja: "宿の部屋で、道具としては手に入りません", en: "An inn room. It cannot be obtained as an item" },
  3: { ja: "手に入る経路がない道具です", en: "An item that cannot be obtained" },
};

const ALL_KINDS = [0, 1, 2, 3] as const;

const itemDisplayLabel = (it: ItemEntry) => labelOf({ kind: "item", id: it.labelId });

function toOption(it: ItemEntry): ItemOption {
  const hex = it.id.toString(16).toUpperCase().padStart(2, "0");
  return {
    id: it.id,
    label: itemDisplayLabel(it),
    keywords: [...labelKeywords({ kind: "item", id: it.labelId }), hex, `0x${hex}`],
    description: tr({ ja: it.descJa, en: it.descEn }),
    caution: it.kind === 0 ? undefined : tr(KIND_CAUTION[it.kind]),
  };
}

const SELECTABLE = ITEMS.filter((it) => !U12_IDS.has(it.id) && !VALUABLE_IDS.has(it.id));

/**
 * 種別ごとの選択肢。名前・説明は言語で変わるので、言語ごとに作って持つ。
 * 同じ言語なら同じ配列を返す（ItemSlotRow が選択肢を使い回せるように）
 */
const optionsByKindCache: Partial<Record<Language, ItemOption[][]>> = {};
function optionsByKind(): ItemOption[][] {
  const lang = getLanguage();
  return (optionsByKindCache[lang] ??= ALL_KINDS.map((k) => SELECTABLE.filter((it) => it.kind === k).map(toOption)));
}

/**
 * 通常モードは「道具」だけ。上級者モードは「料理」「宿」「なし」（手に入る経路がない種別）も、種別の見出しをつけて出す。
 * 上級者モードでは、最大数を超える個数も書ける（itemCountMax）
 */
export function itemOptionGroups(options: EditOpts = NORMAL_EDIT_OPTS): ItemOptionGroup[] {
  const byKind = optionsByKind();
  if (!options.advanced) return [{ items: byKind[0] }];
  return ALL_KINDS.map((k) => ({ label: tr(ITEM_KIND_LABELS[k]), items: byKind[k] }));
}

export function itemLabel(id: number): string | null {
  if (id === EMPTY_ID) return tr({ ja: "なし", en: "None" });
  const it = findItem(id);
  return it ? itemDisplayLabel(it) : null;
}

/** 書き込める ID。選択肢にある道具か、なし */
export function validateItemId(id: number, options: EditOpts = NORMAL_EDIT_OPTS): string | null {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff) return tr({ ja: "道具の一覧から選んでください", en: "Choose from the item list" });
  if (id === EMPTY_ID) return null;
  // ❓ U-12
  if (U12_IDS.has(id)) {
    return tr({
      ja: "チップ・木札は書くとゲーム内でセーブできなくなるため選べません",
      en: "Casino Chips and Wooden Tags cannot be chosen because the game can no longer save once they are written",
    });
  }
  if (VALUABLE_IDS.has(id)) {
    const name = itemLabel(id);
    return tr({
      ja: `${name ?? "この道具"}は重要品の画面で扱います`,
      en: `${name ?? "This item"} is handled on the Key Items screen`,
    });
  }
  const it = findItem(id);
  if (!it) return tr({ ja: "道具の一覧にない値です", en: "Not in the item list" });
  if (it.kind !== 0 && !options.advanced) {
    const name = itemDisplayLabel(it);
    const kind = ITEM_KIND_LABELS[it.kind];
    return tr({
      ja: `${name} は種別「${kind.ja}」で、上級者モードでだけ書けます`,
      en: `${name} is of type "${kind.en}" and can only be written in Advanced mode`,
    });
  }
  return null;
}

/** 通常モードの個数の上限（画面に出す値）。手持ちは最大数、箪笥は 999 */
export function itemNormalCountMax(area: ItemBoxArea, id: number): number {
  const it = findItem(id);
  return it ? area.normalCountMax(it) : ITEM_COUNT_MAX;
}

/** その ID に書ける個数の上限。通常モードは area の上限、上級者モードは u16 の上限 */
export function itemCountMax(area: ItemBoxArea, id: number, options: EditOpts = NORMAL_EDIT_OPTS): number {
  return options.advanced ? ITEM_COUNT_SYSTEM_MAX : itemNormalCountMax(area, id);
}

export function validateItemBoxCount(
  area: ItemBoxArea,
  id: number,
  count: number,
  options: EditOpts = NORMAL_EDIT_OPTS,
): string | null {
  if (!Number.isInteger(count)) return tr({ ja: "整数を入力してください", en: "Enter a whole number" });
  const max = itemCountMax(area, id, options);
  if (count < 1 || count > max) {
    return options.advanced
      ? tr({ ja: `1〜${max} の範囲で入力してください`, en: `Enter a value from 1 to ${max}` })
      : tr({
          ja: `1〜${max} の範囲で入力してください（上級者モードでは最大数を超えて書けます）`,
          en: `Enter a value from 1 to ${max} (Advanced mode allows more than the maximum)`,
        });
  }
  return null;
}

export type ItemBoxView = ViewStatus & {
  slots: ItemSlot[];
};

export function itemBoxSlotOffset(area: ItemBoxArea, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= area.slotCount) {
    throw new RangeError(tr({
      ja: `${area.noun.ja}の枠番号が範囲外です: ${index}`,
      en: `${area.noun.en} slot number out of range: ${index}`,
    }));
  }
  return area.offset + index * ITEM_SLOT_BYTES;
}

// +0x04 が 0x06 でない枠。手持ちで売却一覧が落ちたのは [U]
const MISSING_MARK_WARNING: Localized = {
  ja: "道具として扱えない状態です。このままだと店で売却一覧を開くときにゲームが落ちることがあります。「修復」で直せます",
  en: 'This slot is not in a usable item state. The game may crash when opening the sell list at a shop. Use "Repair" to fix it',
};

export function readItemBox(bytes: Uint8Array, area: ItemBoxArea, options: EditOpts = NORMAL_EDIT_OPTS): ItemBoxView {
  const end = area.offset + ITEM_SLOT_BYTES * area.slotCount;
  if (bytes.byteLength < end) {
    throw new RangeError(tr({
      ja: `ファイルが小さすぎて${area.noun.ja}を読めません`,
      en: `The file is too small to read ${area.noun.en.toLowerCase()}`,
    }));
  }
  const layoutProblem = checkLayout(bytes);

  const slots: ItemSlot[] = [];
  for (let index = 0; index < area.slotCount; index++) {
    const { offset, id, count } = readItemSlotRaw(bytes, itemBoxSlotOffset(area, index));
    const item = findItem(id);

    const idProblem = validateItemId(id, options);
    // 個数は u16。正規範囲を超えていても位置の異常とはみなさず、入力時にモードで制限する。
    // 上級者モードでは u16 の上限まで書けるので、モードに依存しない上限で読み取り専用にすると、書いた値が編集できなくなる。
    const warnings: string[] = [];
    if (id !== EMPTY_ID) {
      if (item && count > area.normalCountMax(item)) {
        const max = area.normalCountMax(item);
        warnings.push(tr({
          ja: `個数が最大数 ${max} を超えています（上級者モードでだけ書けます）`,
          en: `The quantity is over the maximum of ${max} (only writable in Advanced mode)`,
        }));
      }
      if (count === 0) warnings.push(tr({ ja: "個数が 0 です", en: "The quantity is 0" }));
      if (item && item.kind !== 0) warnings.push(tr(KIND_CAUTION[item.kind]));
      if (!hasItemMark(bytes, area, index)) warnings.push(tr(MISSING_MARK_WARNING));
      if (idProblem) warnings.push(tr({ ja: `${idProblem}。ほかの値に変更できます`, en: `${idProblem}. You can change it to another value` }));
    }

    slots.push({
      index,
      offset,
      id,
      count,
      label: itemLabel(id),
      problem: layoutProblem,
      idWritable: idProblem === null,
      warnings,
    });
  }
  return { warnings: [], problem: layoutProblem, slots };
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
  options: EditOpts = NORMAL_EDIT_OPTS,
): void {
  assertWritable(bytes);
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
  assertWritable(bytes);
  const targets = slotsMissingMark(bytes, area);
  for (const i of targets) writeU32(bytes, itemBoxSlotOffset(area, i) + ITEM_MARK_OFFSET, ITEM_MARK);
  return targets;
}
