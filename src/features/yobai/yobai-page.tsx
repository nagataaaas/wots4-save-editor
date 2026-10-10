import { useMemo, useState } from "react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { FieldRow, type ParseResult } from "@/components/field-row";
import type { SelectOption } from "@/components/select-options";
import { SearchSelectRow } from "@/components/search-select-row";
import { SelectRow } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatHex2, formatOffset } from "@/lib/format";
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
  PARTNER_COUNTS_OFFSET,
  RECORD_CAPACITY,
  RECORDS_OFFSET,
  RECORD_BUILDING_REL,
  promiseFieldOffset,
  readYobai,
  recordFieldOffset,
  recordOffset,
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

const hex = (v: number) => `0x${v.toString(16).toUpperCase()}`;

/** 10進数か 0x 付きの16進数 */
function parseNumber(input: string, validate: (v: number) => string | null): ParseResult<number> {
  const s = input.trim();
  let value: number;
  if (/^0x[0-9a-f]+$/i.test(s)) value = Number.parseInt(s.slice(2), 16);
  else if (/^\d+$/.test(s)) value = Number(s);
  else return { ok: false, error: "整数（10進数、または 0x 付きの16進数）を入力してください" };
  const error = validate(value);
  return error ? { ok: false, error } : { ok: true, value };
}

const placeLabel = (place: number) => PLACES[place] ?? "名前なし";

/** 場所の選択肢1つ。地区（「港」「町」など、場所の名前の最初の語）ごとにまとめる */
const placeOption = (place: number): SelectOption => ({
  value: String(place),
  label: `${formatHex2(place)} ${placeLabel(place)}`,
  group: placeLabel(place).split(/[ 　]/)[0],
});

/** 🟢 約束で使われる場所（00〜22 の全部） */
const placeOptions: SelectOption[] = [...new Set(PLACE_LAYOUTS.map((p) => p.place))].map(
  placeOption,
);

/** 配置の説明（欄の注記） */
const LAYOUT_NOTE =
  "+0x0A。夜這いの場の家の種類・家の人・犬・布団と、その座標の組 🟢。家の中の人は配置だけで決まる（家の人の見た目は家の種類ごとの組から選ばれ、強さは同じ）。" +
  "場所ごとに使える配置が決まっていて、ほかの配置にすると布団が宙に浮いたり壁にめり込んだりした（確認済み）";

/** 配置の選択肢1つ。家の種類と人数で表示する */
function layoutOption(layout: number, extra?: string): SelectOption {
  return {
    value: String(layout),
    label: `${layoutLabel(layout)}（配置 ${formatHex2(layout)}${extra ? `・${extra}` : ""}）`,
  };
}

const knownOptions = (known: readonly KnownValue[]): SelectOption[] =>
  known.map((k) => ({ value: String(k.value), label: `${k.label}（${hex(k.value)}）` }));

/** 🟢 セリフと戦闘力：約束できる相手の種類。名前のある相手 → 町の女性 → 町の男性の順 */
const TYPE_KINDS = ["名前のある相手", "町の人（女性）", "町の人（男性）"] as const;
const typeOptions: SelectOption[] = TYPE_KINDS.flatMap((kind) =>
  KNOWN_TYPES.filter((t) => t.kind === kind).map((t) => ({
    value: String(t.value),
    label: `${t.label}（${hex(t.value)}）`,
    group: kind,
    keywords: [t.label, hex(t.value), String(t.value)],
  })),
);

/** 🟢 見た目と声：見た目の表の全件。女性・男性に分け、その見た目を使う町の人の種類でも検索できるようにする */
const lookOptions: SelectOption[] = (["f", "m"] as const).flatMap((sex) =>
  KNOWN_LOOKS.filter((l) => l.sex === sex).map((l) => ({
    value: String(l.value),
    label: `${l.label}（${hex(l.value)}）`,
    group: sex === "f" ? "女性" : "男性",
    keywords: [l.label, l.usedBy, hex(l.value), String(l.value)],
  })),
);

/** 🟢 名前の表の全件。区分ごとにまとめ、英語名でも検索できるようにする */
const nameOptions: SelectOption[] = NPC_NAMES.map((n) => ({
  value: String(n.id),
  label: `${npcLabel(n.labelId)}（${hex(n.id)}）`,
  group: npcNameGroup(n.id),
  keywords: [...labelKeywords({ kind: "npc", id: n.labelId }), String(n.id), hex(n.id)],
}));

const PERSON_FIELDS: Record<
  EditableField,
  {
    label: string;
    options: readonly SelectOption[] | null;
    search?: boolean;
    note: string;
    badge?: { mark: "🔶" | "❓"; text: string };
  }
> = {
  name: {
    label: "名前",
    options: nameOptions,
    search: true,
    note: "名前の ID。はるなをさよの値にすると、名前がさよになった（確認済み）。約束の画面に職業は出ない。町の人の名前は「町の人の名前」から、相手の性別に合わせて選ばれる",
  },
  look: {
    label: "見た目と声",
    options: lookOptions,
    search: true,
    note: "見た目（モデル）と声。町の人の約束では、町で出会った相手の見た目が入る。はるなをさよの値にすると、見た目と声がさよになった。台詞・強さ・名前は変わらない（確認済み）。番号は主人公設定の人物と同じ。声は見た目の顔で決まり、多くの見た目が同じ声を使う。ただし相手の種類が万由・千佳・百合のときは、声は種類のまま 🟢",
  },
  type: {
    label: "相手の種類（セリフと戦闘力）",
    options: typeOptions,
    search: true,
    note: "町の人の種類。台詞と強さが決まる（はるなをさよの値にすると、台詞がさよの「・・・」になり、体力・攻撃力が高くなった。見た目・声・名前は変わらない。確認済み）。多くの種類が同じ会話を使い、強さは種類ごとに違う。名前のある相手の種類にすると、夜這いのあとその人の夜這い回数が増える 🟢",
  },
  age: {
    label: "年齢",
    options: null,
    note: "0x30（48）にすると48歳と表示された（確認済み）。255 は「？」（さよ）",
  },
  blood: {
    label: "血液型",
    options: knownOptions(BLOOD_TYPES),
    note: "1＝A、2＝B、3＝O、4＝AB（確認済み）。5 は「？」（さよ）",
  },
  day: {
    label: "夜這いした日",
    options: null,
    note: "記録の +0x0C。経過日数（1日目＝0）。🟢 約束した日と同じ日になる。画面では「N日目」で表示する",
  },
};

function hintFor(field: EditableField, advanced: boolean): string | undefined {
  if (field === "age")
    return advanced ? "0〜255（255＝？）" : `0〜${AGE_NORMAL_MAX}、または 255（？）`;
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
  const badges = spec.badge ? (
    <CertaintyBadge mark={spec.badge.mark} text={spec.badge.text} />
  ) : undefined;
  const apply = (v: number) => update((b) => write(b, v, { advanced }));
  const validate = (v: number) => validatePersonField(field, v, current ?? 0, { advanced });

  if (field === "day")
    return (
      <FieldRow
        label={spec.label}
        offset={offset}
        badges={badges}
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
        badges={badges}
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
      badges={badges}
      value={current === null ? null : String(current)}
      currentLabel={current === null ? undefined : `${hex(current)} 不明`}
      options={spec.options}
      problem={problem}
      note={spec.note}
      searchPlaceholder={
        field === "name" ? "名前・英語名・ID で検索" : "名前・町の人の種類・ID で検索"
      }
      onChange={(v) => apply(Number(v))}
    />
  ) : (
    <SelectRow
      label={spec.label}
      offset={offset}
      badges={badges}
      value={current === null ? null : String(current)}
      currentLabel={current === null ? undefined : `${hex(current)} 不明`}
      options={spec.options}
      problem={problem}
      note={spec.note}
      onChange={(v) => apply(Number(v))}
    />
  );
}

/**
 * 場所（+0x08）と配置（+0x0A）。配置はその場所で使える配置（🟢 PLACE_LAYOUTS）だけを、家の中の人数で選ぶ。
 * 場所を変えると、今の配置がその場所で使えなければ、家の中の人がいちばん少ない配置にする
 */
function PlaceLayoutEditor({ promise, problem }: { promise: PromiseView; problem: string | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const layouts = layoutsForPlace(promise.place);
  const valid = layouts.includes(promise.layout);

  return (
    <>
      <SelectRow
        label="場所"
        offset={PROMISE_OFFSET + PROMISE_PLACE_REL}
        value={String(promise.place)}
        currentLabel={`${formatHex2(promise.place)} 名前なし`}
        options={placeOptions}
        problem={problem}
        note="+0x08。夜這いに入る扉と、その先のマップ（確認済み）。場所を変えると、配置もその場所で使えるものに合わせる"
        onChange={(v) => {
          const place = Number(v);
          const next = layoutsForPlace(place);
          const layout = next.includes(promise.layout) ? promise.layout : next[0];
          update((b) => writePromisePlace(b, place, layout, { advanced }));
        }}
      />
      <SelectRow
        label="配置（家の中の人）"
        offset={PROMISE_OFFSET + PROMISE_LAYOUT_REL}
        value={String(promise.layout)}
        currentLabel={`${layoutLabel(promise.layout)}（配置 ${formatHex2(promise.layout)}。この場所では使われない配置）`}
        options={layouts.map((l) => layoutOption(l))}
        problem={problem}
        warning={
          valid
            ? null
            : "この場所で使われる配置ではありません。布団の位置がおかしくなることがあります"
        }
        hint={
          layouts.length <= 1
            ? "この場所で使える配置は1つだけです"
            : `この場所で使える ${layouts.length} 通り`
        }
        note={LAYOUT_NOTE}
        onChange={(v) =>
          update((b) => writePromisePlace(b, promise.place, Number(v), { advanced }))
        }
      />
    </>
  );
}

/**
 * 相手の種類（+0x04）。名前のある相手の種類にしたとき、場所と配置がその相手のもの（組の表の行）と違えば、合わせるボタンを出す
 */
function TypeEditor({ promise, problem }: { promise: PromiseView; problem: string | null }) {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const partner = promisePartner(promise.type);
  const death = save ? partnerDeathWarning(save.working, promise.type) : null;
  const home = partner?.row != null ? PROMISE_ROWS.find((r) => r.index === partner.row) : undefined;
  const away =
    home && (home.place !== promise.place || home.layout !== promise.layout) ? home : undefined;

  return (
    <div className="flex flex-col gap-2 sm:col-span-3">
      <SearchSelectRow
        label={PERSON_FIELDS.type.label}
        offset={promiseFieldOffset("type")}
        value={String(promise.type)}
        currentLabel={`${hex(promise.type)} 約束できる相手の表にない種類`}
        options={typeOptions}
        problem={problem}
        warning={death}
        note={PERSON_FIELDS.type.note}
        searchPlaceholder="名前・町の人の種類・ID で検索"
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
 * 約束した日（+0x28）。🟢 場面が変わるたびに今日の経過日数と比べ、違えばすっぽかしで消える。
 * 「N日目」で入力する。今日でなければ警告を出す
 */
function DayEditor({ promise, problem }: { promise: PromiseView; problem: string | null }) {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const today = save ? readU16(save.working, DAY_INDEX_OFFSET) : promise.day;
  const isToday = promise.day === today;

  return (
    <FieldRow
      label="約束した日"
      offset={promiseFieldOffset("day")}
      value={promise.day}
      problem={problem}
      format={(v) => `${v + 1}`}
      parse={(input) => {
        const r = parseNumber(input, (v) =>
          v < 1
            ? "1日目以上を指定してください"
            : validatePersonField("day", v - 1, promise.day, { advanced }),
        );
        return r.ok ? { ok: true, value: r.value - 1 } : r;
      }}
      apply={(v) => update((b) => writePromiseField(b, "day", v, { advanced }))}
      inputMode="numeric"
      warning={
        isToday
          ? null
          : `今日（${today + 1}日目）ではないので、次に場面が変わるとすっぽかしで消えます 🟢`
      }
      hint={`${hintFor("day", advanced)}。今日は ${today + 1}日目`}
      note="+0x28。約束した日の経過日数（1日目＝0）。画面では「N日目」で入力する。🟢 場面が変わるたびに今日と比べ、違えば「夜這いの約束をすっぽかしてしまった…」で約束が消える"
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
  const placeChoices = advanced ? placeOptions : rowPlaces.map(placeOption);
  const rowFor = (p: number, l: number) => rows.find((r) => r.place === p && r.layout === l);
  const layoutChoices = (
    advanced ? layoutsForPlace(place) : rows.filter((r) => r.place === place).map((r) => r.layout)
  )
    .sort((a, b) => layoutHeadcount(a) - layoutHeadcount(b) || a - b)
    .map((l) => {
      const r = rowFor(place, l);
      return layoutOption(l, r?.stage != null ? `段階 ${r.stage}` : undefined);
    });
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
            searchPlaceholder="名前・町の人の種類・ID で検索"
            note="約束の枠の +0x04。場所と配置の組はこれで決まる。選ぶと、名前・見た目と声・年齢・血液型は、ゲームがその種類で選ぶ候補の値になる（そのあと別々に変えられる）"
            onChange={(v) => {
              setError(null);
              setSpec(defaultSpec(promisePartner(Number(v))!, stage));
            }}
          />
          {!blocked && (!partner.status.startsWith("✅") || PARTNER_NOTES[spec.type]) && (
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
                ? `この種類で、いまの段階（${stage}）以下の組がある場所`
                : "名前のある相手は場所が決まっています（上級者モードで変えられます）"
          }
          note="+0x08。夜這いに入る扉と、その先のマップ"
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
          searchPlaceholder="名前・英語名・ID で検索"
          onChange={(v) => set({ name: Number(v) })}
        />
        <SearchSelectRow
          label="見た目と声"
          offset={promiseFieldOffset("look")}
          value={String(spec.look)}
          options={lookOptions}
          problem={blocked}
          searchPlaceholder="名前・町の人の種類・ID で検索"
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
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">夜の約束</CardTitle>
        <CardDescription>
          {formatOffset(PROMISE_OFFSET)} から 0x2C
          B。約束中の相手の種類・場所・名前・見た目・年齢などを書き換えます。
          相手の種類（セリフと戦闘力）・名前・見た目と声は別々に決まるので、組み合わせを変えられます。
          約束がないとき（+0x04 が 0xFFFFFFFF）は、新しく約束を作れます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {promise && !promise.active ? (
          <CreatePromiseForm problem={problem} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {promise && (
              <>
                <TypeEditor promise={promise} problem={problem} />
                <PlaceLayoutEditor promise={promise} problem={problem} />
                <DayEditor promise={promise} problem={problem} />
              </>
            )}
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
    </Card>
  );
}

function RecordRow({ record, problem }: { record: RecordView; problem: string | null }) {
  const name = nameLabel(record.name);
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <p className="text-sm font-medium">
        {record.index + 1}件目：{name}
        <span className="text-muted-foreground ml-2 font-mono text-xs">
          {formatOffset(recordOffset(record.index))}　入った建物 {hex(record.building)}
        </span>
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

function RecordsCard({ view }: { view: YobaiView | null }) {
  const problem = view?.recordsProblem ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          夜這いの記録
          <CertaintyBadge mark="🔶" text="書き換えの反映は未確認" />
        </CardTitle>
        <CardDescription>
          {formatOffset(RECORDS_OFFSET)} から 16 B × {RECORD_CAPACITY}{" "}
          件。夜這いのたびに、最初の空いている件に書かれます （
          {view ? `今は ${view.count} 件` : "未読み込み"}。周回を始めると全部消えます）。
          今ある記録の項目だけを書き換えます（記録を足したり消したりする機能はありません）。
          見た目と声は記録に残りません。+0x08 の入った建物の番号は表示だけです。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {view && view.records.length === 0 && (
          <p className="text-muted-foreground text-sm">記録はありません。</p>
        )}
        {problem && view && (
          <p className="text-muted-foreground pb-4 text-xs">読み取り専用：{problem}</p>
        )}
        {view?.records.map((r) => (
          <RecordRow key={r.index} record={r} problem={problem} />
        ))}
      </CardContent>
    </Card>
  );
}

function PointsCard({ view }: { view: YobaiPointsView | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const problem = view?.problem ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">夜這いの約束の条件</CardTitle>
        <CardDescription>
          朱美・ローラ・三姉妹・メリンダと夜這いの約束をするための好感度とポイントです（
          {formatOffset(0x3792)}〜{formatOffset(0x3797)}）。
          約束そのものはゲームの中で、条件を満たした場面を通って作ります。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {YOBAI_POINTS.map((p) => {
          const current = view?.values.find((v) => v.offset === p.offset)?.value ?? null;
          const range = advanced ? "0〜255" : `0〜${POINT_NORMAL_MAX}`;
          return (
            <FieldRow
              key={p.offset}
              label={p.label}
              offset={p.offset}
              badges={
                p.pending ? (
                  <CertaintyBadge mark={p.threshold === null ? "❓" : "🔶"} text={p.pending} />
                ) : undefined
              }
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
                  ? `通常の進行では見ない値です（${current}）`
                  : null
              }
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function CountersCard({ view }: { view: YobaiView | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          夜這いの回数（表示だけ）
        </CardTitle>
        <CardDescription>
          夜這いが終わるたびに増える値です。約束の画面の「夜這い回数」は {formatOffset(0x137ec)}
          （確認済み）。
          夜這い回数と相手ごとの回数は周回で消えず、記録・段階・愛の証の回数は周回で消えるので、記録の数と合わないことがあります。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          {view?.counters.map((c) => (
            <p key={c.offset}>
              {c.label}（<span className="font-mono">{formatOffset(c.offset)}</span>）：{c.value}
              <span className="text-muted-foreground ml-2 text-xs">{c.note}</span>
            </p>
          ))}
        </div>
        <div>
          <p className="mb-2">
            相手ごとの夜這い回数（{formatOffset(PARTNER_COUNTS_OFFSET)}〜、u32）
            <span className="text-muted-foreground ml-2 text-xs">
              特別な相手14人。さよと町の人は数えない
            </span>
          </p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {view?.partners.map((p) => (
              <p key={p.offset}>
                {p.label}：{p.value}
                <span className="text-muted-foreground ml-1 font-mono text-xs">
                  {formatOffset(p.offset)}
                </span>
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
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
      {!view && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>
            サイドバーの「ファイルを開く」から読み込むと、下の項目を編集できます。
          </AlertDescription>
        </Alert>
      )}

      {view?.promiseProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.promiseProblem}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertTitle>検証用（一部は要ゲーム内確認）</AlertTitle>
        <AlertDescription>
          約束の場所・名前・見た目と声・セリフと戦闘力・年齢・血液型は、書き換えでゲームに反映されることを確認済みです（解析ドキュメントの
          night-visit）。
          配置はその場所で使えるものだけを選べます。夜這いの記録は差分からの推定で、書き換えの反映は確かめていません。
          書き換える前のセーブを残してから試してください。
        </AlertDescription>
      </Alert>

      <PointsCard key={`${k}-points`} view={result?.points ?? null} />
      <PromiseCard key={`${k}-promise`} view={view} />
      <RecordsCard key={`${k}-records`} view={view} />
      <CountersCard view={view} />

      <p className="text-muted-foreground text-xs">
        約束の枠の
        +0x00（約束したときの段階）・+0x02（まとまり）・+0x0C〜+0x1B（意味は未確認）・+0x26〜+0x2B（初めての説明を見たかのビットなど）は、約束を作るとき以外は書き換えません。
        {` `}記録の +0x08（入った建物）は {formatOffset(RECORDS_OFFSET + RECORD_BUILDING_REL)} から
        16 B 刻みです。
      </p>
    </div>
  );
}
