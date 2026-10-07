// 汁部（DLC）の続き物を、なりわいの画面の1つの欄で読み書きする。出典：docs/save_format/chunks/townsfolk「汁部（DLC）の続き物」。
//
//   なりわいのフラグ 27〜31（0x0137〜0x013B、townsfolk.ts）🟢
//     27      汁部と組んでいる。手を切ると 27〜31 がすべて 0 になる
//     28〜31  209〜212 を終えたときの結果（1 成功、2 失敗を成功扱い）。次に汁部と話すと 0 に戻るので、立つのはふつう1つだけ
//   受注中は 27〜31 が「組んだ」と同じ値で、受注中のなりわい（0x45F4E）が 209〜212 になる（✅ 209 の受注の差分 2026-10-07）。
//   受注の書き込みは occupation-accept.ts にまとめてあり、ここでは「受注」を選んだときにそれを呼ぶ。
//   受注以外を選ぶと 27〜31 を書き、汁部の仕事を受注中なら受注中の情報を 0 にする（writeSeriesState）。
//
// 🔶 どこまで進んだか（次にどの仕事を頼まれるか）はこの欄にない。周回をまたぐ記録 0x33A4〜 でもない
//    （記録の 209 が 5 のセーブでも、組んだあと 209 から頼まれた。2026-10-07）。位置は ❓
// 書き込みの反映は要ゲーム内確認。
import { readU8 } from "./binary";
import { readAccepted, writeSeriesState } from "./occupation-accept";
import { SHIRUBE_JOBS, occupationFlagOffset } from "./townsfolk";

const FLAGS = [27, 28, 29, 30, 31] as const;

/** 🟢 なりわいのフラグ 27〜31 */
export const SHIRUBE_FLAG_OFFSETS: readonly number[] = FLAGS.map(occupationFlagOffset);

/** 汁部の仕事の ID（209〜212） */
export const SHIRUBE_JOB_IDS: readonly number[] = SHIRUBE_JOBS.map((_, i) => 209 + i);

export type ShirubeState = {
  key: string;
  label: string;
  group?: string;
  /** 選んだあとの欄に出す名前 */
  fullLabel: string;
  /** 27〜31 の値 */
  values: readonly number[];
  /** 受注するなりわいの ID */
  accept?: number;
};

const RESULT_LABELS = { 1: "成功", 2: "失敗を成功扱いにしてもらった" } as const;

export const SHIRUBE_STATES: readonly ShirubeState[] = [
  { key: "none", label: "組んでいない", fullLabel: "組んでいない", values: [0, 0, 0, 0, 0] },
  { key: "partner", label: "組んだ", fullLabel: "組んだ", values: [1, 0, 0, 0, 0] },
  ...SHIRUBE_JOBS.flatMap((job, i): ShirubeState[] => [
    {
      key: `${209 + i}-accepted`,
      label: "受注",
      group: `「${job}」`,
      fullLabel: `「${job}」受注`,
      values: [1, 0, 0, 0, 0],
      accept: 209 + i,
    },
    ...([1, 2] as const).map((result) => ({
      key: `${209 + i}-${result}`,
      label: RESULT_LABELS[result],
      group: `「${job}」`,
      fullLabel: `「${job}」${RESULT_LABELS[result]}`,
      values: [1, ...[0, 1, 2, 3].map((j) => (j === i ? result : 0))],
    })),
  ]),
];

export type ShirubeView = {
  /** 27〜31 の値 */
  values: number[];
  /** 表にある組み合わせなら、その状態 */
  state: ShirubeState | undefined;
  /** 妥当性検証に落ちた理由。あれば読み取り専用 */
  problem: string | null;
};

/** 27〜31 と受注中のなりわいに合う組み合わせ。汁部以外のなりわいを受注中なら、受注していないものとして見る */
export function shirubeStateOf(values: readonly number[], accepted: number): ShirubeState | undefined {
  const accept = SHIRUBE_JOB_IDS.includes(accepted) ? accepted : undefined;
  return SHIRUBE_STATES.find((s) => s.accept === accept && s.values.every((v, i) => v === values[i]));
}

export function readShirube(bytes: Uint8Array): ShirubeView {
  const values = SHIRUBE_FLAG_OFFSETS.map((o) => readU8(bytes, o));
  const accepted = readAccepted(bytes);
  return { values, state: shirubeStateOf(values, accepted.id), problem: accepted.problem };
}

/** key の組み合わせにする（27〜31 の 5 B。受注を選んだとき・受注を外すときは受注中の情報も） */
export function writeShirubeState(bytes: Uint8Array, key: string): void {
  const state = SHIRUBE_STATES.find((s) => s.key === key);
  if (!state) throw new RangeError(`汁部の状態が不明です: ${key}`);
  writeSeriesState(
    bytes,
    FLAGS.map((flag, i) => ({ flag, value: state.values[i] })),
    state.accept,
    { advanced: false },
  );
}
