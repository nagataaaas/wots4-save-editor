// 道具（手持ちの通常アイテム）。出典：解析ノート §3.2（[TS] の `CarriedItems`）、§4・§4.2（✅ [TS][I-3]）、
// 付録A D-11（手持ち 0x5B40、8 B × 10件。PS3 の値とも一致）。
//
// ❓ U-1（固定オフセットで扱えるか）が判定待ちのため、[TS] の固定オフセット（案A）を使い、
// 次の2段階の妥当性検証を通った枠だけを編集可能にする（check-diff.md U-1「採用までの扱い」）。
//   1. ファイルサイズが [TS] の構造体サイズ 0x48BB0 と一致する（案A の条件）
//   2. 各枠の ID が既知の一覧にあり、個数が妥当な範囲にある
//
// 枠の構造（8 B）と書き込み方は重要品と共通（item-slot.ts）。
// ただし道具は +0x04 の1バイトに 0x06 が必要（TOOL_MARK。重要品では未確認）。
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
import { formatHex4 } from "@/lib/format";

export const TOOLS_OFFSET = 0x5b40; // ✅ [TS][I-3]（D-11）
export const TOOL_SLOT_COUNT = 10;

/**
 * 道具の1枠の個数。ゲームは道具を枠にまとめない（1枠1個）ので、エディタは常に 1 を書く。
 * 🔶 根拠 [U]（2026-10-05、sample/S4-DATA_04）：店で買った砥石が別々の2枠に個数 1 ずつ入っていた。
 * 普通に手に入れた道具はすべて個数 1（S4-DATA_03-1、S4-DATA_04）。2 以上がゲームで読めるかは未確認。
 */
export const TOOL_COUNT = 1;

/**
 * 道具の入った枠の +0x04（u8）に入っている値。意味は ❓ 不明だが、これがないとゲームが落ちる [U]（2026-10-05、sample/S4-DATA_03-*）。
 * - 普通に手に入れた道具4件は、すべて +0x04＝0x06（S4-DATA_03-1、S4-DATA_04）
 * - 空き枠におにぎりを入れて +0x04〜+0x07 が 00 00 00 00 のままだと、店で売却一覧を開くときに
 *   「ShoSell.cpp, Expression: pItemList, message: Pointer is NULL」で落ちた（-4）
 * - 同じ枠を 06 EE E8 50（-5）、06 00 00 00（-7）にすると開けた。01 00 00 00（-6）、00 EE E8 50（-8）では落ちた
 * +0x05〜+0x07 は枠ごとに違う値（🔶 取得時刻のようなものと推測）で、0 でも一覧は開いた（-7）。
 */
export const TOOL_MARK = 0x06;
const TOOL_MARK_OFFSET = 4;

/**
 * ✅ [TS] に名前付きで定義されている通常アイテム（§4.2、wos4_id_table.csv の出典が TS のもの）。
 * PS3版の一覧（0x08 阿修羅きのこ、0x09 秘薬、0x0C 秘奥義ノ書、0x22 白紙目録、0x74 コイン）とも一致する。
 */
export const TS_TOOLS: readonly ItemOption[] = [
  { id: 0x0002, label: "おにぎり" },
  { id: 0x0003, label: "腐ったおにぎり" },
  { id: 0x0004, label: "干物" },
  { id: 0x0005, label: "ひよこういろう" },
  { id: 0x0006, label: "きのこ" },
  { id: 0x0007, label: "毒きのこ" },
  { id: 0x0008, label: "阿修羅きのこ" },
  { id: 0x0009, label: "秘薬" },
  { id: 0x000a, label: "技ノ書" },
  { id: 0x000b, label: "奥義ノ書" },
  { id: 0x000c, label: "秘奥義ノ書" },
  { id: 0x0010, label: "砥石" },
  { id: 0x0011, label: "打ち粉" },
  { id: 0x0012, label: "酒" },
  { id: 0x0013, label: "刀油" },
  { id: 0x001a, label: "大根" },
  { id: 0x001d, label: "人参" },
  { id: 0x001e, label: "鬼辛子" },
  { id: 0x001f, label: "たまご" },
  { id: 0x0022, label: "白紙目録" },
  { id: 0x0023, label: "梅干し(大)" },
  { id: 0x0024, label: "梅干し" },
  { id: 0x0025, label: "梅酒" },
  { id: 0x0026, label: "チョコレート" },
  { id: 0x0027, label: "空き瓶" },
  { id: 0x0028, label: "ワイン" },
  { id: 0x0040, label: "ソーダ水" },
  { id: 0x0050, label: "シロギス" },
  { id: 0x0052, label: "ボラ" },
  { id: 0x0053, label: "マサバ" },
  { id: 0x0055, label: "カツオ" },
  { id: 0x0057, label: "メバル" },
  { id: 0x0058, label: "カサゴ" },
  { id: 0x0059, label: "アジ" },
  { id: 0x005a, label: "ヤマメ" },
  { id: 0x005b, label: "マダイ" },
  { id: 0x005c, label: "タコ" },
  { id: 0x005d, label: "ニホンザリガニ" },
  { id: 0x005e, label: "アカヒトデ" },
  { id: 0x005f, label: "伝説の魚（小、売却用）" },
  { id: 0x0063, label: "錆びた空き缶" },
  { id: 0x0064, label: "長靴" },
  { id: 0x0065, label: "藁人形" },
  { id: 0x0067, label: "おにぎり(梅)" },
  { id: 0x0068, label: "おにぎり(鮭)" },
  { id: 0x0069, label: "おにぎり(高菜)" },
  { id: 0x006d, label: "極上ワイン" },
  { id: 0x006e, label: "ビンテージワイン" },
  { id: 0x0074, label: "コイン" },
  { id: 0x00c4, label: "ミミズ" },
  { id: 0x00c5, label: "ゴカイ" },
  { id: 0x00c6, label: "オキアミ" },
  { id: 0x00c7, label: "エビ" },
  { id: 0x00c8, label: "小魚" },
  { id: 0x00c9, label: "疑似餌" },
  { id: 0x00ca, label: "ねりエサ" },
  { id: 0x00cb, label: "もち" },
  { id: 0x00cc, label: "力ミミズ" },
];

const PROBED_CAUTION =
  "重要品の枠でだけ名前を確認した ID です（U-14）。手持ちで使えるかは要ゲーム内確認です";
const SHOWN_CAUTION = "道具の一覧に出ることは確認済みです（U-14）。使えるかは要ゲーム内確認です";

/** 道具の枠でも名前の表示を確認した ID（[U] 2026-10-05） */
const SHOWN_IN_TOOLS = new Set([0x01, 0x0d, 0x0e, 0x0f, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19]);

/**
 * 🔶 U-14 の調査で、重要品の枠に書いてゲーム内の一覧に名前が出た通常アイテム（[U] 2026-10-04、2026-10-05）。
 * 名前は確認済みだが、手持ちの枠に入れて使えるかは未確認（要ゲーム内確認）。選択肢には出し、警告を付ける。
 * 宿泊設備（0x6F〜0x72）・仮データの茶器（0x73 以降）・丼（0x49、未実装と推測）・開発用（0xCD〜0xD6）・
 * 会談の手紙（0x00、重要品）は通常アイテムではないので含めない。
 * 0x01、0x0D〜0x0F、0x14〜0x19 は道具の枠でも名前の表示を確認した（[U] 2026-10-05。valuables.ts の7回目の訂正）。
 */
export const PROBED_TOOLS: readonly ItemOption[] = (
  [
    [0x0001, "伯爵の寿司"],
    [0x000d, "部品箱（刃？）"],
    [0x000e, "部品箱（鍔？）"],
    [0x000f, "部品箱（柄？）"],
    [0x0014, "お金袋（小）"],
    [0x0015, "お金袋（中）"],
    [0x0016, "お金袋（大）"],
    [0x0017, "お金袋（特大）"],
    [0x0018, "がらくた"],
    [0x0019, "お宝"],
    [0x001b, "百両箱"],
    [0x001c, "茶器"],
    [0x0020, "プリセット目録"],
    [0x0021, "俺流目録"],
    [0x002f, "チラシ"],
    [0x0030, "うなぎ丼"],
    [0x0031, "天丼"],
    [0x0032, "鉄火丼"],
    [0x0033, "熱燗"],
    [0x0034, "ししゃも"],
    [0x0035, "野沢菜"],
    [0x0036, "里芋のにっころがし"],
    [0x0037, "刺身の盛り合わせ"],
    [0x0038, "マグロ"],
    [0x0039, "アナゴ"],
    [0x003a, "海老"],
    [0x003b, "玉子"],
    [0x003c, "三色団子"],
    [0x003d, "あんころもち"],
    [0x003e, "ビッグステーキ"],
    [0x003f, "骨付き肉"],
    [0x0041, "鮎の塩焼き"],
    [0x0042, "南蛮炒め蕎麦"],
    [0x0043, "かけそば"],
    [0x0044, "きつねそば"],
    [0x0045, "たぬきそば"],
    [0x0046, "月見そば"],
    [0x0047, "お茶づけ"],
    [0x0048, "冷や"],
    [0x004a, "かけうどん"],
    [0x004b, "きつねうどん"],
    [0x004c, "たぬきうどん"],
    [0x004d, "月見うどん"],
    [0x004e, "饅頭"],
    [0x004f, "箸"],
    [0x0051, "アナゴ（魚）"],
    [0x0054, "コイ"],
    [0x0056, "ハゼ"],
    [0x0060, "伝説の魚（中、売却用）"],
    [0x0061, "伝説の魚（大、売却用）"],
    [0x0062, "空き缶"],
    [0x0066, "ウニ"],
    [0x006a, "おにぎり(昆布)"],
    [0x006b, "朱美のにっころがし"],
    [0x006c, "秘蔵の熱燗"],
  ] as const
).map(([id, label]) => ({
  id,
  label,
  caution: SHOWN_IN_TOOLS.has(id) ? SHOWN_CAUTION : PROBED_CAUTION,
}));

export const TOOL_OPTION_GROUPS: readonly ItemOptionGroup[] = [
  { items: TS_TOOLS },
  { label: "🔶 手持ちでは未確認（U-14）", items: PROBED_TOOLS },
];

const ALL_TOOLS: readonly ItemOption[] = [...TS_TOOLS, ...PROBED_TOOLS];

export function findTool(id: number): ItemOption | undefined {
  return ALL_TOOLS.find((t) => t.id === id);
}

export function toolLabel(id: number): string | null {
  if (id === EMPTY_ID) return "なし";
  return findTool(id)?.label ?? null;
}

/** 書き込める ID。選択肢にある道具か、なし */
export function validateToolId(id: number): string | null {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff) return `ID は 0x0000〜0xFFFF です（${id}）`;
  if (id === EMPTY_ID || findTool(id)) return null;
  return `道具の一覧にない ID です（${formatHex4(id)}）`;
}

export type ToolsView = {
  layoutProblem: string | null;
  slots: ItemSlot[];
};

export function toolSlotOffset(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= TOOL_SLOT_COUNT) {
    throw new RangeError(`道具の枠番号が範囲外です: ${index}`);
  }
  return TOOLS_OFFSET + index * ITEM_SLOT_BYTES;
}

export function readTools(bytes: Uint8Array): ToolsView {
  const end = TOOLS_OFFSET + ITEM_SLOT_BYTES * TOOL_SLOT_COUNT;
  if (bytes.byteLength < end) throw new RangeError("ファイルが小さすぎて道具を読めません");
  const layoutProblem = checkLayout(bytes);

  const slots: ItemSlot[] = [];
  for (let index = 0; index < TOOL_SLOT_COUNT; index++) {
    const { offset, id, count, unknown } = readItemSlotRaw(bytes, toolSlotOffset(index));

    const idProblem = validateToolId(id);
    let problem: string | null = null;
    if (!idProblem && id !== EMPTY_ID && count > ITEM_COUNT_MAX) {
      problem = `個数が大きすぎます（${count}）。位置がずれている可能性があります`;
    }

    // 同じ道具が複数の枠にあるのは普通（TOOL_COUNT）なので、重要品と違って警告しない
    let warning: string | null = null;
    if (id !== EMPTY_ID) {
      // 🔶 TOOL_COUNT：1枠1個。画面に個数の欄がないので、1 以外は警告で知らせる
      if (count !== TOOL_COUNT) warning = `個数が ${count} です（🔶 ゲームでは1枠1個）。別の道具を選ぶと 1 になります`;
      const caution = findTool(id)?.caution;
      if (caution) warning = caution;
      if (!hasToolMark(bytes, index)) warning = MISSING_MARK_WARNING;
      if (idProblem)
        warning = `${idProblem}。ゲーム内の表示を確認するか、ほかの値に変更してください`;
    }

    slots.push({
      index,
      offset,
      id,
      count,
      unknown,
      label: toolLabel(id),
      problem: layoutProblem ?? problem,
      idWritable: idProblem === null,
      warning,
    });
  }
  return { layoutProblem, slots };
}

const MISSING_MARK_WARNING = `+0x04 が 0x06 ではありません。このままだと店の売却一覧を開くときにゲームが落ちます（[U]）。「修復」で直せます`;

function hasToolMark(bytes: Uint8Array, index: number): boolean {
  return readU8(bytes, toolSlotOffset(index) + TOOL_MARK_OFFSET) === TOOL_MARK;
}

/** 道具が入っているのに +0x04 が 0x06 でない枠の番号 */
export function slotsMissingMark(bytes: Uint8Array): number[] {
  const out: number[] = [];
  for (const slot of readTools(bytes).slots) {
    if (slot.id !== EMPTY_ID && !slot.problem && !hasToolMark(bytes, slot.index)) out.push(slot.index);
  }
  return out;
}

// 書き込み。呼び出し側で妥当性検証を通した枠に対してだけ使う。
// 不正な値は例外にして、バイト列を変えない。

/**
 * 枠の ID と個数（+0x00〜+0x03）を書く。個数は道具なら TOOL_COUNT（1 🔶）、「なし」なら 0。
 * +0x04〜+0x07 は次のようにする。
 * - 道具を入れるとき：+0x04 が既に 0x06 なら変えない（+0x05〜+0x07 の値を保つ）。
 *   0x06 でなければ 06 00 00 00 を書く（[U] -7 で売却一覧が開くことを確認した値）
 * - 「なし」にするとき：00 00 00 00 を書く（普通の空き枠はすべてこの値 [U]。S4-DATA_03-1、S4-DATA_04）
 */
export function writeTool(bytes: Uint8Array, index: number, id: number): void {
  const offset = toolSlotOffset(index);
  const idProblem = validateToolId(id);
  if (idProblem) throw new RangeError(idProblem);
  writeItemSlotRaw(bytes, offset, id, id === EMPTY_ID ? 0 : TOOL_COUNT);
  if (id === EMPTY_ID) writeU32(bytes, offset + TOOL_MARK_OFFSET, 0);
  else if (!hasToolMark(bytes, index)) writeU32(bytes, offset + TOOL_MARK_OFFSET, TOOL_MARK);
}

/** 道具が入っているのに +0x04 が 0x06 でない枠に 06 00 00 00 を書く。直した枠の番号を返す */
export function repairToolMarks(bytes: Uint8Array): number[] {
  const view = readTools(bytes);
  if (view.layoutProblem) throw new RangeError(view.layoutProblem);
  const targets = slotsMissingMark(bytes);
  for (const i of targets) writeU32(bytes, toolSlotOffset(i) + TOOL_MARK_OFFSET, TOOL_MARK);
  return targets;
}
