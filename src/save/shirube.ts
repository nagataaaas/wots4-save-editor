// 汁部（DLC）の続き物を、なりわいの画面の1つの欄で読み書きする。
// 出典：docs/save_format/chunks/townsfolk「汁部（DLC）の続き物」、chunks/occupation（受注の差分 2026-10-06・2026-10-07）。
//
//   なりわいのフラグ 27〜31（0x0137〜0x013B、townsfolk.ts）🟢
//     27      汁部と組んでいる。手を切ると 27〜31 がすべて 0 になる
//     28〜31  209〜212 を終えたときの結果（1 成功、2 失敗を成功扱い）。次に汁部と話すと 0 に戻るので、立つのはふつう1つだけ
//   受注中（occupation.ts）
//     0x45F4E u16  受注中のなりわいの ID 🟢
//     0x45F55 u8   受注中だけ FF 🔶
//     ✅ 209 の受注で、27 が 0 → 1、0x45F4E が 0 → 209、0x45F55 が 0 → FF。0x45F52・0x45F54 は 0 のまま（2026-10-07）
//     🔶 210〜212 も受注で 0x45F4E が ID になる（2026-10-06）。0x45F52・0x45F54 が変わるかは ❓
//        （211 は「出頭命令」と同じ伝言・説得で、出頭命令の受注では 0x45F52 が 3・0x45F54 が 2 になった）
//   受注を選ぶと 27〜31 と 0x45F4E・0x45F55 を書く（0x45F52・0x45F54 は書かない）。ほかのなりわいを受注中なら拒否する。
//   受注以外を選ぶと 27〜31 を書き、汁部の仕事を受注中だったら 0x45F4E・0x45F55 を 0 に戻す（クリアで 0x45F4E が 0 に戻った）。
//
// 🔶 どこまで進んだか（次にどの仕事を頼まれるか）はこの欄にない。周回をまたぐ記録 0x33A4〜 でもない
//    （記録の 209 が 5 のセーブでも、組んだあと 209 から頼まれた。2026-10-07）。位置は ❓
// 書き込みの反映は要ゲーム内確認。
import { readU16, readU8, writeU16, writeU8 } from "./binary";
import { OCCUPATION_ACCEPTED_OFFSET, OCCUPATION_ACCEPTING_OFFSET, readOccupations } from "./occupation";
import { occupationById } from "./master/occupation-names";
import { SHIRUBE_JOBS, occupationFlagOffset, readTownsfolk, writeTownsfolk } from "./townsfolk";

/** 🟢 なりわいのフラグ 27〜31 */
export const SHIRUBE_FLAG_OFFSETS: readonly number[] = [27, 28, 29, 30, 31].map(occupationFlagOffset);

/** 汁部の仕事の ID（209〜212） */
export const SHIRUBE_JOB_IDS: readonly number[] = SHIRUBE_JOBS.map((_, i) => 209 + i);

const isShirubeJob = (id: number) => SHIRUBE_JOB_IDS.includes(id);

export type ShirubeState = {
  key: string;
  label: string;
  group?: string;
  /** 選んだあとの欄に出す名前 */
  fullLabel: string;
  /** 27〜31 の値 */
  values: readonly number[];
  /** 受注中の汁部の仕事の ID。受注していなければ 0 */
  accepted: number;
};

const RESULT_LABELS = { 1: "成功", 2: "失敗を成功扱いにしてもらった" } as const;

export const SHIRUBE_STATES: readonly ShirubeState[] = [
  { key: "none", label: "組んでいない", fullLabel: "組んでいない", values: [0, 0, 0, 0, 0], accepted: 0 },
  { key: "partner", label: "組んだ", fullLabel: "組んだ", values: [1, 0, 0, 0, 0], accepted: 0 },
  ...SHIRUBE_JOBS.flatMap((job, i): ShirubeState[] => [
    // ✅ 209 の受注は差分で確認。🔶 210〜212 は 0x45F52・0x45F54 が ❓
    {
      key: `${209 + i}-accepted`,
      label: "受注",
      group: `「${job}」`,
      fullLabel: `「${job}」受注`,
      values: [1, 0, 0, 0, 0],
      accepted: 209 + i,
    },
    ...([1, 2] as const).map((result) => ({
      key: `${209 + i}-${result}`,
      label: RESULT_LABELS[result],
      group: `「${job}」`,
      fullLabel: `「${job}」${RESULT_LABELS[result]}`,
      values: [1, ...[0, 1, 2, 3].map((j) => (j === i ? result : 0))],
      accepted: 0,
    })),
  ]),
];

export type ShirubeView = {
  /** 27〜31 の値 */
  values: number[];
  /** 受注中のなりわいの ID（汁部以外も含む） */
  accepted: number;
  /** 表にある組み合わせなら、その状態 */
  state: ShirubeState | undefined;
  /** 妥当性検証に落ちた理由。あれば読み取り専用 */
  problem: string | null;
};

/** 27〜31 と受注中の ID に合う組み合わせ。汁部以外のなりわいを受注中なら、受注していないものとして見る */
export function shirubeStateOf(values: readonly number[], accepted: number): ShirubeState | undefined {
  const shirubeAccepted = isShirubeJob(accepted) ? accepted : 0;
  return SHIRUBE_STATES.find((s) => s.accepted === shirubeAccepted && s.values.every((v, i) => v === values[i]));
}

export function readShirube(bytes: Uint8Array): ShirubeView {
  const values = SHIRUBE_FLAG_OFFSETS.map((o) => readU8(bytes, o));
  const accepted = readU16(bytes, OCCUPATION_ACCEPTED_OFFSET);
  return {
    values,
    accepted,
    state: shirubeStateOf(values, accepted),
    problem: readTownsfolk(bytes).problem ?? readOccupations(bytes).layoutProblem,
  };
}

/** key の組み合わせを書く（27〜31 の 5 B と、受注にかかわるときだけ 0x45F4E・0x45F55） */
export function writeShirubeState(bytes: Uint8Array, key: string): void {
  const state = SHIRUBE_STATES.find((s) => s.key === key);
  if (!state) throw new RangeError(`汁部の状態が不明です: ${key}`);
  const { accepted, problem } = readShirube(bytes);
  if (problem) throw new RangeError(problem);
  if (state.accepted !== 0 && accepted !== 0 && !isShirubeJob(accepted)) {
    const name = occupationById(accepted)?.ja;
    throw new RangeError(`ほかのなりわい（${accepted}${name ? ` ${name}` : ""}）を受注中なので、汁部の仕事の受注は書けません`);
  }
  SHIRUBE_FLAG_OFFSETS.forEach((offset, i) => writeTownsfolk(bytes, offset, state.values[i], { advanced: false }));
  if (state.accepted !== 0) {
    writeU16(bytes, OCCUPATION_ACCEPTED_OFFSET, state.accepted);
    writeU8(bytes, OCCUPATION_ACCEPTING_OFFSET, 0xff);
  } else if (isShirubeJob(accepted)) {
    writeU16(bytes, OCCUPATION_ACCEPTED_OFFSET, 0);
    writeU8(bytes, OCCUPATION_ACCEPTING_OFFSET, 0);
  }
}
