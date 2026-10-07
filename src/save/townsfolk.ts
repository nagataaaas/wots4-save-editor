// 町の人（店主など）の状態の候補 0x011C〜0x05FF（1,252 B）を、生の値で編集する。出典：docs/save_format/chunks/townsfolk（[U] 2026-10-06）。
// 🟢 始まりは 0x011C（直前の 0x00DC〜0x011B は主人公名。hero.ts が UTF-16LE として扱うので、ここでは触らない）。
//    0x011C〜 は「なりわいのフラグ」の配列（0x011C + 番号）。0x0120（番号 4、同心の続き物）は書き換えで確認（✅ 2026-10-07）。
//    続き物などの番号（4〜9・25〜31）は OCCUPATION_FLAG_NOTES に値の表を持ち、なりわいの画面で編集する（4 以外は 🟢）。
// 🔶 終わりの位置は未確定。当初は 0x04BF までとしていたが、さよ（0x0528）が見つかったので 0x05FF まで広げた。
// 0x04C0〜0x0B2F は、手元のサンプルでは 0x0528 以外すべて 0（0x0B30 以降は float やカウンタ）。
//
// ほとんど 0 の u8 の並びで、ところどころに 0 以外がある。🔶 町の人ごとの状態・イベントの進み具合の表と考えている
// （「店主の生死や好感度は周回ごとにリセットされる」chunks/townsfolk）。1人あたりのバイト数・並び順は ❓。
//
//   0x0127  ✅ [U] 2026-10-06 鍛冶屋の後継者イベントと鍛冶屋の状態（SMITH_STATES。書き換えで確認）。
//              差分では踏み倒しで 0 → 0x6E（110）（S4-DATA_02 copy 2 → copy 3）。S4-DATA_03 は 1（❓ 表にない値）
//   0x0132  ✅ [U] 2026-10-06 堂島が鍛冶屋を継いだフラグ。0x0127 が 70（堂島の説得に成功）になると 1 になる。
//              0 のまま周回すると、0x0127 が 81 でも鍛冶屋はおやじに戻った。1 にして周回すると堂島の鍛冶屋になった
//   0x0264  ✅ [U] 2026-10-06 堂島の死亡フラグ（1）
//   0x02C4  ✅ 寿司屋の店主。0 → 1 で死亡（sample/S4-DATA_02 copy 4 → copy 5）。[U] 2026-10-06：0 に戻すと生き返った
//   0x0444  ✅ 鍛冶屋のおやじ（堂島ではない）。0 → 1 で死亡（S4-DATA_02 copy 3 → copy 4）。[U] 2026-10-06：0 に戻すと生き返った。
//              S4-DATA_03 も 1
//   0x0528  🔶 さよ（DLC）の死亡フラグ。なりわい「おにぎり屋の用心棒」で殺害すると 0 → 1（S4-DATA_03 copy 5 → 04。
//              生存させた 03 copy 6 は 0）。さよであることは [U] 2026-10-06 のユーザー判断。差分1回で、
//              0 に戻して生き返るかは未確認（要ゲーム内確認）
//   0x0133  ❓ 海兵隊の横暴（居酒屋）で成否によらず 0 → 1（chunks/event-chart の調査記録）
//   ほかに 0x012C・0x0130・0x0131・0x01E0・0x0258 で 1 を見た（意味は ❓）
// 意味が分かるまで生の値の欄として出す（AGENTS.md「未確認データの扱い」）。0x0127 だけは値の表から選べる。
//
// ❓ U-1 判定待ちのため [TS] の固定オフセット（案A）の位置で読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { readU8, writeU8 } from "./binary";
import { checkLayout } from "./hero";

/** 🟢 主人公名（〜0x011B）の直後 */
export const TOWNSFOLK_START = 0x011c;
/** 🔶 終わりは未確定（上のコメント） */
export const TOWNSFOLK_END = 0x05ff;
export const TOWNSFOLK_LENGTH = TOWNSFOLK_END - TOWNSFOLK_START + 1;

/** 通常モードで新しく書ける上限。0／1 のフラグとして扱う（今の値と同じ値の書き戻しは許す） */
export const TOWNSFOLK_NORMAL_MAX = 1;

/** ✅ [U] 鍛冶屋の後継者イベントと鍛冶屋の状態 */
export const SMITH_STATE_OFFSET = 0x0127;

/** ✅ [U] 2026-10-06：0x0127 の値（書き換えで確認） */
export const SMITH_STATES: readonly { value: number; label: string; group: string }[] = [
  { value: 0, label: "未会話", group: "後継者イベント" },
  { value: 10, label: "「そろそろやめる」という会話を聞いた", group: "後継者イベント" },
  { value: 20, label: "堂島を探してくる", group: "後継者イベント" },
  { value: 30, label: "鍛冶屋を継げ → 堂島の意志は固かった", group: "後継者イベント" },
  { value: 40, label: "鍛冶屋の過去を知った", group: "後継者イベント" },
  { value: 50, label: "堂島が鍛冶屋を拒むわけを知った", group: "後継者イベント" },
  { value: 60, label: "もう一度、堂島を説得してみよう", group: "後継者イベント" },
  { value: 61, label: "堂島はおとなしくなった", group: "後継者イベント" },
  { value: 69, label: "夢があった（会話後）", group: "後継者イベント" },
  { value: 70, label: "堂島の説得に成功した（0x0132 が 1 になる）", group: "後継者イベント" },
  { value: 81, label: "堂島の鍛冶屋", group: "鍛冶屋の状態" },
  { value: 110, label: "鍛冶屋のおやじから踏み倒した", group: "鍛冶屋の状態" },
  { value: 119, label: "堂島から踏み倒した", group: "鍛冶屋の状態" },
  { value: 120, label: "堂島が死亡", group: "鍛冶屋の状態" },
];

export type TownsfolkValue = { value: number; label: string; group?: string };

export type TownsfolkNote = { name?: string; note: string; values?: readonly TownsfolkValue[] };

/** 🟢 なりわいのフラグ（0x011C + 番号、u8）の先頭。番号 31（0x013B）までは確認、配列の終わりは ❓ */
export const OCCUPATION_FLAG_START = 0x011c;

export function occupationFlagOffset(n: number): number {
  return OCCUPATION_FLAG_START + n;
}

/**
 * 続き物（番号 4〜7）の値。十の位が何件目か、一の位が 0＝依頼前・1＝依頼済み。100 で完了。
 * ✅ 番号 4（同心）は 20＝2件目から始まる・100＝完了を書き換えで確認（2026-10-07）。番号 5〜7 は 🟢。
 * 90・91・97・99 の細かい違いは ❓
 */
export const SERIES_VALUES: readonly TownsfolkValue[] = [
  { value: 0, label: "依頼主に会う前" },
  ...Array.from({ length: 8 }, (_, i) => [
    { value: (i + 1) * 10, label: `${i + 1}件目を依頼する前`, group: `${i + 1}件目` },
    { value: (i + 1) * 10 + 1, label: `${i + 1}件目を依頼済み`, group: `${i + 1}件目` },
  ]).flat(),
  ...[90, 91, 97, 99].map((value) => ({ value, label: "最後の件の前後", group: "最後の件" })),
  { value: 100, label: "続き物を終えた" },
];

/** 意味の分かっていない段階の値（🟢 値の候補だけ分かっている） */
const stepValues = (values: readonly number[]): TownsfolkValue[] =>
  values.map((value) => ({ value, label: value === 0 ? "始まる前（❓）" : `段階 ${value}` }));

/** 汁部（DLC）の 209〜212 の結果（🟢） */
const SHIRUBE_RESULT_VALUES: readonly TownsfolkValue[] = [
  { value: 0, label: "なし（破棄・話して消えた）" },
  { value: 1, label: "成功" },
  { value: 2, label: "失敗を成功扱いにしてもらった（報酬なし）" },
];

const SHIRUBE_JOBS = ["今宵の虎徹は", "薬売り", "食い逃げ外国人", "おにぎり屋の用心棒"] as const;

/**
 * なりわいのフラグのうち、なりわいの画面で扱う番号の説明（chunks/townsfolk「なりわいのフラグ」）。
 * 0x0120（番号 4）だけ ✅、ほかは 🟢。番号 2・16・20・21・23 は ❓ なので載せない
 */
export const OCCUPATION_FLAG_NOTES: Readonly<Record<number, TownsfolkNote>> = {
  [occupationFlagOffset(4)]: {
    name: "同心の続き物",
    note: "なりわい 171〜178。書き換えると同心の次の依頼が変わる（確認済み：20 で2件目「督促状」から、100 で完了）",
    values: SERIES_VALUES,
  },
  [occupationFlagOffset(5)]: { name: "極道の続き物", note: "🟢 なりわい 179〜186", values: SERIES_VALUES },
  [occupationFlagOffset(6)]: { name: "泥棒さんの続き物", note: "🟢 なりわい 187〜194", values: SERIES_VALUES },
  [occupationFlagOffset(7)]: { name: "おっつぁんの続き物", note: "🟢 なりわい 195〜206", values: SERIES_VALUES },
  [occupationFlagOffset(8)]: {
    name: "賭場の4件",
    note: "🟢 なりわい 163〜166 の進み具合。各段階の意味は ❓",
    values: stepValues([0, 10, 20, 30]),
  },
  [occupationFlagOffset(9)]: {
    name: "賭場の女将の依頼",
    note: "🟢 なりわい 167〜170・208 の進み具合。各段階の意味は ❓",
    values: stepValues([0, 1, 10, 20, 21]),
  },
  [occupationFlagOffset(25)]: {
    name: "四天王の話",
    note: "🟢 続き物4系統（同心・極道・泥棒さん・おっつぁん）のどれかを終えたとき、ほかの3つがすべて 100 なら 1 になる",
    values: [
      { value: 0, label: "始まる前" },
      { value: 1, label: "続き物4系統を全部終えた" },
      { value: 8, label: "「四天王の証」を受け取った" },
      { value: 99, label: "段階 99" },
      { value: 100, label: "段階 100" },
    ],
  },
  [occupationFlagOffset(26)]: {
    name: "最後のなりわい",
    note: "🟢 なりわい 207・208 の進み具合。99 以上で、続き物を終えた依頼主から8件を選び直せる（99 未満だと新しい依頼が出ないことは確認済み）",
    values: [
      ...stepValues([0, 10, 20]),
      { value: 99, label: "続き物を選び直せる" },
      { value: 100, label: "続き物を選び直せる（段階 100）" },
    ],
  },
  [occupationFlagOffset(27)]: {
    name: "汁部（DLC）と組んでいる",
    note: "🟢 人斬り 汁部理人と組むと 1。手を切ると 0（27〜31 がすべて 0 になる）",
    values: [
      { value: 0, label: "組んでいない" },
      { value: 1, label: "組んでいる" },
    ],
  },
  ...Object.fromEntries(
    SHIRUBE_JOBS.map((job, i) => [
      occupationFlagOffset(28 + i),
      {
        name: `汁部の「${job}」の結果`,
        note: `🟢 なりわい ${209 + i} を終えたときの結果。次に汁部と話すと 0 に戻る`,
        values: SHIRUBE_RESULT_VALUES,
      },
    ]),
  ),
};

/** なりわいの画面で扱うオフセット（町の人の状態の画面では入力欄を並べない） */
export const OCCUPATION_FLAG_OFFSETS: readonly number[] = Object.keys(OCCUPATION_FLAG_NOTES).map(Number);

/**
 * 汁部（DLC）のなりわいのフラグ 27〜31 を、なりわいの画面では1つの欄にまとめる（🟢）。
 * - 27：汁部と組んでいる。手を切ると 27〜31 がすべて 0 になる
 * - 28〜31：209〜212 を終えたときの結果（1 成功、2 失敗を成功扱い）。次に汁部と話すと 0 に戻るので、立つのはふつう1つだけ
 * 🔶 汁部は 209 → 212 の順に頼む続き物。ただし、どこまで進んだかはこのフラグではなく、なりわいごとの状態で決まる
 *    （その状態が周回をまたぐ記録 0x33A4〜 と同じものかは ❓）
 */
export const SHIRUBE_FLAG_OFFSETS: readonly number[] = [27, 28, 29, 30, 31].map(occupationFlagOffset);

export type ShirubeState = { key: string; label: string; group?: string; values: readonly number[] };

export const SHIRUBE_STATES: readonly ShirubeState[] = [
  { key: "none", label: "組んでいない", values: [0, 0, 0, 0, 0] },
  { key: "partner", label: "組んでいる", values: [1, 0, 0, 0, 0] },
  ...SHIRUBE_JOBS.flatMap((job, i) =>
    ([1, 2] as const).map((result) => ({
      key: `${209 + i}-${result}`,
      label: `組んでいる・「${job}」を${result === 1 ? "成功" : "失敗を成功扱いにしてもらった（報酬なし）"}`,
      group: "終えたばかり（次に汁部と話すと消える）",
      values: [1, ...[0, 1, 2, 3].map((j) => (j === i ? result : 0))],
    })),
  ),
];

/** 27〜31 の今の値（5個）に合う組み合わせ。表にない組み合わせなら undefined */
export function shirubeStateOf(values: readonly number[]): ShirubeState | undefined {
  return SHIRUBE_STATES.find((s) => s.values.every((v, i) => v === values[i]));
}

/** 27〜31 を key の組み合わせにする（5 B だけを書く） */
export function writeShirubeState(bytes: Uint8Array, key: string): void {
  const state = SHIRUBE_STATES.find((s) => s.key === key);
  if (!state) throw new RangeError(`汁部の状態が不明です: ${key}`);
  const problem = readTownsfolk(bytes).problem;
  if (problem) throw new RangeError(problem);
  SHIRUBE_FLAG_OFFSETS.forEach((offset, i) => writeTownsfolk(bytes, offset, state.values[i], { advanced: false }));
}

/**
 * 差分で何か分かっているバイトの説明。name があるものは入力欄を最初から出す。
 * values があるものは値の表から選ぶ（通常モードでは表の値だけ書ける）
 */
export const TOWNSFOLK_NOTES: Readonly<Record<number, TownsfolkNote>> = {
  ...OCCUPATION_FLAG_NOTES,
  0x0127: {
    name: "鍛冶屋の後継者イベント・鍛冶屋の状態",
    note: "書き換えで確認済み。踏み倒しの回数は 0x0B58（u32、この範囲の外）も +1 になった。周回後に誰が鍛冶屋になるかは 0x0132 が決める",
    values: SMITH_STATES,
  },
  0x012c: { note: "❓ 多くのセーブで 1" },
  0x0132: {
    name: "堂島が鍛冶屋を継いだ",
    note: "堂島の説得に成功する（0x0127＝70）と 1 になる。周回をまたいで、誰が鍛冶屋になるかを決める（確認済み：0 のまま周回するとおやじに戻り、1 だと堂島になった）",
    values: [
      { value: 0, label: "継いでいない（鍛冶屋のおやじ）" },
      { value: 1, label: "継いだ（堂島の鍛冶屋）" },
    ],
  },
  0x0133: { note: "❓ 海兵隊の横暴（居酒屋）で成否によらず 0 → 1" },
  0x0264: { name: "堂島", note: "1 で死亡（確認済み）" },
  0x02c4: { name: "寿司屋の店主", note: "1 で死亡。殺すと 0 → 1、0 に戻すと生き返る（確認済み）" },
  0x0444: {
    name: "鍛冶屋のおやじ",
    note: "1 で死亡（堂島ではない）。殺すと 0 → 1、0 に戻すと生き返る（確認済み）",
  },
  0x0528: {
    name: "さよ（DLC）",
    note: "🔶 1 で死亡。なりわい「おにぎり屋の用心棒」で殺害すると 0 → 1（差分1回）。0 に戻して生き返るかは未確認",
  },
};

export type TownsfolkView = {
  values: number[];
  problem: string | null;
};

export function readTownsfolk(bytes: Uint8Array): TownsfolkView {
  if (bytes.byteLength <= TOWNSFOLK_END) throw new RangeError("ファイルが小さすぎて町の人の状態を読めません");
  const values = Array.from({ length: TOWNSFOLK_LENGTH }, (_, i) => readU8(bytes, TOWNSFOLK_START + i));
  return { values, problem: checkLayout(bytes) };
}

/**
 * 通常モードは 0・1 と、今の値と同じ値（書き戻し）だけ。値の表があるバイト（0x0127 など）は表の値だけ書ける。
 * 上級者モードは任意の u8。問題がなければ null
 */
export function validateTownsfolk(
  offset: number,
  value: number,
  current: number,
  opts: { advanced: boolean },
): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) return `u8 の範囲外です: ${value}`;
  if (opts.advanced || value === current) return null;
  const values = TOWNSFOLK_NOTES[offset]?.values;
  if (values) return values.some((s) => s.value === value) ? null : `確認済みの値ではありません: ${value}`;
  if (value > TOWNSFOLK_NORMAL_MAX) return `通常モードでは 0 か 1 を指定してください: ${value}`;
  return null;
}

/** offset の1バイトだけを書く */
export function writeTownsfolk(
  bytes: Uint8Array,
  offset: number,
  value: number,
  opts: { advanced: boolean },
): void {
  const view = readTownsfolk(bytes);
  if (view.problem) throw new RangeError(view.problem);
  if (!Number.isInteger(offset) || offset < TOWNSFOLK_START || offset > TOWNSFOLK_END)
    throw new RangeError(`範囲外のオフセットです: 0x${offset.toString(16)}`);
  const error = validateTownsfolk(offset, value, readU8(bytes, offset), opts);
  if (error) throw new RangeError(error);
  writeU8(bytes, offset, value);
}
