// 勢力ごとの記録（3×3 表）。出典：docs/save_format/chunks/factions（README、reserch/2026-10-05_faction-table.md・2026-10-05_faction-run.md。[U] 2026-10-05 のシナリオ差分）。
//
// 差分からの推定。行0・行1 は、書き換えると大寄せの結果が変わることを確認した（✅ [U] 2026-10-05、下の「剣術大会以後のルート分岐」）。
// 行2 も書き換えでイベントの反応が変わることを確認した（✅ [U] 2026-10-05）。0x3780〜0x3788 の u8 × 9 を
// 3列（勢力）× 3行 に並べる。列の並び（幕府・外国・攘夷）は、3勢力のイベントの成功で各列の行0 が立ったことによる。
// Wiki の「イベントに参加・成功で友好ポイント1、不利益を与えたり敵対行為を働いた勢力は −1」に合わせ、友好度＝行0 − 行1 と読む（[U] 2026-10-05）。
//   行0（0x3780〜）友好ポイント1 の回数（参加・成功）  志士との出会い・海兵隊の横暴・代官所潜入で攘夷が 1→2→3、阿片密売で幕府、辻斬りで外国。
//                                                   阿片密売は、密売人を斬っても（大成功 1500文）見逃しても（成功 500文）+1（02・02 copy 2）
//   行1（0x3783〜）対立ポイント1 の回数（不利益・敵対行為）  海兵隊の横暴で赤城と戦う→攘夷、阿片密売で密売人を斬る→外国、
//                                                   阿片密売の導入で幕府勢力を斬る→幕府（イベントは失敗 05、02 copy）、剣術大会の準備で赤城・小暮と戦う→攘夷 1→2
//   行2（0x3786〜）今その勢力と敵対しているか（0／1 の bool）。✅ [U] 2026-10-05：攘夷を 1 に書き換えると、
//                   売国奴を斬れで門前払いされ、ほかのイベントでは「直前に敵対行為を取った」ときの選択肢が出た。
//                   そこで謝罪してイベントを成功させると、行2 が 0 に戻り、行0 が +1 された。
//                   敵対行為で 1 になることが多いが、剣術大会の準備（攘夷と戦った）では立たず、代官所潜入では行1 なしで立った。
//                   友好度を下げるか（行1）と敵対状態にするか（行2）は、イベントの場面ごとに別々に決まる（🟢）。
//                   会話で断ったときの失敗は行2 だけ、戦闘からの逃走・人物を倒したときは行1 も増えることが多い（🟢）。
//                   剣術大会以後のルート分岐には使われない（1・5 でも入れた）
//                   三姉妹見参の成功・ローラ奪還で3勢力とも 0、武人 琴吹光の開始で幕府・外国が 0（🟢）。
//                   🔶 代官所潜入で見張りに見つかると幕府の行1 +1・行2 = 1（🟢）だが、上の差分では行1 が増えていない。要ゲーム内確認
//   阿弥浜港争乱の結末（🟢）：3連勝→行2 すべて 0。般若党4人に手間取る・琴吹に助太刀→攘夷の行1 +1・行2 = 1。
//                   「犬は好かん」→幕府・外国の行1 +1・行2 = 1。
//   魔鱗組の力：攘夷の行0 − 行1 ≥ 3 のときだけ寝返りの選択肢が出る（🟢）
//
// 剣術大会以後のルート分岐（0x3789〜0x378C）：大寄せ（添字41）のときに書かれる。3回の観察（03 copy 9・04 copy 11・04 copy 12）
//   0x3789〜0x378B 勢力ごと（幕府・外国・攘夷）。00 大寄せ前、01 ルートに入れる、02 入れない
//   0x378C         00 どれかの勢力に入れる、01 無所属（根無し草）
//   ✅ [U] 2026-10-05：大寄せのあとに判定を書き換えると、ルートが変わった。
//   ただし 0x378C が 01 でも、どれかの勢力が 01 だと根無し草にはならない（勢力の 01 が優先）。
//   04 copy 12：幕府の行0 が 3（剣術大会の準備に参加）で 01 02 02 00、チャートに公儀の剣が出た（[U] 2026-10-05）。
//   04 copy 11：幕府の行0 が 2 で 02 02 02 01、公儀の剣は出なかった。
//   ✅ [U] 2026-10-05：大寄せの直前に表を書き換えて試した結果（行0, 行1, 行2 → ルート）
//     3,0,0 → 入れる ／ 3,1,0 → 入れない ／ 4,1,0 → 入れる ／ 3,0,1 → 入れる ／ 3,0,5 → 入れる
//   → **行0 − 行1 ≥ 3 でルートに入れる**。行2（敵対状態）は判定に使われない（ROUTE_THRESHOLD・routeEligible）
//   🟢 幕府は加えて茂呂（0x3752）≠ 1（死亡でない）が要る。3勢力とも 02 なら 0x378C = 01（predictRouteJudge）
//   🟢 大寄せのあと：公儀の剣を引き受ける→外国・攘夷 02、東国の騎士→幕府・攘夷 02、志士の刀→幕府・外国 02。
//      相手に斬りかかって戦闘になると自分の勢力が 02。最後通告に逆らうと 0x3789〜0x378B すべて 02（0x37A8 = 1）
//
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { validateRange, warningsOf, type EditOpts, type ViewStatus } from "./field";
import { tr } from "@/lib/i18n";
import {
  defineLocalized,
  flagValues,
  localizedFlag,
  localizedStrings,
  validateFlag,
  writeFlag,
  type ByteFlag,
  type FlagValue,
} from "./flags/byte-flag";
import { CHARACTER_STATUS, CHARACTER_DEAD } from "./flags/characters";
import { assertWritable, checkLayout } from "./layout";

export const FACTION_TABLE_OFFSET = 0x3780; // 🔶 chunks/factions

/** 勢力の名前。要素は読むたびに今の言語で返す */
export const FACTIONS = localizedStrings([
  { ja: "幕府", en: "Shogunate" },
  { ja: "外国", en: "Foreigners" },
  { ja: "攘夷", en: "Prajnas" },
]);

/** 行の見出しと説明。読むたびに今の言語で返す */
export const FACTION_ROWS: readonly { label: string; note: string }[] = (
  [
    {
      label: { ja: "友好ポイント（協力・成功）", en: "Friendship points (cooperation, success)" },
      note: {
        ja: "その勢力のイベントに参加・成功するたびに +1。友好度＝この値 − 下の「対立ポイント」",
        en: "+1 each time you take part in or succeed at an event for that faction. Friendship = this value − \"Hostility points\" below",
      },
    },
    {
      label: { ja: "対立ポイント（不利益・敵対行為）", en: "Hostility points (harm, hostile acts)" },
      note: {
        ja: "その勢力の人物と戦う・斬る・戦闘から逃げるなど、不利益を与えるたびに +1（場面によっては +3）。会話で断っただけの失敗では増えない。剣術大会以後のルート分岐では上の値から引かれる",
        en: "+1 (+3 in some scenes) each time you harm the faction, such as fighting or cutting down its people or fleeing from a battle. Simply refusing in conversation doesn't add to it. Subtracted from the value above for the route split after the Battle Tournament",
      },
    },
    {
      label: { ja: "敵対状態", en: "Hostile" },
      note: {
        ja: "敵対中だと、その勢力のイベントで門前払いされたり、謝罪の選択肢が出たりする。謝罪して成功させるとなしに戻る。三姉妹見参の成功・ローラ奪還で3勢力ともなしに戻る。剣術大会以後のルート分岐には使われない",
        en: "While hostile, you get turned away at that faction's events or are offered the option to apologize. Apologizing and succeeding clears it. Success of Meeting with the Three Sisters and Rescuing Laura clear it for all three factions. Not used for the route split after the Battle Tournament",
      },
    },
  ] as const
).map((r) => {
  const out = {} as { label: string; note: string };
  defineLocalized(out, "label", r.label);
  defineLocalized(out, "note", r.note);
  return out;
});

/** 敵対状態の行（行2）。値は 0 か 1（✅ [U]） */
export const HOSTILE_ROW = 2;
export const HOSTILE_VALUES: readonly FlagValue[] = flagValues([
  { value: 0, label: { ja: "なし", en: "None" } },
  { value: 1, label: { ja: "敵対中", en: "Hostile" } },
]);

/**
 * 値の範囲。🔶 正規の範囲は推測：行0 は1〜3日目の各勢力のイベント数（3日×3枠）の 9 まで。行1 も同じく 9 まで。
 * 行2（敵対状態）は通常モードでは 0・1 だけ。
 * 読み込み時に妥当とみなす上限（PLAUSIBLE_MAX）を超えたら、位置がずれているとみなして読み取り専用にする
 */
export const FACTION_VALUE_MAX = { normal: 9, system: 0xff } as const;
const PLAUSIBLE_MAX = 50;

export function factionOffset(row: number, col: number): number {
  if (!Number.isInteger(row) || row < 0 || row >= FACTION_ROWS.length)
    throw new RangeError(tr({ ja: `行が範囲外です: ${row}`, en: `Row out of range: ${row}` }));
  if (!Number.isInteger(col) || col < 0 || col >= FACTIONS.length)
    throw new RangeError(tr({ ja: `列が範囲外です: ${col}`, en: `Column out of range: ${col}` }));
  return FACTION_TABLE_OFFSET + row * FACTIONS.length + col;
}

export type FactionsView = ViewStatus & {
  /** values[行][列] */
  values: number[][];
  /** 茂呂の状態（0x3752）。大寄せで幕府ルートに入れるかの判定に使う（🟢） */
  moro: number;
};

export function readFactions(bytes: Uint8Array): FactionsView {
  if (bytes.byteLength < FACTION_TABLE_OFFSET + 9)
    throw new RangeError(
      tr({ ja: "ファイルが小さすぎて勢力の記録を読めません", en: "The file is too small to read the faction records" }),
    );
  const layoutProblem = checkLayout(bytes);
  const values = FACTION_ROWS.map((_, r) =>
    FACTIONS.map((_, c) => readU8(bytes, factionOffset(r, c))),
  );
  const max = Math.max(...values.flat());
  const problem =
    max > PLAUSIBLE_MAX
      ? tr({
          ja: "値が大きすぎます。位置がずれている可能性があります",
          en: "The values are too large. The data may be misaligned",
        })
      : null;
  const moro = readU8(bytes, MORO_OFFSET);
  return { warnings: [], values, moro, problem: layoutProblem ?? problem };
}

/** 勢力 col の敵対状態（行2）。表にある 0・1 だけを通す ByteFlag */
export function hostileFlag(col: number): ByteFlag {
  return localizedFlag({ offset: factionOffset(HOSTILE_ROW, col), label: () => FACTIONS[col], values: HOSTILE_VALUES });
}

/** 行2（敵対状態）は hostileFlag と同じ検証。それ以外の行は通常モード 0〜9、上級者モード 0〜255 */
export function validateFactionValue(
  value: number,
  opts: EditOpts,
  row = 0,
  col = 0,
): string | null {
  if (row === HOSTILE_ROW) return validateFlag(hostileFlag(col), value, opts);
  return validateRange(
    value,
    { systemMax: FACTION_VALUE_MAX.system, normalMax: FACTION_VALUE_MAX.normal },
    opts,
  );
}

/** 大寄せでルートに入れる友好度（行0 − 行1）の下限。✅ [U] 書き換えで5通り試した */
export const ROUTE_THRESHOLD = 3;

/** ✅ 友好度の差、🟢 幕府の生死条件を合わせた判定。 */
export function factionRouteStatus(view: FactionsView, col: number) {
  return {
    eligible: routeEligible(view.values, col, view.moro),
    friendly: view.values[0][col], opposed: view.values[1][col],
    affinity: view.values[0][col] - view.values[1][col],
    moroDead: col === 0 && view.moro === MORO_DEAD,
  };
}

/** 茂呂の状態（chunks/characters）。1＝死亡のとき大寄せで幕府ルートに入れない（🟢） */
export const MORO_OFFSET = CHARACTER_STATUS.moro.offset;
export const MORO_DEAD = CHARACTER_DEAD;

/**
 * 勢力 col（0〜2）が大寄せでルートに入れるか。values は readFactions の values（行0−行1 ≥ 3 ✅ [U]）。
 * 🟢 幕府（col 0）は加えて茂呂（moro、0x3752）が 1（死亡）でないこと
 */
export function routeEligible(
  values: readonly (readonly number[])[],
  col: number,
  moro = 0,
): boolean {
  if (col === 0 && moro === MORO_DEAD) return false;
  return values[0][col] - values[1][col] >= ROUTE_THRESHOLD;
}

/** 🟢 大寄せで書かれる値の予測。勢力ごとに 01／02、3勢力とも 02 なら無所属 01 */
export function predictRouteJudge(
  values: readonly (readonly number[])[],
  moro: number,
): { judges: number[]; none: number } {
  const judges = FACTIONS.map((_, c) => (routeEligible(values, c, moro) ? 0x01 : 0x02));
  return { judges, none: judges.every((j) => j === 0x02) ? 0x01 : 0x00 };
}

export const ROUTE_JUDGE_OFFSET = 0x3789; // ✅ [U] chunks/factions 剣術大会以後のルート分岐（勢力ごと 3 B）
export const ROUTE_NONE_OFFSET = 0x378c; // ✅ [U] chunks/factions 無所属
export const ROUTE_JUDGE_VALUES: readonly FlagValue[] = flagValues([
  { value: 0x00, label: { ja: "大寄せ前", en: "Before The Chief Minister's Big Move" } },
  { value: 0x01, label: { ja: "ルートに入れる", en: "Can enter the route" } },
  { value: 0x02, label: { ja: "入れない", en: "Can't enter" } },
]);
export const ROUTE_NONE_VALUES: readonly FlagValue[] = flagValues([
  { value: 0x00, label: { ja: "勢力あり／大寄せ前", en: "Has a faction / before The Chief Minister's Big Move" } },
  { value: 0x01, label: { ja: "根無し草", en: "Idle Chatter" } },
]);

/** ✅ [U] 勢力3つと無所属のルート分岐。 */
export const ROUTE_JUDGE_FLAGS: readonly ByteFlag[] = [
  ...FACTIONS.map((_, col) =>
    localizedFlag({ offset: ROUTE_JUDGE_OFFSET + col, label: () => FACTIONS[col], values: ROUTE_JUDGE_VALUES }),
  ),
  localizedFlag({ offset: ROUTE_NONE_OFFSET, label: { ja: "無所属", en: "Independent" }, values: ROUTE_NONE_VALUES }),
];

/** warnings は、無所属が 01 でも効かない組み合わせのとき */
export type RouteJudgeView = ViewStatus & {
  /** 幕府・外国・攘夷の順 */
  judges: number[];
  none: number;
};

export function readRouteJudge(bytes: Uint8Array): RouteJudgeView {
  if (bytes.byteLength < ROUTE_NONE_OFFSET + 1)
    throw new RangeError(
      tr({
        ja: "ファイルが小さすぎて剣術大会以後のルート分岐を読めません",
        en: "The file is too small to read the route split after the Battle Tournament",
      }),
    );
  const layoutProblem = checkLayout(bytes);
  const judges = FACTIONS.map((_, c) => readU8(bytes, ROUTE_JUDGE_OFFSET + c));
  const none = readU8(bytes, ROUTE_NONE_OFFSET);
  const known = (list: readonly { value: number }[], v: number) => list.some((x) => x.value === v);
  let problem: string | null = null;
  if (!judges.every((v) => known(ROUTE_JUDGE_VALUES, v)) || !known(ROUTE_NONE_VALUES, none))
    problem = tr({
      ja: "剣術大会以後のルート分岐が想定外の状態になっています",
      en: "The route split after the Battle Tournament is in an unexpected state",
    });
  // ✅ [U] 勢力の 01 が無所属より優先される
  const warning =
    none === 0x01 && judges.includes(0x01)
      ? tr({
          ja: "勢力のどれかが「ルートに入れる」なので、無所属（根無し草）にはなりません",
          en: "One of the factions is set to \"Can enter the route\", so you won't become independent (Idle Chatter)",
        })
      : null;
  return { judges, none, problem: layoutProblem ?? problem, warnings: warningsOf(warning) };
}

/**
 * 剣術大会以後のルート分岐の1バイトを書く。col は 0〜2（勢力）、3 は無所属の 0x378C。✅ [U] 書き換えでルートが変わる。
 * 通常モードでは見た値（判定 00〜02、無所属 00・01）だけ。上級者モードでは任意の u8
 */
export function writeRouteJudge(
  bytes: Uint8Array,
  col: number,
  value: number,
  opts: EditOpts,
): void {
  assertWritable(bytes);
  const view = readRouteJudge(bytes);
  if (view.problem) throw new RangeError(view.problem);
  if (!Number.isInteger(col) || col < 0 || col > FACTIONS.length)
    throw new RangeError(tr({ ja: `列が範囲外です: ${col}`, en: `Column out of range: ${col}` }));
  writeFlag(bytes, ROUTE_JUDGE_FLAGS[col], value, opts);
}

/** 1マス（1バイト）だけを書く。✅ [U] 3行とも書き換えがゲームに効くことを確認 */
export function writeFactionValue(
  bytes: Uint8Array,
  row: number,
  col: number,
  value: number,
  opts: EditOpts,
): void {
  assertWritable(bytes);
  const view = readFactions(bytes);
  if (view.problem) throw new RangeError(view.problem);
  const offset = factionOffset(row, col);
  const problem = validateFactionValue(value, opts, row, col);
  if (problem) throw new RangeError(problem);
  writeU8(bytes, offset, value);
}
