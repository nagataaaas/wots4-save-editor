import { YOBAI_ANCHORS } from "./anchors";
import { useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FieldRow, type ParseResult } from "@/components/field-row";
import type { SelectOption } from "@/components/select-options";
import { SearchSelectRow } from "@/components/search-select-row";
import { SelectRow } from "@/components/select-row";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { parseInteger } from "@/lib/parse";
import { useSave } from "@/lib/save-context";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { WriteError } from "@/components/write-error";
import {
  AGE_NORMAL_MAX,
  AGE_UNKNOWN,
  BLOOD_TYPES,
  DAY_NORMAL_MAX,
  KNOWN_LOOKS,
  KNOWN_TYPES,
  placeName,
  nameLabel,
  PROMISE_PLACES,
  PROMISE_LAYOUT_REL,
  PROMISE_OFFSET,
  PROMISE_PLACE_REL,
  PARTNER_COUNT_NPCS,
  RECORD_CAPACITY,
  YOBAI_COUNTERS,
  promiseFieldOffset,
  readYobai,
  recordFieldOffset,
  layoutLabel,
  layoutsForPlace,
  validatePersonField,
  writePromiseField,
  writePromisePlace,
  writeRecordField,
  type KnownValue,
  type PersonField,
  type PromiseView,
  type RecordView,
  type TypeKind,
  type YobaiView,
} from "@/save/yobai";
import { getLanguage, tr, type Language, type Localized } from "@/lib/i18n";
import type { EditOpts } from "@/save/field";
import {
  createPromise,
  defaultSpec,
  initialPromiseSpec,
  requirePromisePartner,
  PARTNER_NOTES,
  layoutForPlace,
  choosePromisePlace,
  choosePromiseAt,
  findPromiseRow,
  partnerHomeMismatch,
  promisePlaceChoices,
  randomSpec,
  rowsFor,
  specPlace,
  validateSpec,
  type PromiseSpec,
} from "@/save/yobai-create";
import { labelKeywords, npcLabel } from "@/save/master/labels";
import { NPC_NAMES, npcNameGroup } from "@/save/master/npc-names";
import {
  POINT_NORMAL_MAX,
  YOBAI_POINTS,
  readYobaiPoints,
  validateYobaiPoint,
  writeYobaiPoint,
  type YobaiPointsView,
} from "@/save/yobai-points";

/** 10進数か 0x 付きの16進数 */
function parseNumber(input: string, validate: (v: number) => string | null): ParseResult<number> {
  return parseInteger(input, validate, { hex: true });
}

function parseDay(input: string, validate: (v: number) => string | null): ParseResult<number> {
  const result = parseNumber(input, v =>
    v < 1 ? tr({ ja: "1日目以上を指定してください", en: "Enter Day 1 or later" }) : validate(v - 1));
  return result.ok ? { ok: true, value: result.value - 1 } : result;
}

const NO_NAME: Localized = { ja: "名前なし", en: "No name" };
const placeLabel = (place: number) => placeName(place) || tr(NO_NAME);

/**
 * 同じ表示名が複数あるとき、同じ見出しの中で区別できるように「（その n）」を付ける。
 * 場所と配置は表の名前が重なる行がある（番号を画面に出さないための代わり）
 */
function numberDuplicates(options: SelectOption[]): SelectOption[] {
  const total = new Map<string, number>();
  for (const o of options) total.set(o.label, (total.get(o.label) ?? 0) + 1);
  const seen = new Map<string, number>();
  return options.map((o) => {
    if ((total.get(o.label) ?? 0) <= 1) return o;
    const n = (seen.get(o.label) ?? 0) + 1;
    seen.set(o.label, n);
    return { ...o, label: tr({ ja: `${o.label}（その${n}）`, en: `${o.label} (${n})` }) };
  });
}

/**
 * 場所の選択肢1つ。地区（「港」「町」など、場所の名前の最初の語）ごとにまとめる。
 * 英語の名前は「Harbor - Old Shack」の形なので、「 - 」の前を地区にする
 */
const placeOption = (place: number): SelectOption => {
  const label = placeLabel(place);
  return {
    value: String(place),
    label,
    group: (getLanguage() === "ja" ? label.split(/[ 　]/) : label.split(" - "))[0],
  };
};

/** 場所の選択肢（名前が重なる場所には「（その n）」を付ける） */
const placeOptionsOf = (places: readonly number[]): SelectOption[] =>
  numberDuplicates(places.map(placeOption));

/** 配置の説明（欄の注記）。家の種類・家の人・犬・布団と座標の組は 🟢、ほかの配置で布団が宙に浮くなどは ✅ */
const LAYOUT_NOTE: Localized = {
  ja:
    "夜這いの場の家の種類・家の人・犬・布団と、その座標の組。家の中の人は配置だけで決まる（家の人の見た目は家の種類ごとの組から選ばれ、強さは同じ）。" +
    "場所ごとに使える配置が決まっていて、ほかの配置にすると布団が宙に浮いたり壁にめり込んだりする",
  en:
    "The kind of house, residents, dogs, and futons in the night crawl, and their positions. The people in the house depend only on the layout (their looks are chosen from a set for each kind of house, and their strength is the same). " +
    "Each location has its own usable layouts; with another layout, futons may float in the air or sink into walls",
};

/** 配置の選択肢（家の種類と人数で表示する。名前が重なる配置には「（その n）」を付ける） */
const layoutOptionsOf = (layouts: readonly number[]): SelectOption[] =>
  numberDuplicates(layouts.map((l) => ({ value: String(l), label: layoutLabel(l) })));

const knownOptions = (known: readonly KnownValue[]): SelectOption[] =>
  known.map((k) => ({ value: String(k.value), label: k.label }));

/** 🟢 セリフと戦闘力：約束できる相手の種類。名前のある相手 → 町の女性 → 町の男性の順 */
const TYPE_KINDS: readonly { kind: TypeKind; label: Localized }[] = [
  { kind: "special", label: { ja: "名前のある相手", en: "Named partners" } },
  { kind: "townFemale", label: { ja: "町の人（女性）", en: "Townsfolk (female)" } },
  { kind: "townMale", label: { ja: "町の人（男性）", en: "Townsfolk (male)" } },
];

/**
 * 選択肢の表。モジュールの定数にすると言語の切り替えについてこないので、言語ごとに作って覚えておく
 * （言語を変えると画面ごと描き直す）
 */
type Options = {
  place: SelectOption[];
  type: SelectOption[];
  look: SelectOption[];
  name: SelectOption[];
  blood: SelectOption[];
  age: SelectOption[];
};
const optionsCache = new Map<Language, Options>();

function options(): Options {
  const lang = getLanguage();
  const cached = optionsCache.get(lang);
  if (cached) return cached;
  const built: Options = {
    /** 🟢 約束で使われる場所（00〜22 の全部） */
    place: placeOptionsOf(PROMISE_PLACES),
    type: TYPE_KINDS.flatMap(({ kind, label }) =>
      KNOWN_TYPES.filter((t) => t.kind === kind).map((t) => ({
        value: String(t.value),
        label: t.label,
        group: tr(label),
        keywords: [t.label],
      })),
    ),
    /** 🟢 見た目と声：見た目の表の全件。女性・男性に分け、その見た目を使う町の人の種類でも検索できるようにする */
    look: (["f", "m"] as const).flatMap((sex) =>
      KNOWN_LOOKS.filter((l) => l.sex === sex).map((l) => ({
        value: String(l.value),
        label: l.label,
        group: sex === "f" ? tr({ ja: "女性", en: "Female" }) : tr({ ja: "男性", en: "Male" }),
        keywords: [...l.keywords],
      })),
    ),
    /** 🟢 名前の表の全件。区分ごとにまとめ、英語名でも検索できるようにする */
    name: numberDuplicates(NPC_NAMES.map((n) => ({
      value: String(n.id),
      label: npcLabel(n.labelId),
      group: npcNameGroup(n.id),
      keywords: labelKeywords({ kind: "npc", id: n.labelId }),
    }))),
    blood: knownOptions(BLOOD_TYPES),
    age: ageOptions(),
  };
  optionsCache.set(lang, built);
  return built;
}

type PersonFieldSpec = {
  label: string;
  options: readonly SelectOption[] | null;
  search?: boolean;
  note: string;
};

/**
 * 人物の項目ごとの表示。確度：名前・見た目と声・相手の種類・年齢・血液型の書き換えの反映は ✅。
 * 声が見た目の顔で決まること（万由・千佳・百合は種類のまま）、名前のある相手の種類で夜這い回数が増えること、
 * 夜這いした日が約束した日と同じになることは 🟢
 */
function personField(field: EditableField): PersonFieldSpec {
  const o = options();
  const sayoMark = tr({ ja: "「？」はさよの表示", en: 'Sayo shows "？"' });
  switch (field) {
    case "name":
      return {
        label: tr({ ja: "名前", en: "Name" }),
        options: o.name,
        search: true,
        note: tr({
          ja: "はるなをさよにすると、名前がさよになる。約束の画面に職業は出ない。町の人の名前は「町の人の名前」から、相手の性別に合わせて選ばれる",
          en: "Changing Haruna to Sayo changes the name to Sayo. The occupation is not shown on the promise screen. Townsfolk names are chosen from the townsfolk names to match the partner's sex",
        }),
      };
    case "look":
      return {
        label: tr({ ja: "見た目と声", en: "Looks and voice" }),
        options: o.look,
        search: true,
        note: tr({
          ja: "見た目（モデル）と声。町の人の約束では、町で出会った相手の見た目が入る。はるなをさよにすると、見た目と声がさよになる。台詞・強さ・名前は変わらない。見た目の選択肢は主人公設定の人物と同じ。声は見た目の顔で決まり、多くの見た目が同じ声を使う。ただし相手の種類が万由・千佳・百合のときは、声は種類のまま",
          en: "Looks (model) and voice. For a townsfolk promise, this is the looks of the person you met in town. Changing Haruna to Sayo changes the looks and voice to Sayo; lines, strength, and name do not change. The choices are the same as the characters in the Hero settings. The voice depends on the face, and many looks share a voice. However, when the partner type is Mayu, Chika, or Yuri, the voice follows the type",
        }),
      };
    case "type":
      return {
        label: tr({ ja: "相手の種類（セリフと戦闘力）", en: "Partner type (lines and combat strength)" }),
        options: o.type,
        search: true,
        note: tr({
          ja: "町の人の種類。台詞と強さが決まる（はるなをさよにすると、台詞がさよの「・・・」になり、体力・攻撃力が高くなる。見た目・声・名前は変わらない）。多くの種類が同じ会話を使い、強さは種類ごとに違う。名前のある相手の種類にすると、夜這いのあとその人の夜這い回数が増える",
          en: "The kind of townsfolk. Sets lines and strength (changing Haruna to Sayo gives Sayo's \"...\" lines and higher HP and attack; looks, voice, and name do not change). Many types share the same conversation, and strength differs by type. With a named partner's type, that person's night crawl count goes up after the night crawl",
        }),
      };
    case "age":
      return { label: tr({ ja: "年齢", en: "Age" }), options: null, note: sayoMark };
    case "blood":
      return { label: tr({ ja: "血液型", en: "Blood type" }), options: o.blood, note: sayoMark };
    case "day":
      return {
        label: tr({ ja: "夜這いした日", en: "Night crawl day" }),
        options: null,
        note: tr({ ja: "約束した日と同じ日になる", en: "The same day as the promise day" }),
      };
  }
}

function hintFor(field: EditableField, advanced: boolean): string | undefined {
  if (field === "age")
    return advanced
      ? tr({ ja: "0〜255（255 で「？」）", en: '0 to 255 (255 shows "？")' })
      : tr({ ja: `0〜${AGE_NORMAL_MAX}、または「？」`, en: `0 to ${AGE_NORMAL_MAX}, or "？"` });
  if (field === "day")
    return advanced
      ? tr({ ja: "1〜65536日目", en: "Day 1 to 65536" })
      : tr({ ja: `1〜${DAY_NORMAL_MAX + 1}日目`, en: `Day 1 to ${DAY_NORMAL_MAX + 1}` });
  return undefined;
}

const UNKNOWN: Localized = { ja: "不明", en: "Unknown" };
const SEARCH_NAME: Localized = { ja: "名前・英語名で検索", en: "Search by name (Japanese or English)" };
const SEARCH_TYPE: Localized = { ja: "名前・町の人の種類で検索", en: "Search by name or townsfolk type" };
const PLACE_LABEL: Localized = { ja: "場所", en: "Location" };
const LAYOUT_LABEL: Localized = { ja: "配置（家の中の人）", en: "Layout (people in the house)" };

/** 画面で編集する人物の項目（+0x02 のまとまりは書かない） */
type EditableField = Exclude<PersonField, "group">;

/** 人物の1項目。名前・見た目と声・相手の種類・血液型は表から選び、年齢と夜這いした日は数で入力する */
function PersonFieldEditor({
  field,
  offset,
  current,
  problem,
  write,
}: {
  field: EditableField;
  offset: number;
  current: number | null;
  problem: string | null;
  write: (bytes: Uint8Array, value: number, opts: EditOpts) => void;
}) {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const spec = personField(field);
  const apply = (v: number) => update((b) => write(b, v, { advanced }));
  const validate = (v: number) => validatePersonField(field, v, current ?? 0, { advanced });

  if (field === "day")
    return (
      <FieldRow
        label={spec.label}
        offset={offset}
        value={current}
        problem={problem}
        format={(v) => `${v + 1}`}
        parse={(input) => parseDay(input, validate)}
        apply={apply}
        inputMode="numeric"
        hint={hintFor(field, advanced)}
        note={spec.note}
      />
    );

  if (!spec.options)
    return (
      <FieldRow
        label={spec.label}
        offset={offset}
        value={current}
        problem={problem}
        format={String}
        display={field === "age" ? (v) => (v === AGE_UNKNOWN ? "？" : String(v)) : undefined}
        parse={(input) => parseNumber(input, validate)}
        apply={apply}
        inputMode="numeric"
        hint={hintFor(field, advanced)}
        note={spec.note}
        warning={current === AGE_UNKNOWN ? tr({ ja: "「？」と表示される値です", en: 'This value is shown as "？"' }) : null}
      />
    );

  return spec.search ? (
    <SearchSelectRow
      label={spec.label}
      offset={offset}
      value={current === null ? null : String(current)}
      currentLabel={current === null ? undefined : tr(UNKNOWN)}
      options={spec.options}
      problem={problem}
      note={spec.note}
      searchPlaceholder={field === "name" ? tr(SEARCH_NAME) : tr(SEARCH_TYPE)}
      onChange={(v) => apply(Number(v))}
    />
  ) : (
    <SelectRow
      label={spec.label}
      offset={offset}
      value={current === null ? null : String(current)}
      currentLabel={current === null ? undefined : tr(UNKNOWN)}
      options={spec.options}
      problem={problem}
      note={spec.note}
      onChange={(v) => apply(Number(v))}
    />
  );
}

/**
 * 場所（約束の枠の +0x08）と配置（+0x0A）。配置はその場所で使える配置（🟢 PLACE_LAYOUTS）だけを、家の中の人数で選ぶ。
 * 場所を変えると、今の配置がその場所で使えなければ、家の中の人がいちばん少ない配置にする
 */
function PlaceLayoutEditor({ promise, problem }: { promise: PromiseView | null; problem: string | null }) {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  // promise が null（セーブ未読み込み）のときは欄を無効にして描く
  const layouts = promise ? layoutsForPlace(promise.place) : [];
  const valid = !promise || layouts.includes(promise.layout);

  return (
    <>
      <SelectRow
        label={tr(PLACE_LABEL)}
        offset={PROMISE_OFFSET + PROMISE_PLACE_REL}
        value={promise ? String(promise.place) : null}
        currentLabel={tr(NO_NAME)}
        options={options().place}
        problem={problem}
        // ✅ 扉とマップの書き換えの反映を確認
        note={tr({
          ja: "夜這いに入る扉と、その先のマップ。場所を変えると、配置もその場所で使えるものに合わせる",
          en: "The door you enter for the night crawl and the map beyond it. Changing the location also changes the layout to one usable there",
        })}
        onChange={(v) => {
          if (!promise) return;
          const place = Number(v);
          const layout = layoutForPlace(place, promise.layout);
          update((b) => writePromisePlace(b, place, layout, { advanced }));
        }}
      />
      <SelectRow
        label={tr(LAYOUT_LABEL)}
        offset={PROMISE_OFFSET + PROMISE_LAYOUT_REL}
        value={promise ? String(promise.layout) : null}
        currentLabel={
          promise
            ? tr({
                ja: `${layoutLabel(promise.layout)}（この場所では使われない配置）`,
                en: `${layoutLabel(promise.layout)} (not used at this location)`,
              })
            : undefined
        }
        options={layoutOptionsOf(layouts)}
        problem={problem}
        warning={
          valid
            ? null
            : tr({
                ja: "この場所で使われる配置ではありません。布団の位置がおかしくなることがあります",
                en: "This layout is not used at this location. The futon positions may be wrong",
              })
        }
        hint={
          !promise
            ? undefined
            : layouts.length <= 1
              ? tr({ ja: "この場所で使える配置は1つだけです", en: "Only one layout can be used at this location" })
              : tr({
                  ja: `この場所で使える配置は ${layouts.length} 通りです`,
                  en: `${layouts.length} layouts can be used at this location`,
                })
        }
        note={tr(LAYOUT_NOTE)}
        onChange={(v) =>
          promise && update((b) => writePromisePlace(b, promise.place, Number(v), { advanced }))
        }
      />
    </>
  );
}

/**
 * 相手の種類（約束の枠の +0x04）。名前のある相手の種類にしたとき、場所と配置がその相手のもの（組の表の行）と違えば、合わせるボタンを出す
 */
function TypeEditor({ promise, problem, view }: { promise: PromiseView | null; problem: string | null; view: YobaiView | null }) {
  const { write: update, tryWrite, error } = useWrite();
  const { advanced } = useAdvancedMode();
  // promise が null（セーブ未読み込み）のときは欄を無効にして描く
  const death = promise ? view?.context.deathWarnings.get(promise.type) ?? null : null;
  const away = promise ? partnerHomeMismatch(promise) : null;
  const spec = personField("type");

  return (
    <div className="flex flex-col gap-2 sm:col-span-3">
      <SearchSelectRow
        label={spec.label}
        offset={promiseFieldOffset("type")}
        value={promise ? String(promise.type) : null}
        currentLabel={tr({ ja: "約束できる相手の表にない種類", en: "A type not in the list of partners" })}
        options={options().type}
        problem={problem}
        warning={death}
        note={spec.note}
        searchPlaceholder={tr(SEARCH_TYPE)}
        onChange={(v) => update((b) => writePromiseField(b, "type", Number(v), { advanced }))}
      />
      {!problem && away && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              tryWrite((b) => writePromisePlace(b, away.place, away.layout, { advanced }));
            }}
          >
            {tr({ ja: "場所と配置をこの相手のものにする", en: "Use this partner's location and layout" })}
          </Button>
        </div>
      )}
      <WriteError error={error} />
    </div>
  );
}

/**
 * 約束した日（+0x28、経過日数で 1日目＝0）。🟢 場面が変わるたびに今日の経過日数と比べ、違えばすっぽかしで消える。
 * 「N日目」で入力する。今日でなければ警告を出す
 */
function DayEditor({ promise, problem, view }: { promise: PromiseView | null; problem: string | null; view: YobaiView | null }) {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  // promise が null（セーブ未読み込み）のときは欄を無効にし、今日の日付を出さない
  const today = view?.context.today ?? null;
  const isToday = !promise || today === null || promise.day === today;

  return (
    <FieldRow
      label={tr({ ja: "約束した日", en: "Promise day" })}
      offset={promiseFieldOffset("day")}
      value={promise?.day ?? null}
      problem={problem}
      format={(v) => `${v + 1}`}
      parse={(input) => parseDay(input, v => validatePersonField("day", v, promise?.day ?? 0, { advanced }))}
      apply={(v) => update((b) => writePromiseField(b, "day", v, { advanced }))}
      inputMode="numeric"
      // 🟢 場面が変わるたびに今日と比べ、違えば約束が消える
      warning={
        isToday || today === null
          ? null
          : tr({
              ja: `今日（${today + 1}日目）ではないので、次に場面が変わるとすっぽかしで消えます`,
              en: `Not today (Day ${today + 1}), so the promise will be missed and removed at the next scene change`,
            })
      }
      // 未読み込みのときは今日の補足を出さない
      hint={
        today === null
          ? hintFor("day", advanced)
          : tr({
              ja: `${hintFor("day", advanced)}。今日は ${today + 1}日目`,
              en: `${hintFor("day", advanced)}. Today is Day ${today + 1}`,
            })
      }
      note={tr({
        ja: "場面が変わるたびに今日と比べ、違えば「夜這いの約束をすっぽかしてしまった…」で約束が消える",
        en: "Compared with today at every scene change; if different, the promise is missed and removed",
      })}
    />
  );
}

const PROMISE_ORDER = ["name", "look", "age", "blood"] as const;
const RECORD_ORDER = ["name", "type", "day", "age", "blood"] as const;

const ageLabel = (v: number) => (v === AGE_UNKNOWN ? "？" : tr({ ja: `${v}歳`, en: String(v) }));

/** 年齢の選択肢（通常モードの範囲 0〜99 と「？」） */
function ageOptions(): SelectOption[] {
  return [
    ...Array.from({ length: AGE_NORMAL_MAX + 1 }, (_, v) => ({
      value: String(v),
      label: ageLabel(v),
    })),
    { value: String(AGE_UNKNOWN), label: ageLabel(AGE_UNKNOWN) },
  ];
}

/**
 * 空の約束の枠に約束を作る。相手の種類（セリフと戦闘力）が組を決める。
 * 名前・見た目と声・年齢・血液型は種類とは別々に効くので、約束の編集欄と同じ範囲で自由に選べる（初めはゲームが選ぶ候補の値）
 */
function CreatePromiseForm({ problem, view }: { problem: string | null; view: YobaiView }) {
  const { tryWrite, error, setMessage } = useWrite();
  const { advanced } = useAdvancedMode();
  const { stage, today: day } = view.context;
  const [spec, setSpec] = useState<PromiseSpec>(() => initialPromiseSpec(stage));
  const partner = requirePromisePartner(spec.type);
  const blocked = problem ?? view.context.createProblem;
  const invalid = validateSpec(spec, stage, { advanced });
  const death = view.context.deathWarnings.get(spec.type) ?? null;
  // 内容を変えたら、前に作ろうとしたときのエラーは消す
  const set = (patch: Partial<PromiseSpec>) => {
    setMessage(null);
    setSpec((s) => ({ ...s, ...patch }));
  };

  // 組（+0x00〜+0x1B）は場所と配置で選ぶ。町の人は、まとまりの組のうち段階が今以下のもの（上級者モードは全部）
  const rows = rowsFor(partner, stage, { advanced });
  // 場所と配置：通常モードはこの相手の組の場所・配置だけ。上級者モードは全部の場所と、その場所で使える配置
  // （この相手の組にない組を選ぶと、組はそのままで場所と配置だけを上書きする）
  const { place, layout } = specPlace(spec);
  const choices = promisePlaceChoices(partner, stage, place, { advanced });
  const placeChoices = placeOptionsOf(choices.places);
  const layoutChoices = layoutOptionsOf(choices.layouts);
  /** 場所と配置を選ぶ。この相手の組にあればその組、なければ今の組のまま上書き */
  const choose = (p: number, l: number) => {
    set(choosePromisePlace(spec, rows, p, l));
  };
  /** その場所の組のうち、今の段階にいちばん近いもの。なければその場所の最初の配置 */
  const chooseAt = (p: number) => {
    const next = choosePromiseAt(spec, rows, p, stage);
    if (next) set(next);
    else setMessage({ error: true, text: tr({ ja: "この場所で使える配置がありません", en: "No layout can be used at this location" }) });
  };
  const o = options();
  const partnerNote = PARTNER_NOTES[spec.type];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {tr({
          ja: `約束はありません。相手を選んで、新しく約束を作れます。約束した日はいまの経過日数（${day + 1}日目）にします。その日の夜に、場所の扉から夜這いに入れます。日付が変わると「すっぽかし」で消えます。`,
          en: `There is no promise. Choose a partner to make a new one. The promise day is set to the current day (Day ${day + 1}). That night, you can start the night crawl from the location's door. If the date changes, the promise is missed and removed.`,
        })}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 sm:col-span-3">
          <SearchSelectRow
            label={personField("type").label}
            offset={promiseFieldOffset("type")}
            value={String(spec.type)}
            options={o.type}
            problem={blocked}
            warning={death}
            searchPlaceholder={tr(SEARCH_TYPE)}
            note={tr({
              ja: "場所と配置の組はこれで決まる。選ぶと、名前・見た目と声・年齢・血液型は、ゲームがその種類で選ぶ候補の値になる（そのあと別々に変えられる）",
              en: "This decides the location and layout set. Choosing it sets the name, looks and voice, age, and blood type to the values the game would pick for that type (each can be changed afterward)",
            })}
            onChange={(v) => {
              setMessage(null);
              setSpec(defaultSpec(requirePromisePartner(Number(v)), stage));
            }}
          />
          {!blocked && partnerNote && (
            <p className="text-muted-foreground text-xs">{tr(partnerNote)}</p>
          )}
        </div>
        <SelectRow
          label={tr(PLACE_LABEL)}
          offset={PROMISE_OFFSET + PROMISE_PLACE_REL}
          value={String(place)}
          options={placeChoices}
          problem={blocked}
          disabled={placeChoices.length <= 1}
          warning={
            findPromiseRow(rows, place, layout)
              ? null
              : tr({
                  ja: "この相手がゲームで約束する場所・配置ではありません",
                  en: "Not a location and layout this partner uses in the game",
                })
          }
          hint={
            advanced
              ? tr({ ja: "全部の場所から選べます（上級者モード）", en: "Any location can be chosen (Advanced mode)" })
              : partner.kind === "town"
                ? tr({
                    ja: "この種類で、いまの段階以下の組がある場所",
                    en: "Locations with a set for this type at or below the current level",
                  })
                : tr({
                    ja: "名前のある相手は場所が決まっています（上級者モードで変えられます）",
                    en: "Named partners have a fixed location (can be changed in Advanced mode)",
                  })
          }
          note={tr({ ja: "夜這いに入る扉と、その先のマップ", en: "The door you enter for the night crawl and the map beyond it" })}
          onChange={(v) => chooseAt(Number(v))}
        />
        <div className="sm:col-span-2">
          <SelectRow
            label={tr(LAYOUT_LABEL)}
            offset={PROMISE_OFFSET + PROMISE_LAYOUT_REL}
            value={String(layout)}
            options={layoutChoices}
            problem={blocked}
            disabled={layoutChoices.length <= 1}
            hint={
              layoutChoices.length <= 1
                ? tr({ ja: "この場所で選べる配置は1つだけです", en: "Only one layout can be chosen at this location" })
                : tr({
                    ja: `この場所で選べる ${layoutChoices.length} 通り`,
                    en: `${layoutChoices.length} layouts can be chosen at this location`,
                  })
            }
            note={tr({
              ja: `${LAYOUT_NOTE.ja}。段階が高い組ほど家の人が多い。ゲームはいまの段階の組を 70% で選び、30% で1段下げる`,
              en: `${LAYOUT_NOTE.en}. Higher-level sets have more residents. The game picks a set of the current level 70% of the time, and one level lower 30% of the time`,
            })}
            onChange={(v) => choose(place, Number(v))}
          />
        </div>
        <SearchSelectRow
          label={personField("name").label}
          offset={promiseFieldOffset("name")}
          value={String(spec.name)}
          options={o.name}
          problem={blocked}
          searchPlaceholder={tr(SEARCH_NAME)}
          onChange={(v) => set({ name: Number(v) })}
        />
        <SearchSelectRow
          label={personField("look").label}
          offset={promiseFieldOffset("look")}
          value={String(spec.look)}
          options={o.look}
          problem={blocked}
          searchPlaceholder={tr(SEARCH_TYPE)}
          onChange={(v) => set({ look: Number(v) })}
        />
        <SelectRow
          label={personField("age").label}
          offset={promiseFieldOffset("age")}
          value={String(spec.age)}
          options={o.age}
          problem={blocked}
          onChange={(v) => set({ age: Number(v) })}
        />
        <SelectRow
          label={personField("blood").label}
          offset={promiseFieldOffset("blood")}
          value={String(spec.blood)}
          options={o.blood}
          problem={blocked}
          onChange={(v) => set({ blood: Number(v) })}
        />
      </div>
      {!blocked && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setMessage(null);
              setSpec(randomSpec(partner, stage));
            }}
          >
            {tr({ ja: "ゲームと同じくじで選ぶ", en: "Pick randomly like the game" })}
          </Button>
          <Button
            size="sm"
            disabled={invalid !== null}
            onClick={() => {
              tryWrite((b) => createPromise(b, spec, { advanced }));
            }}
          >
            {tr({ ja: "約束を作る", en: "Make promise" })}
          </Button>
          {(error ?? invalid) && <p className="text-destructive text-xs">{error ?? invalid}</p>}
        </div>
      )}
    </div>
  );
}

function PromiseCard({ view }: { view: YobaiView | null }) {
  const { save } = useSave();
  const promise = view?.promise ?? null;
  const problem = view?.promise.problem ?? null;

  return (
    <AnchoredCard
      anchor={YOBAI_ANCHORS.currentPromise}
      title={tr({ ja: "夜の約束", en: "Nighttime promise" })}
      description={
        <>
          {tr({
            ja: "約束中の相手・場所・名前・見た目などを書き換えられます。約束がないときは新しく作れます。",
            en: "Edit the partner, location, name, looks, and more of the current promise. If there is none, you can make a new one.",
          })}
          <br />
          {tr({
            ja: "相手の種類・名前・見た目は別々に選べるので、自由に組み合わせられます。",
            en: "Partner type, name, and looks are chosen separately, so you can combine them freely.",
          })}
          {/* 相手の種類（セリフと戦闘力）・名前・見た目と声は別々に決まる */}
        </>
      }
    >
      <CardContent>
        {view && promise && !promise.active ? (
          <CreatePromiseForm key={save?.loadId} problem={problem} view={view} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <TypeEditor promise={promise} problem={problem} view={view} />
            <PlaceLayoutEditor promise={promise} problem={problem} />
            <DayEditor promise={promise} problem={problem} view={view} />
            {PROMISE_ORDER.map((field) => (
              <PersonFieldEditor
                key={field}
                field={field}
                offset={promiseFieldOffset(field)}
                current={promise?.[field] ?? null}
                problem={problem}
                write={(b, v, opts) => writePromiseField(b, field, v, opts)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </AnchoredCard>
  );
}

function RecordRow({ record, problem }: { record: RecordView; problem: string | null }) {
  const name = nameLabel(record.name);
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <p className="text-sm font-medium">
        {tr({ ja: `${record.index + 1}件目：${name}`, en: `Record ${record.index + 1}: ${name}` })}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {RECORD_ORDER.map((field) => (
          <PersonFieldEditor
            key={field}
            field={field}
            offset={recordFieldOffset(record.index, field)}
            current={record[field]}
            problem={problem}
            write={(b, v, opts) => writeRecordField(b, record.index, field, v, opts)}
          />
        ))}
      </div>
    </div>
  );
}

/** 夜這いの記録。🔶 差分からの推定で、書き換えの反映は未確認 */
function RecordsCard({ view }: { view: YobaiView | null }) {
  const problem = view?.recordsStatus.problem ?? null;

  return (
    <CollapsibleCard
      anchor={YOBAI_ANCHORS.records}
      title={tr({ ja: "夜這いの記録", en: "Night crawling records" })}
      description={
        <>
          {tr({
            ja: "これまでの夜這いの記録を書き換えられます（記録を足したり消したりはできません）。",
            en: "Edit the records of past night crawls (records cannot be added or removed).",
          })}
          <br />
          {/* 未読み込みのときは今の件数の補足を出さない */}
          {tr({
            ja: `最大 ${RECORD_CAPACITY} 件${view ? `（今は ${view.count} 件）` : ""}で、周回を始めると全部消えます。`,
            en: `Up to ${RECORD_CAPACITY} records${view ? ` (currently ${view.count})` : ""}. All are cleared when a new playthrough starts.`,
          })}
          {/* 夜這いのたびに最初の空いている件に書かれる。見た目と声は記録に残らない */}
        </>
      }
      contentClassName="flex flex-col divide-y"
    >
      {!view && <p className="text-muted-foreground text-sm">—</p>}
      {view && view.records.length === 0 && (
        <p className="text-muted-foreground text-sm">{tr({ ja: "記録はありません。", en: "No records." })}</p>
      )}
      {problem && view && (
        <p className="text-muted-foreground pb-4 text-xs">
          {tr({ ja: `読み取り専用：${problem}`, en: `Read-only: ${problem}` })}
        </p>
      )}
      {view?.records.map((r) => (
        <RecordRow key={r.index} record={r} problem={problem} />
      ))}
    </CollapsibleCard>
  );
}

function PointsCard({ view }: { view: YobaiPointsView | null }) {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const problem = view?.problem ?? null;

  return (
    <CollapsibleCard
      anchor={YOBAI_ANCHORS.promise}
      title={tr({ ja: "夜這いの約束の条件", en: "Night crawling promise conditions" })}
      description={
        <>
          {tr({
            ja: "朱美・ローラ・三姉妹・メリンダと夜這いの約束をするための好感度とポイントです。",
            en: "Affection and points needed to make a night crawling promise with Akemi, Laura, the three sisters, and Melinda.",
          })}
          <br />
          {tr({
            ja: "約束そのものは、条件を満たしてゲームの中で結びます。",
            en: "The promise itself is made in the game once the conditions are met.",
          })}
        </>
      }
      contentClassName="grid gap-4 sm:grid-cols-3"
    >
      {YOBAI_POINTS.map((p) => {
        const current = view?.values.find((v) => v.offset === p.offset)?.value ?? null;
        const range = advanced ? tr({ ja: "0〜255", en: "0 to 255" }) : tr({ ja: `0〜${POINT_NORMAL_MAX}`, en: `0 to ${POINT_NORMAL_MAX}` });
        return (
          <FieldRow
            key={p.offset}
            label={p.label}
            offset={p.offset}
            value={current}
            problem={problem}
            format={String}
            parse={(input) => parseNumber(input, (v) => validateYobaiPoint(v, { advanced }))}
            apply={(v) => update((b) => writeYobaiPoint(b, p.offset, v, { advanced }))}
            inputMode="numeric"
            hint={
              p.threshold === null
                ? range
                : tr({ ja: `${range}。${p.threshold} 以上で約束`, en: `${range}. Promise at ${p.threshold} or more` })
            }
            note={p.note}
            warning={
              current !== null && current > POINT_NORMAL_MAX
                ? tr({ ja: "通常の進行では見ない大きさの値です", en: "A value this large does not occur in normal play" })
                : null
            }
          />
        );
      })}
    </CollapsibleCard>
  );
}

function CountersCard({ view }: { view: YobaiView | null }) {
  return (
    <CollapsibleCard
      anchor={YOBAI_ANCHORS.counts}
      title={tr({ ja: "夜這いの回数（表示だけ）", en: "Night crawl counts (view only)" })}
      description={
        <>
          {/* ✅ 約束の画面の「夜這い回数」は 0x137EC。
              夜這い回数と相手ごとの回数は周回で消えず、記録と愛の証の回数は周回で消える */}
          {tr({ ja: "夜這いの回数などの記録です。", en: "Night crawl counts and similar records." })}
          <br />
          {tr({
            ja: "周回で消える値と消えない値があるので、記録の数と合わないことがあります。",
            en: "Some values are cleared on a new playthrough and some are not, so they may not match the number of records.",
          })}
        </>
      }
      contentClassName="flex flex-col gap-4 text-sm"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {/* 🟢 段階（0x13E30）はゲーム内で数字として見えない内部の値なので出さない */}
        {/* 未読み込みのときは同じ行を「—」で出す */}
        {YOBAI_COUNTERS.filter((c) => !c.hidden).map((c) => (
          <p key={c.offset}>
            {tr({
              ja: `${c.label}：${view?.counters.find((v) => v.offset === c.offset)?.value ?? "—"}`,
              en: `${c.label}: ${view?.counters.find((v) => v.offset === c.offset)?.value ?? "—"}`,
            })}
            <span className="text-muted-foreground ml-2 text-xs">{c.note}</span>
          </p>
        ))}
      </div>
      <div>
        <p className="mb-2">
          {tr({ ja: "相手ごとの夜這い回数", en: "Night crawls per partner" })}
          <span className="text-muted-foreground ml-2 text-xs">
            {tr({
              ja: "特別な相手14人。さよと町の人は数えない",
              en: "14 special partners. Sayo and townsfolk are not counted",
            })}
          </span>
        </p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {PARTNER_COUNT_NPCS.map((p, k) => (
            <p key={p.npc}>
              {tr({
                ja: `${p.label}：${view ? view.partners[k].value : "—"}`,
                en: `${p.label}: ${view ? view.partners[k].value : "—"}`,
              })}
            </p>
          ))}
        </div>
      </div>
    </CollapsibleCard>
  );
}

const readYobaiViews = (bytes: Uint8Array) => ({ view: readYobai(bytes), points: readYobaiPoints(bytes) });

export function YobaiPage() {

  const { view: result, error: readError, problem } = useSaveView(readYobaiViews, {
    problem: (v) => v.view.promise.problem,
  });

  const view = result?.view ?? null;

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      {/*
        確度（docs: night-visit）：約束の場所・名前・見た目と声・セリフと戦闘力・年齢・血液型は ✅ 書き換えでゲームに反映。
        夜這いの記録は 🔶 差分からの推定で、書き換えの反映は未確認
      */}

      <PromiseCard key="promise" view={view} />
      <PointsCard key="points" view={result?.points ?? null} />
      <RecordsCard key="records" view={view} />
      <CountersCard view={view} />

      {/* 約束の枠の +0x00（約束したときの段階）・+0x02（まとまり）・+0x0C〜+0x1B・+0x26〜+0x2B は、約束を作るとき以外は書き換えない。記録の +0x08 は入った建物で表示しない */}
    </div>
  );
}
