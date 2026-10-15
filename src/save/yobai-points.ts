// 夜這いの約束に関わる好感度・ポイント（u8 × 6）。フラグ列の中、真ルートの周り（docs/save_format/chunks/best-route）。
//
//   0x3792  🟢 ローラの好感度。外国のイベントで増減する。お団子物語で 3 以上だと場面が分かれる（🟢）。
//              3日目夜に、小公女倒れるが成功していて 10 以上なら、謎の鍵（0xEE）でローラの部屋の扉を開けて約束できる（🟢）。
//              攻略手順どおりの最大は 12。祝 病院開業で千両箱を奪うと 0 に戻る（🟢）
//   0x3793  🟢 朱美の好感度。居酒屋で魚を渡すと 1匹 +1（10 で止まる）、海兵隊の横暴の成功で +1（[U] 2回再現）・失敗で −1、
//              真実・夜の墓場でで朱美を送る場面に入ると +1（🟢）。その直後に 10 以上なら「部屋まで送るよ」で約束になる（🟢）
//   0x3794〜0x3796  🟢 三姉妹（万由・千佳・百合）の拷問のポイント。相手は拷問の始めの治安で決まり（70 以上 万由・30〜69 百合・29 以下 千佳）、
//              拷問の点数で +1〜+4。増えたあとで 10 以上なら約束になり 0 に戻る。保釈金を払うとその相手は 0 に戻る（🟢）
//   0x3797  🟢 メリンダを峰打ちで倒した点数（+2、剣術大会（攘夷）の3回戦で +5）。攻略手順どおりで 11。
//              5日目以降に 10 以上なら、メリンダが夜這い用の姿で別の地域に出て、話すと約束になる（🟢）
//
// 🟢 ゲームは 0x3792〜0x3798 を書くときに 0〜100 に丸める。
// 書き換えたときのゲーム内の反映は未確認（要ゲーム内確認）。
// 通常モードの上限 POINT_NORMAL_MAX は、しきい値（10）と攻略手順どおりの点数（11）より少し上に取った値（🔶 ゲームの上限ではない）。
// [TS] の固定オフセットで読み、ファイルサイズが 0x48BB0 のときだけ編集を許可する。
import { tr, type Localized } from "@/lib/i18n";
import { readU8, writeU8 } from "./binary";
import { validateRange, type EditOpts, type ViewStatus } from "./field";
import { assertWritable, checkLayout } from "./layout";

export type YobaiPoint = {
  offset: number;
  label: string;
  /** 約束になる値。分かっていなければ null */
  threshold: number | null;
  note: string;
};

const TORTURE_NOTE: Localized = {
  ja:
    "拷問の点数で +1〜+4（90000 以上 +4、60000 以上 +3、30000 以上 +2）。増えたあとで 10 以上なら約束になり 0 に戻る。" +
    "保釈金を払うと 0 に戻る",
  en:
    "Torture score adds +1 to +4 (+4 at 90000 or more, +3 at 60000 or more, +2 at 30000 or more). If it reaches 10 or more after increasing, a promise is made and it returns to 0. " +
    "Paying bail returns it to 0",
};

/** 表はモジュールの定数なので、label・note は getter にして読むたびに今の言語で返す */
function point(offset: number, label: Localized, note: Localized): YobaiPoint {
  return {
    offset,
    threshold: 10,
    get label() {
      return tr(label);
    },
    get note() {
      return tr(note);
    },
  };
}

export const YOBAI_POINTS: readonly YobaiPoint[] = [
  point(
    0x3793,
    { ja: "朱美の好感度", en: "Akemi's affection" },
    {
      ja:
        "居酒屋で話しかけて魚を「欲しいならやるぞ」で渡すと 1匹 +1（10 で止まる）。海兵隊の横暴の成功で +1・失敗で −1。" +
        "真実・夜の墓場で（3日目夜）で朱美を送る場面に入ると +1 され、そこで 10 以上なら「部屋まで送るよ」で約束になる",
      en:
        "+1 per fish given to her when you talk to her at the bar (stops at 10). +1 if Violent Behavior of the Marine Corps succeeds, −1 if it fails. " +
        "+1 when the scene of walking Akemi home begins in At the Cemetery, In the Night (Day 3 night), and if it is 10 or more there, offering to walk her to her room makes a promise",
    },
  ),
  point(
    0x3792,
    { ja: "ローラの好感度", en: "Laura's affection" },
    {
      ja:
        "外国のイベントの成功で +1〜+3、失敗で −1（最大 12）。祝 病院開業で千両箱を奪うと 0 に戻る。" +
        "3日目夜に、小公女倒れるが成功していて 10 以上なら、謎の鍵でローラの部屋の扉を開けて約束できる",
      en:
        "+1 to +3 for succeeding in foreigner events, −1 for failing (up to 12). Stealing the chest of gold in Hooray! The Hospital's Grand Opening returns it to 0. " +
        "On the night of Day 3, if The Ambassador Collapses succeeded and it is 10 or more, you can open Laura's door with the Mysterious Key and make a promise",
    },
  ),
  point(
    0x3794,
    { ja: "万由の拷問のポイント", en: "Mayu's torture points" },
    {
      ja: `治安 70 以上のときの拷問（水車）の相手。${TORTURE_NOTE.ja}`,
      en: `The torturer when public order is 70 or more (Human Waterwheel). ${TORTURE_NOTE.en}`,
    },
  ),
  point(
    0x3795,
    { ja: "千佳の拷問のポイント", en: "Chika's torture points" },
    {
      ja: `治安 29 以下のときの拷問（石）の相手。${TORTURE_NOTE.ja}`,
      en: `The torturer when public order is 29 or less (Super Rock Press). ${TORTURE_NOTE.en}`,
    },
  ),
  point(
    0x3796,
    { ja: "百合の拷問のポイント", en: "Yuri's torture points" },
    {
      ja: `治安 30〜69 のときの拷問（吊り）の相手。${TORTURE_NOTE.ja}`,
      en: `The torturer when public order is 30 to 69 (Hell Horse). ${TORTURE_NOTE.en}`,
    },
  ),
  point(
    0x3797,
    { ja: "メリンダの峰打ちの点数", en: "Melinda's blunt-strike points" },
    {
      ja:
        "メリンダを峰打ちで倒すと +2（剣術大会（攘夷）の3回戦は +5）。攻略手順どおりに進めると 11。" +
        "5日目以降に 10 以上なら、メリンダが夜這い用の姿で別の地域に出て、話すと約束になる",
      en:
        "+2 for defeating Melinda with a blunt strike (+5 in round 3 of Battle Tournament (Prajnas)). Following the walkthrough gives 11. " +
        "From Day 5 on, if it is 10 or more, Melinda appears in another area in her night crawling outfit, and talking to her makes a promise",
    },
  ),
];

/** 通常モードで書ける上限（🔶 しきい値 10・攻略手順どおりの 11 より少し上。ゲームの上限ではない） */
export const POINT_NORMAL_MAX = 20;

export type YobaiPointsView = ViewStatus & {
  values: { offset: number; value: number }[];
};

export function readYobaiPoints(bytes: Uint8Array): YobaiPointsView {
  const last = Math.max(...YOBAI_POINTS.map((p) => p.offset));
  if (bytes.byteLength <= last)
    throw new RangeError(
      tr({ ja: "ファイルが小さすぎて好感度・ポイントを読めません", en: "The file is too small to read the affection and points" }),
    );
  return {
    warnings: [],
    values: YOBAI_POINTS.map((p) => ({ offset: p.offset, value: readU8(bytes, p.offset) })),
    problem: checkLayout(bytes),
  };
}

/** 通常モードは 0〜POINT_NORMAL_MAX、上級者モードは任意の u8。問題がなければ null */
export function validateYobaiPoint(value: number, opts: EditOpts): string | null {
  return validateRange(value, { systemMax: 0xff, normalMax: POINT_NORMAL_MAX }, opts);
}

/** offset の1バイトだけを書く */
export function writeYobaiPoint(bytes: Uint8Array, offset: number, value: number, opts: EditOpts): void {
  assertWritable(bytes);
  const view = readYobaiPoints(bytes);
  if (view.problem) throw new RangeError(view.problem);
  if (!YOBAI_POINTS.some((p) => p.offset === offset))
    throw new RangeError(tr({ ja: "好感度・ポイントの位置ではありません", en: "Not an affection or points position" }));
  const error = validateYobaiPoint(value, opts);
  if (error) throw new RangeError(error);
  writeU8(bytes, offset, value);
}
