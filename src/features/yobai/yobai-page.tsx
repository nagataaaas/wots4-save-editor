import { YOBAI_ANCHORS } from "./anchors";
import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FieldRow, type ParseResult } from "@/components/field-row";
import type { SelectOption } from "@/components/select-options";
import { SearchSelectRow } from "@/components/search-select-row";
import { SelectRow } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScopeAnchorLink } from "@/components/anchor-link";
import { AnchoredCard } from "@/components/anchored-card";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import {
  AGE_NORMAL_MAX,
  AGE_UNKNOWN,
  BLOOD_TYPES,
  DAY_NORMAL_MAX,
  KNOWN_LOOKS,
  KNOWN_TYPES,
  PLACES,
  nameLabel,
  PLACE_LAYOUTS,
  PROMISE_LAYOUT_REL,
  PROMISE_OFFSET,
  PROMISE_PLACE_REL,
  PARTNER_COUNT_NPCS,
  RECORD_CAPACITY,
  YOBAI_COUNTERS,
  promiseFieldOffset,
  readYobai,
  recordFieldOffset,
  layoutHeadcount,
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
  type YobaiView,
} from "@/save/yobai";
import { readU16 } from "@/save/binary";
import {
  DAY_INDEX_OFFSET,
  createPromise,
  createProblem,
  currentStage,
  defaultSpec,
  partnerDeathWarning,
  promisePartner,
  randomSpec,
  PROMISE_ROWS,
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

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 10進数か 0x 付きの16進数 */
function parseNumber(input: string, validate: (v: number) => string | null): ParseResult<number> {
  const s = input.trim();
  let value: number;
  if (/^0x[0-9a-f]+$/i.test(s)) value = Number.parseInt(s.slice(2), 16);
  else if (/^\d+$/.test(s)) value = Number(s);
  else return { ok: false, error: "整数を入力してください" };
  const error = validate(value);
  return error ? { ok: false, error } : { ok: true, value };
}

const placeLabel = (place: number) => PLACES[place] ?? "名前なし";

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
    return { ...o, label: `${o.label}（その${n}）` };
  });
}

/** 場所の選択肢1つ。地区（「港」「町」など、場所の名前の最初の語）ごとにまとめる */
const placeOption = (place: number): SelectOption => ({
  value: String(place),
  label: placeLabel(place),
  group: placeLabel(place).split(/[ 　]/)[0],
});

/** 場所の選択肢（名前が重なる場所には「（その n）」を付ける） */
const placeOptionsOf = (places: readonly number[]): SelectOption[] =>
  numberDuplicates(places.map(placeOption));

/** 🟢 約束で使われる場所（00〜22 の全部） */
const placeOptions: SelectOption[] = placeOptionsOf([
  ...new Set(PLACE_LAYOUTS.map((p) => p.place)),
]);

/** 配置の説明（欄の注記）。家の種類・家の人・犬・布団と座標の組は 🟢、ほかの配置で布団が宙に浮くなどは ✅ */
const LAYOUT_NOTE =
  "夜這いの場の家の種類・家の人・犬・布団と、その座標の組。家の中の人は配置だけで決まる（家の人の見た目は家の種類ごとの組から選ばれ、強さは同じ）。" +
  "場所ごとに使える配置が決まっていて、ほかの配置にすると布団が宙に浮いたり壁にめり込んだりする";

/** 配置の選択肢（家の種類と人数で表示する。名前が重なる配置には「（その n）」を付ける） */
const layoutOptionsOf = (layouts: readonly number[]): SelectOption[] =>
  numberDuplicates(layouts.map((l) => ({ value: String(l), label: layoutLabel(l) })));

const knownOptions = (known: readonly KnownValue[]): SelectOption[] =>
  known.map((k) => ({ value: String(k.value), label: k.label }));

/** 🟢 セリフと戦闘力：約束できる相手の種類。名前のある相手 → 町の女性 → 町の男性の順 */
const TYPE_KINDS = ["名前のある相手", "町の人（女性）", "町の人（男性）"] as const;
const typeOptions: SelectOption[] = TYPE_KINDS.flatMap((kind) =>
  KNOWN_TYPES.filter((t) => t.kind === kind).map((t) => ({
    value: String(t.value),
    label: t.label,
    group: kind,
    keywords: [t.label],
  })),
);

/** 🟢 見た目と声：見た目の表の全件。女性・男性に分け、その見た目を使う町の人の種類でも検索できるようにする */
const lookOptions: SelectOption[] = (["f", "m"] as const).flatMap((sex) =>
  KNOWN_LOOKS.filter((l) => l.sex === sex).map((l) => ({
    value: String(l.value),
    label: l.label,
    group: sex === "f" ? "女性" : "男性",
    keywords: [l.label, l.usedBy],
  })),
);

/** 🟢 名前の表の全件。区分ごとにまとめ、英語名でも検索できるようにする */
const nameOptions: SelectOption[] = numberDuplicates(NPC_NAMES.map((n) => ({
  value: String(n.id),
  label: npcLabel(n.labelId),
  group: npcNameGroup(n.id),
  keywords: labelKeywords({ kind: "npc", id: n.labelId }),
})));

/**
 * 人物の項目ごとの表示。確度：名前・見た目と声・相手の種類・年齢・血液型の書き換えの反映は ✅。
 * 声が見た目の顔で決まること（万由・千佳・百合は種類のまま）、名前のある相手の種類で夜這い回数が増えること、
 * 夜這いした日が約束した日と同じになることは 🟢
 */
const PERSON_FIELDS: Record<
  EditableField,
  {
    label: string;
    options: readonly SelectOption[] | null;
    search?: boolean;
    note: string;
  }
> = {
  name: {
    label: "名前",
    options: nameOptions,
    search: true,
    note: "はるなをさよにすると、名前がさよになる。約束の画面に職業は出ない。町の人の名前は「町の人の名前」から、相手の性別に合わせて選ばれる",
  },
  look: {
    label: "見た目と声",
    options: lookOptions,
    search: true,
    note: "見た目（モデル）と声。町の人の約束では、町で出会った相手の見た目が入る。はるなをさよにすると、見た目と声がさよになる。台詞・強さ・名前は変わらない。見た目の選択肢は主人公設定の人物と同じ。声は見た目の顔で決まり、多くの見た目が同じ声を使う。ただし相手の種類が万由・千佳・百合のときは、声は種類のまま",
  },
  type: {
    label: "相手の種類（セリフと戦闘力）",
    options: typeOptions,
    search: true,
    note: "町の人の種類。台詞と強さが決まる（はるなをさよにすると、台詞がさよの「・・・」になり、体力・攻撃力が高くなる。見た目・声・名前は変わらない）。多くの種類が同じ会話を使い、強さは種類ごとに違う。名前のある相手の種類にすると、夜這いのあとその人の夜這い回数が増える",
  },
  age: {
    label: "年齢",
    options: null,
    note: "「？」はさよの表示",
  },
  blood: {
    label: "血液型",
    options: knownOptions(BLOOD_TYPES),
    note: "「？」はさよの表示",
  },
  day: {
    label: "夜這いした日",
    options: null,
    note: "約束した日と同じ日になる",
  },
};

function hintFor(field: EditableField, advanced: boolean): string | undefined {
  if (field === "age")
    return advanced ? "0〜255（255 で「？」）" : `0〜${AGE_NORMAL_MAX}、または「？」`;
  if (field === "day") return advanced ? "1〜65536日目" : `1〜${DAY_NORMAL_MAX + 1}日目`;
  return undefined;
}

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
  write: (bytes: Uint8Array, value: number, opts: { advanced: boolean }) => void;
}) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const spec = PERSON_FIELDS[field];
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
        parse={(input) => {
          const r = parseNumber(input, (v) =>
            v < 1 ? "1日目以上を指定してください" : validate(v - 1),
          );
          return r.ok ? { ok: true, value: r.value - 1 } : r;
        }}
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
        warning={current === AGE_UNKNOWN ? "「？」と表示される値です" : null}
      />
    );

  return spec.search ? (
    <SearchSelectRow
      label={spec.label}
      offset={offset}
      value={current === null ? null : String(current)}
      currentLabel={current === null ? undefined : "不明"}
      options={spec.options}
      problem={problem}
      note={spec.note}
      searchPlaceholder={field === "name" ? "名前・英語名で検索" : "名前・町の人の種類で検索"}
      onChange={(v) => apply(Number(v))}
    />
  ) : (
    <SelectRow
      label={spec.label}
      offset={offset}
      value={current === null ? null : String(current)}
      currentLabel={current === null ? undefined : "不明"}
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
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  // promise が null（セーブ未読み込み）のときは欄を無効にして描く
  const layouts = promise ? layoutsForPlace(promise.place) : [];
  const valid = !promise || layouts.includes(promise.layout);

  return (
    <>
      <SelectRow
        label="場所"
        offset={PROMISE_OFFSET + PROMISE_PLACE_REL}
        value={promise ? String(promise.place) : null}
        currentLabel="名前なし"
        options={placeOptions}
        problem={problem}
        // ✅ 扉とマップの書き換えの反映を確認
        note="夜這いに入る扉と、その先のマップ。場所を変えると、配置もその場所で使えるものに合わせる"
        onChange={(v) => {
          if (!promise) return;
          const place = Number(v);
          const next = layoutsForPlace(place);
          const layout = next.includes(promise.layout) ? promise.layout : next[0];
          update((b) => writePromisePlace(b, place, layout, { advanced }));
        }}
      />
      <SelectRow
        label="配置（家の中の人）"
        offset={PROMISE_OFFSET + PROMISE_LAYOUT_REL}
        value={promise ? String(promise.layout) : null}
        currentLabel={promise ? `${layoutLabel(promise.layout)}（この場所では使われない配置）` : undefined}
        options={layoutOptionsOf(layouts)}
        problem={problem}
        warning={
          valid
            ? null
            : "この場所で使われる配置ではありません。布団の位置がおかしくなることがあります"
        }
        hint={
          !promise
            ? undefined
            : layouts.length <= 1
              ? "この場所で使える配置は1つだけです"
              : `この場所で使える配置は ${layouts.length} 通りです`
        }
        note={LAYOUT_NOTE}
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
function TypeEditor({ promise, problem }: { promise: PromiseView | null; problem: string | null }) {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  // promise が null（セーブ未読み込み）のときは欄を無効にして描く
  const partner = promise ? promisePartner(promise.type) : undefined;
  const death = save && promise ? partnerDeathWarning(save.working, promise.type) : null;
  const home = partner?.row != null ? PROMISE_ROWS.find((r) => r.index === partner.row) : undefined;
  const away =
    promise && home && (home.place !== promise.place || home.layout !== promise.layout) ? home : undefined;

  return (
    <div className="flex flex-col gap-2 sm:col-span-3">
      <SearchSelectRow
        label={PERSON_FIELDS.type.label}
        offset={promiseFieldOffset("type")}
        value={promise ? String(promise.type) : null}
        currentLabel="約束できる相手の表にない種類"
        options={typeOptions}
        problem={problem}
        warning={death}
        note={PERSON_FIELDS.type.note}
        searchPlaceholder="名前・町の人の種類で検索"
        onChange={(v) => update((b) => writePromiseField(b, "type", Number(v), { advanced }))}
      />
      {!problem && away && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              update((b) => writePromisePlace(b, away.place, away.layout, { advanced }))
            }
          >
            場所と配置をこの相手のものにする
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * 約束した日（+0x28、経過日数で 1日目＝0）。🟢 場面が変わるたびに今日の経過日数と比べ、違えばすっぽかしで消える。
 * 「N日目」で入力する。今日でなければ警告を出す
 */
function DayEditor({ promise, problem }: { promise: PromiseView | null; problem: string | null }) {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  // promise が null（セーブ未読み込み）のときは欄を無効にし、今日の日付を出さない
  const today = save ? readU16(save.working, DAY_INDEX_OFFSET) : null;
  const isToday = !promise || today === null || promise.day === today;

  return (
    <FieldRow
      label="約束した日"
      offset={promiseFieldOffset("day")}
      value={promise?.day ?? null}
      problem={problem}
      format={(v) => `${v + 1}`}
      parse={(input) => {
        const r = parseNumber(input, (v) =>
          v < 1
            ? "1日目以上を指定してください"
            : promise && validatePersonField("day", v - 1, promise.day, { advanced }),
        );
        return r.ok ? { ok: true, value: r.value - 1 } : r;
      }}
      apply={(v) => update((b) => writePromiseField(b, "day", v, { advanced }))}
      inputMode="numeric"
      // 🟢 場面が変わるたびに今日と比べ、違えば約束が消える
      warning={
        isToday || today === null
          ? null
          : `今日（${today + 1}日目）ではないので、次に場面が変わるとすっぽかしで消えます`
      }
      hint={`${hintFor("day", advanced)}。今日は ${today === null ? "—" : `${today + 1}日目`}`}
      note="場面が変わるたびに今日と比べ、違えば「夜這いの約束をすっぽかしてしまった…」で約束が消える"
    />
  );
}

const PROMISE_ORDER = ["name", "look", "age", "blood"] as const;
const RECORD_ORDER = ["name", "type", "day", "age", "blood"] as const;

/** 名前のある相手ごとの注意（約束の外で変わる値など） */
const PARTNER_NOTES: Readonly<Record<number, string>> = {
  448: "ゲームで約束すると、その人の拷問のポイントが 0 になります（ここでは 0 になりません）",
  449: "ゲームで約束すると、その人の拷問のポイントが 0 になります（ここでは 0 になりません）",
  450: "ゲームで約束すると、その人の拷問のポイントが 0 になります（ここでは 0 になりません）",
  454: "読み込み直すとローラの印が消えるので、褒美が「掘り出し物」にならないことがあります",
};

const ageLabel = (v: number) => (v === AGE_UNKNOWN ? "？" : `${v}歳`);

/** 年齢の選択肢（通常モードの範囲 0〜99 と「？」） */
const ageOptions: SelectOption[] = [
  ...Array.from({ length: AGE_NORMAL_MAX + 1 }, (_, v) => ({
    value: String(v),
    label: ageLabel(v),
  })),
  { value: String(AGE_UNKNOWN), label: ageLabel(AGE_UNKNOWN) },
];

/**
 * 空の約束の枠に約束を作る。相手の種類（セリフと戦闘力）が組を決める。
 * 名前・見た目と声・年齢・血液型は種類とは別々に効くので、約束の編集欄と同じ範囲で自由に選べる（初めはゲームが選ぶ候補の値）
 */
function CreatePromiseForm({ problem }: { problem: string | null }) {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const stage = save ? currentStage(save.working) : 0;
  const day = save ? readU16(save.working, DAY_INDEX_OFFSET) : 0;
  const [spec, setSpec] = useState<PromiseSpec>(() => defaultSpec(promisePartner(0x25)!, stage));
  const [error, setError] = useState<string | null>(null);
  const partner = promisePartner(spec.type)!;
  const blocked =
    problem ?? (save ? createProblem(save.working) : "セーブファイルが読み込まれていません");
  const invalid = validateSpec(spec, stage, { advanced });
  const death = save ? partnerDeathWarning(save.working, spec.type) : null;
  const set = (patch: Partial<PromiseSpec>) => {
    setError(null);
    setSpec((s) => ({ ...s, ...patch }));
  };

  // 組（+0x00〜+0x1B）は場所と配置で選ぶ。町の人は、まとまりの組のうち段階が今以下のもの（上級者モードは全部）
  const rows = rowsFor(partner, stage, { advanced });
  // 場所と配置：通常モードはこの相手の組の場所・配置だけ。上級者モードは全部の場所と、その場所で使える配置
  // （この相手の組にない組を選ぶと、組はそのままで場所と配置だけを上書きする）
  const { place, layout } = specPlace(spec);
  const rowPlaces = [...new Set(rows.map((r) => r.place))].sort((a, b) => a - b);
  const placeChoices = advanced ? placeOptions : placeOptionsOf(rowPlaces);
  const rowFor = (p: number, l: number) => rows.find((r) => r.place === p && r.layout === l);
  const layoutChoices = layoutOptionsOf(
    (advanced
      ? layoutsForPlace(place)
      : rows.filter((r) => r.place === place).map((r) => r.layout)
    ).sort((a, b) => layoutHeadcount(a) - layoutHeadcount(b) || a - b),
  );
  /** 場所と配置を選ぶ。この相手の組にあればその組、なければ今の組のまま上書き */
  const choose = (p: number, l: number) => {
    const r = rowFor(p, l);
    set(r ? { row: r.index, place: undefined, layout: undefined } : { place: p, layout: l });
  };
  /** その場所の組のうち、今の段階にいちばん近いもの。なければ家の人がいちばん少ない配置 */
  const chooseAt = (p: number) => {
    const r = rows
      .filter((x) => x.place === p)
      .sort((a, b) => Math.abs((a.stage ?? 0) - stage) - Math.abs((b.stage ?? 0) - stage))[0];
    if (r) choose(r.place, r.layout);
    else choose(p, layoutsForPlace(p)[0]);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        約束はありません。相手を選んで、新しく約束を作れます。約束した日はいまの経過日数（{day + 1}
        日目）にします。
        その日の夜に、場所の扉から夜這いに入れます。日付が変わると「すっぽかし」で消えます。
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 sm:col-span-3">
          <SearchSelectRow
            label="相手の種類（セリフと戦闘力）"
            offset={promiseFieldOffset("type")}
            value={String(spec.type)}
            options={typeOptions}
            problem={blocked}
            warning={death}
            searchPlaceholder="名前・町の人の種類で検索"
            note="場所と配置の組はこれで決まる。選ぶと、名前・見た目と声・年齢・血液型は、ゲームがその種類で選ぶ候補の値になる（そのあと別々に変えられる）"
            onChange={(v) => {
              setError(null);
              setSpec(defaultSpec(promisePartner(Number(v))!, stage));
            }}
          />
          {!blocked && (!partner.checked || PARTNER_NOTES[spec.type]) && (
            <p className="text-muted-foreground text-xs">{PARTNER_NOTES[spec.type] ?? ""}</p>
          )}
        </div>
        <SelectRow
          label="場所"
          offset={PROMISE_OFFSET + PROMISE_PLACE_REL}
          value={String(place)}
          options={placeChoices}
          problem={blocked}
          disabled={placeChoices.length <= 1}
          warning={
            rowFor(place, layout) ? null : "この相手がゲームで約束する場所・配置ではありません"
          }
          hint={
            advanced
              ? "全部の場所から選べます（上級者モード）"
              : partner.kind === "town"
                ? "この種類で、いまの段階以下の組がある場所"
                : "名前のある相手は場所が決まっています（上級者モードで変えられます）"
          }
          note="夜這いに入る扉と、その先のマップ"
          onChange={(v) => chooseAt(Number(v))}
        />
        <div className="sm:col-span-2">
          <SelectRow
            label="配置（家の中の人）"
            offset={PROMISE_OFFSET + PROMISE_LAYOUT_REL}
            value={String(layout)}
            options={layoutChoices}
            problem={blocked}
            disabled={layoutChoices.length <= 1}
            hint={
              layoutChoices.length <= 1
                ? "この場所で選べる配置は1つだけです"
                : `この場所で選べる ${layoutChoices.length} 通り`
            }
            note={`${LAYOUT_NOTE}。段階が高い組ほど家の人が多い。ゲームはいまの段階の組を 70% で選び、30% で1段下げる`}
            onChange={(v) => choose(place, Number(v))}
          />
        </div>
        <SearchSelectRow
          label="名前"
          offset={promiseFieldOffset("name")}
          value={String(spec.name)}
          options={nameOptions}
          problem={blocked}
          searchPlaceholder="名前・英語名で検索"
          onChange={(v) => set({ name: Number(v) })}
        />
        <SearchSelectRow
          label="見た目と声"
          offset={promiseFieldOffset("look")}
          value={String(spec.look)}
          options={lookOptions}
          problem={blocked}
          searchPlaceholder="名前・町の人の種類で検索"
          onChange={(v) => set({ look: Number(v) })}
        />
        <SelectRow
          label="年齢"
          offset={promiseFieldOffset("age")}
          value={String(spec.age)}
          options={ageOptions}
          problem={blocked}
          onChange={(v) => set({ age: Number(v) })}
        />
        <SelectRow
          label="血液型"
          offset={promiseFieldOffset("blood")}
          value={String(spec.blood)}
          options={knownOptions(BLOOD_TYPES)}
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
              setError(null);
              setSpec(randomSpec(partner, stage));
            }}
          >
            ゲームと同じくじで選ぶ
          </Button>
          <Button
            size="sm"
            disabled={invalid !== null}
            onClick={() => {
              try {
                update((b) => createPromise(b, spec, { advanced }));
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            約束を作る
          </Button>
          {(error ?? invalid) && <p className="text-destructive text-xs">{error ?? invalid}</p>}
        </div>
      )}
    </div>
  );
}

function PromiseCard({ view }: { view: YobaiView | null }) {
  const promise = view?.promise ?? null;
  const problem = view?.promiseProblem ?? null;

  return (
    <AnchoredCard anchor={YOBAI_ANCHORS.currentPromise}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2"><ScopeAnchorLink />夜の約束</CardTitle>
        <CardDescription>
          約束中の相手・場所・名前・見た目などを書き換えられます。約束がないときは新しく作れます。
          <br />
          相手の種類・名前・見た目は別々に選べるので、自由に組み合わせられます。
          {/* 相手の種類（セリフと戦闘力）・名前・見た目と声は別々に決まる */}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {promise && !promise.active ? (
          <CreatePromiseForm problem={problem} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <TypeEditor promise={promise} problem={problem} />
            <PlaceLayoutEditor promise={promise} problem={problem} />
            <DayEditor promise={promise} problem={problem} />
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
        {record.index + 1}件目：{name}
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
  const problem = view?.recordsProblem ?? null;

  return (
    <CollapsibleCard
      anchor={YOBAI_ANCHORS.records}
      title="夜這いの記録"
      description={
        <>
          これまでの夜這いの記録を書き換えられます（記録を足したり消したりはできません）。
          <br />
          最大 {RECORD_CAPACITY} 件（今は {view ? view.count : "—"} 件）で、周回を始めると全部消えます。
          {/* 夜這いのたびに最初の空いている件に書かれる。見た目と声は記録に残らない */}
        </>
      }
      contentClassName="flex flex-col divide-y"
    >
      {!view && <p className="text-muted-foreground text-sm">—</p>}
      {view && view.records.length === 0 && (
        <p className="text-muted-foreground text-sm">記録はありません。</p>
      )}
      {problem && view && (
        <p className="text-muted-foreground pb-4 text-xs">読み取り専用：{problem}</p>
      )}
      {view?.records.map((r) => (
        <RecordRow key={r.index} record={r} problem={problem} />
      ))}
    </CollapsibleCard>
  );
}

function PointsCard({ view }: { view: YobaiPointsView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const problem = view?.problem ?? null;

  return (
    <CollapsibleCard
      anchor={YOBAI_ANCHORS.promise}
      title="夜這いの約束の条件"
      description={
        <>
          朱美・ローラ・三姉妹・メリンダと夜這いの約束をするための好感度とポイントです。
          <br />
          約束そのものは、条件を満たしてゲームの中で結びます。
        </>
      }
      contentClassName="grid gap-4 sm:grid-cols-3"
    >
      {YOBAI_POINTS.map((p) => {
        const current = view?.values.find((v) => v.offset === p.offset)?.value ?? null;
        const range = advanced ? "0〜255" : `0〜${POINT_NORMAL_MAX}`;
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
            hint={p.threshold === null ? range : `${range}。${p.threshold} 以上で約束`}
            note={p.note}
            warning={
              current !== null && current > POINT_NORMAL_MAX
                ? "通常の進行では見ない大きさの値です"
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
      title="夜這いの回数（表示だけ）"
      description={
        <>
          {/* ✅ 約束の画面の「夜這い回数」は 0x137EC。
              夜這い回数と相手ごとの回数は周回で消えず、記録と愛の証の回数は周回で消える */}
          夜這いの回数などの記録です。
          <br />
          周回で消える値と消えない値があるので、記録の数と合わないことがあります。
        </>
      }
      contentClassName="flex flex-col gap-4 text-sm"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {/* 🟢 段階（0x13E30）はゲーム内で数字として見えない内部の値なので出さない */}
        {/* 未読み込みのときは同じ行を「—」で出す */}
        {YOBAI_COUNTERS.filter((c) => c.offset !== 0x13e30).map((c) => (
          <p key={c.offset}>
            {c.label}：{view?.counters.find((v) => v.offset === c.offset)?.value ?? "—"}
            <span className="text-muted-foreground ml-2 text-xs">{c.note}</span>
          </p>
        ))}
      </div>
      <div>
        <p className="mb-2">
          相手ごとの夜這い回数
          <span className="text-muted-foreground ml-2 text-xs">
            特別な相手14人。さよと町の人は数えない
          </span>
        </p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {PARTNER_COUNT_NPCS.map((p, k) => (
            <p key={p.npc}>
              {p.label}：{view ? view.partners[k].value : "—"}
            </p>
          ))}
        </div>
      </div>
    </CollapsibleCard>
  );
}

export function YobaiPage() {
  const { save } = useSave();

  const result = useMemo(():
    | { view: YobaiView; points: YobaiPointsView }
    | { error: string }
    | null => {
    if (!save) return null;
    try {
      return { view: readYobai(save.working), points: readYobaiPoints(save.working) };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  }, [save]);

  if (result && "error" in result) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込めません</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  const view = result?.view ?? null;
  const k = save?.loadId ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {view?.promiseProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.promiseProblem}</AlertDescription>
        </Alert>
      )}

      {/*
        確度（docs: night-visit）：約束の場所・名前・見た目と声・セリフと戦闘力・年齢・血液型は ✅ 書き換えでゲームに反映。
        夜這いの記録は 🔶 差分からの推定で、書き換えの反映は未確認
      */}

      <PromiseCard key={`${k}-promise`} view={view} />
      <PointsCard key={`${k}-points`} view={result?.points ?? null} />
      <RecordsCard key={`${k}-records`} view={view} />
      <CountersCard view={view} />

      {/* 約束の枠の +0x00（約束したときの段階）・+0x02（まとまり）・+0x0C〜+0x1B・+0x26〜+0x2B は、約束を作るとき以外は書き換えない。記録の +0x08 は入った建物で表示しない */}
    </div>
  );
}
