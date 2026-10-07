// 汁部（DLC）の続き物を、なりわいの画面の1つの欄で読み書きする。出典：docs/save_format/chunks/townsfolk「汁部（DLC）の続き物」。
//
//   なりわいのフラグ 27〜31（0x0137〜0x013B、townsfolk.ts）🟢
//     27      汁部と組んでいる。手を切ると 27〜31 がすべて 0 になる
//     28〜31  209〜212 を終えたときの結果（1 成功、2 失敗を成功扱い）。次に汁部と話すと 0 に戻るので、立つのはふつう1つだけ
//
// 受注は扱わない。✅ 209 の受注で変わるのは 27（0 → 1）と、受注中のなりわい 0x45F4E・0x45F55（occupation.ts）で、
// 28〜31 は 0 のまま（2026-10-07）。受注中のなりわいは、どのなりわいでも同じ場所に書くので、書き込みは受注中の欄1か所にまとめる。
//
// 🔶 どこまで進んだか（次にどの仕事を頼まれるか）はこの欄にない。周回をまたぐ記録 0x33A4〜 でもない
//    （記録の 209 が 5 のセーブでも、組んだあと 209 から頼まれた。2026-10-07）。位置は ❓
// 書き込みの反映は要ゲーム内確認。
import { readU8 } from "./binary";
import { SHIRUBE_JOBS, occupationFlagOffset, readTownsfolk, writeTownsfolk } from "./townsfolk";

/** 🟢 なりわいのフラグ 27〜31 */
export const SHIRUBE_FLAG_OFFSETS: readonly number[] = [27, 28, 29, 30, 31].map(occupationFlagOffset);

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
};

const RESULT_LABELS = { 1: "成功", 2: "失敗を成功扱いにしてもらった" } as const;

export const SHIRUBE_STATES: readonly ShirubeState[] = [
  { key: "none", label: "組んでいない", fullLabel: "組んでいない", values: [0, 0, 0, 0, 0] },
  { key: "partner", label: "組んだ", fullLabel: "組んだ（受注中も同じ値）", values: [1, 0, 0, 0, 0] },
  ...SHIRUBE_JOBS.flatMap((job, i) =>
    ([1, 2] as const).map((result) => ({
      key: `${209 + i}-${result}`,
      label: RESULT_LABELS[result],
      group: `「${job}」`,
      fullLabel: `「${job}」${RESULT_LABELS[result]}`,
      values: [1, ...[0, 1, 2, 3].map((j) => (j === i ? result : 0))],
    })),
  ),
];

export type ShirubeView = {
  /** 27〜31 の値 */
  values: number[];
  /** 表にある組み合わせなら、その状態 */
  state: ShirubeState | undefined;
  /** 妥当性検証に落ちた理由。あれば読み取り専用 */
  problem: string | null;
};

/** 27〜31 の今の値（5個）に合う組み合わせ。表にない組み合わせなら undefined */
export function shirubeStateOf(values: readonly number[]): ShirubeState | undefined {
  return SHIRUBE_STATES.find((s) => s.values.every((v, i) => v === values[i]));
}

export function readShirube(bytes: Uint8Array): ShirubeView {
  const values = SHIRUBE_FLAG_OFFSETS.map((o) => readU8(bytes, o));
  return { values, state: shirubeStateOf(values), problem: readTownsfolk(bytes).problem };
}

/** 27〜31 を key の組み合わせにする（5 B だけを書く。受注中のなりわいには触らない） */
export function writeShirubeState(bytes: Uint8Array, key: string): void {
  const state = SHIRUBE_STATES.find((s) => s.key === key);
  if (!state) throw new RangeError(`汁部の状態が不明です: ${key}`);
  const { problem } = readShirube(bytes);
  if (problem) throw new RangeError(problem);
  SHIRUBE_FLAG_OFFSETS.forEach((offset, i) => writeTownsfolk(bytes, offset, state.values[i], { advanced: false }));
}
