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
  validatePersonField,
  validatePlaceLayout,
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
  PROMISE_PARTNERS,
  ageCandidates,
  bloodCandidates,
  createPromise,
  createProblem,
  currentStage,
  defaultSpec,
  nameCandidates,
  partnerDeathWarning,
  promisePartner,
  randomSpec,
  rowLabel,
  rowsFor,
  validateSpec,
  type PromisePartner,
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

/** 地区（「港」「町」など、場所の名前の最初の語）ごとにまとめる。実データで見た組は相手の名前を添える */
const placeLayoutOptions: SelectOption[] = PLACE_LAYOUTS.map((p) => ({
  value: `${p.place}:${p.layout}`,
  label: `${formatHex2(p.place)} ${placeLabel(p.place)}（配置 ${formatHex2(p.layout)}${p.note ? `・${p.note}` : ""}）`,
  group: placeLabel(p.place).split("　")[0],
  keywords: [
    placeLabel(p.place),
    formatHex2(p.place),
    formatHex2(p.layout),
    ...(p.note ? [p.note] : []),
  ],
}));

const placeOptions: SelectOption[] = PLACES.map((name, i) => ({
  value: String(i),
  label: `${formatHex2(i)} ${name}`,
}));

const knownOptions = (known: readonly KnownValue[]): SelectOption[] =>
  known.map((k) => ({ value: String(k.value), label: `${k.label}（${hex(k.value)}）` }));

/** 🟢 名前の表の全件。区分ごとにまとめ、英語名でも検索できるようにする */
const nameOptions: SelectOption[] = NPC_NAMES.map((n) => ({
  value: String(n.id),
  label: `${npcLabel(n.labelId)}（${hex(n.id)}）`,
  group: npcNameGroup(n.id),
  keywords: [...labelKeywords({ kind: "npc", id: n.labelId }), String(n.id), hex(n.id)],
}));

const PERSON_FIELDS: Record<
  PersonField,
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
    options: knownOptions(KNOWN_LOOKS),
    note: "見た目（モデル）と声。はるなをさよの値にすると、見た目と声がさよになった。台詞・強さ・名前は変わらない（確認済み）",
  },
  type: {
    label: "しゃべり方と戦闘力",
    options: knownOptions(KNOWN_TYPES),
    note: "はるなをさよの値にすると、台詞がさよの「・・・」になり、体力・攻撃力が高くなった。見た目・声・名前は変わらない（確認済み）",
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
    label: "約束した日",
    options: null,
    badge: { mark: "🔶", text: "推定。書き換えの効果は未確認" },
    note: "約束の +0x28・記録の +0x0C。経過日数（1日目＝0）。約束は9人とも約束したセーブの日付と一致し、記録の +0x0C も約束の +0x28 と同じ値だった。画面では「N日目」で表示する",
  },
  group: {
    label: "相手の種類（生の値）",
    options: null,
    badge: { mark: "❓", text: "意味は未確認" },
    note: "日付ではない（1日目に町の人と約束して 1 だった。確認済み）。さよ・先生は 0、町の人は 1〜3",
  },
};

function hintFor(field: PersonField, advanced: boolean): string {
  if (field === "age")
    return advanced ? "0〜255（255＝？）" : `0〜${AGE_NORMAL_MAX}、または 255（？）`;
  if (field === "group") return "0〜0xFFFF";
  if (field === "day") return advanced ? "1〜65536日目" : `1〜${DAY_NORMAL_MAX + 1}日目`;
  return advanced ? "10進数か 0x 付きの16進数" : "確認済みの値";
}

/**
 * 人物の1項目。確認済みの値がある項目は選択肢から選び、上級者モードでは生の値の欄も出す。
 * 年齢は数値で入力する。相手の種類（❓）は上級者モードでだけ書ける
 */
function PersonFieldEditor({
  field,
  offset,
  current,
  problem,
  write,
}: {
  field: PersonField;
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

  if (field === "group")
    return (
      <FieldRow
        // 上級者モードを切り替えたときに入力欄を作り直す
        key={String(advanced)}
        label={spec.label}
        offset={offset}
        badges={badges}
        value={current}
        problem={
          problem ?? (advanced ? null : "意味が分かっていない値です（上級者モードで書けます）")
        }
        format={hex}
        parse={(input) => parseNumber(input, validate)}
        apply={apply}
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
        parse={(input) => parseNumber(input, validate)}
        apply={apply}
        inputMode="numeric"
        hint={hintFor(field, advanced)}
        note={spec.note}
        warning={current === AGE_UNKNOWN ? "「？」と表示される値です" : null}
      />
    );

  return (
    <div className="flex flex-col gap-2">
      {spec.search ? (
        <SearchSelectRow
          label={spec.label}
          offset={offset}
          badges={badges}
          value={current === null ? null : String(current)}
          currentLabel={current === null ? undefined : `${hex(current)} 不明`}
          options={spec.options}
          problem={problem}
          note={spec.note}
          searchPlaceholder="名前・英語名・ID で検索"
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
      )}
      {advanced && !problem && (
        <FieldRow
          // 選択肢で値を変えたときに入力欄を作り直す
          key={current}
          label={`${spec.label}（生の値）`}
          offset={offset}
          value={current}
          problem={problem}
          format={hex}
          parse={(input) => parseNumber(input, validate)}
          apply={apply}
          hint={hintFor(field, advanced)}
        />
      )}
    </div>
  );
}

function PlaceEditor({ promise, problem }: { promise: PromiseView; problem: string | null }) {
  const { update } = useSave();
  const { advanced } = useAdvancedMode();
  const offset = PROMISE_OFFSET + PROMISE_PLACE_REL;
  const current = { place: promise.place, layout: promise.layout };
  const pairValue = `${promise.place}:${promise.layout}`;
  const known = PLACE_LAYOUTS.some((p) => `${p.place}:${p.layout}` === pairValue);

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <SearchSelectRow
        label="場所と配置"
        offset={offset}
        value={pairValue}
        currentLabel={`${formatHex2(promise.place)} ${placeLabel(promise.place)}（配置 ${formatHex2(promise.layout)}。未確認の組）`}
        options={placeLayoutOptions}
        problem={problem}
        warning={
          known ? null : "確認済みの組ではありません。布団の位置がおかしくなることがあります"
        }
        hint="正しい組だけを選べます"
        searchPlaceholder="場所・配置・相手の名前で検索"
        note="+0x08 は夜這いに入る扉と、その先のマップ。+0x0A はその先での人と布団の配置。場所だけを変えると、布団が宙に浮いたり壁にめり込んだりした（確認済み）。組は約束で使われる72組（相手の名前があるものは実データで見た組）"
        onChange={(v) => {
          const [place, layout] = v.split(":").map(Number);
          update((b) => writePromisePlace(b, place, layout, { advanced }));
        }}
      />
      {advanced && !problem && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectRow
            label="場所だけ（+0x08）"
            offset={offset}
            value={String(promise.place)}
            currentLabel={`${formatHex2(promise.place)} 名前なし`}
            options={placeOptions}
            problem={problem}
            note="配置（+0x0A）は変えません"
            onChange={(v) =>
              update((b) => writePromisePlace(b, Number(v), promise.layout, { advanced }))
            }
          />
          <FieldRow
            key={promise.layout}
            label="配置だけ（+0x0A）"
            offset={PROMISE_OFFSET + PROMISE_LAYOUT_REL}
            value={promise.layout}
            problem={problem}
            format={hex}
            parse={(input) =>
              parseNumber(input, (v) =>
                validatePlaceLayout(promise.place, v, current, { advanced }),
              )
            }
            apply={(v) => update((b) => writePromisePlace(b, promise.place, v, { advanced }))}
            hint="0〜0xFFFF"
          />
        </div>
      )}
    </div>
  );
}

const PROMISE_ORDER: PersonField[] = ["name", "look", "type", "age", "blood", "day", "group"];
const RECORD_ORDER = ["name", "type", "day", "age", "blood"] as const;

const PARTNER_GROUPS = ["名前のある相手", "町の人（女性）", "町の人（男性）"] as const;
const partnerGroup = (p: PromisePartner) => (p.kind === "special" ? PARTNER_GROUPS[0] : p.sex === "f" ? PARTNER_GROUPS[1] : PARTNER_GROUPS[2]);

/** 相手の選択肢。名前のある相手 → 町の女性 → 町の男性の順 */
const partnerOptions: SelectOption[] = PARTNER_GROUPS.flatMap((g) =>
  PROMISE_PARTNERS.filter((p) => partnerGroup(p) === g).map((p) => ({
    value: String(p.type),
    label: `${p.label}（${hex(p.type)}）${p.note ? `・${p.note}` : ""}`,
    group: g,
    keywords: [p.label, hex(p.type), String(p.type), p.note],
  })),
);

/** 名前のある相手ごとの注意（約束の外で変わる値など） */
const PARTNER_NOTES: Readonly<Record<number, string>> = {
  442: "ゲームでは約束のあとの場面の移動で必ず翌朝になり、すっぽかしになる相手です（書き込みで作った約束では夜這いできた。確認済み）",
  448: "ゲームで約束すると、その人の拷問のポイントが 0 になります（ここでは書きません）",
  449: "ゲームで約束すると、その人の拷問のポイントが 0 になります（ここでは書きません）",
  450: "ゲームで約束すると、その人の拷問のポイントが 0 になります（ここでは書きません）",
  454: "🔶 読み込み直すとローラの印が消えるので、褒美が「掘り出し物」にならないことがあります（ゲームが作った約束でも同じ）",
  592: "ゲームでは、なりわいのフラグ 0x0126 が 76（手合わせの賭けに峰打ちで勝った）のときに約束します（ここでは書きません）",
  788: "ゲームで約束すると、なりわいのフラグ 0x012F が 1 になります（ここでは書きません）",
};

const lookLabel = (v: number) => {
  const known = KNOWN_LOOKS.find((k) => k.value === v);
  return known ? `${hex(v)}（${known.label}の見た目）` : hex(v);
};
const ageLabel = (v: number) => (v === AGE_UNKNOWN ? "？" : `${v}歳`);
const bloodLabel = (v: number) => BLOOD_TYPES.find((b) => b.value === v)?.label ?? String(v);

/** 空の約束の枠に約束を作る。値は相手の候補から選ぶ（ゲームが約束するときと同じ候補） */
function CreatePromiseForm({ problem }: { problem: string | null }) {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const stage = save ? currentStage(save.working) : 0;
  const day = save ? readU16(save.working, DAY_INDEX_OFFSET) : 0;
  const [spec, setSpec] = useState<PromiseSpec>(() => defaultSpec(promisePartner(0x25)!, stage));
  const [error, setError] = useState<string | null>(null);
  const partner = promisePartner(spec.type)!;
  const blocked = problem ?? (save ? createProblem(save.working) : "セーブファイルが読み込まれていません");
  const invalid = validateSpec(spec, stage, { advanced });
  const death = save ? partnerDeathWarning(save.working, spec.type) : null;
  const set = (patch: Partial<PromiseSpec>) => {
    setError(null);
    setSpec((s) => ({ ...s, ...patch }));
  };

  const rowOptions: SelectOption[] = rowsFor(partner, stage, { advanced }).map((r) => ({
    value: String(r.index),
    label: `${rowLabel(r)}${r.checked ? "・確かめた組" : ""}`,
  }));
  const names = advanced && partner.kind === "town" ? NPC_NAMES.map((n) => n.id) : nameCandidates(partner);
  const nameChoices: SelectOption[] = names.map((id) => ({ value: String(id), label: `${nameLabel(id)}（${id}）`, keywords: [String(id), hex(id)] }));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        約束はありません。相手を選んで、新しく約束を作れます。約束した日はいまの経過日数（{day + 1}日目）にします。
        その日の夜に、場所の扉から夜這いに入れます。日付が変わると「すっぽかし」で消えます。
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 sm:col-span-3">
          <SearchSelectRow
            label="相手"
            offset={promiseFieldOffset("type")}
            value={String(spec.type)}
            options={partnerOptions}
            problem={blocked}
            warning={death}
            searchPlaceholder="相手の名前・種類・ID で検索"
            note="約束の枠の +0x04（しゃべり方と戦闘力の型）。名前のある相手は、組・名前・見た目・年齢・血液型が1つに決まっています。町の人は種類ごとの候補から選びます"
            onChange={(v) => {
              setError(null);
              setSpec(defaultSpec(promisePartner(Number(v))!, stage));
            }}
          />
          {!blocked && (
            <p className="text-muted-foreground text-xs">
              {partner.status.startsWith("✅")
                ? `ゲームで確かめた相手です（${partner.status.replace("✅ ", "")}）。`
                : "🟢 値はほかの相手と同じ作り方で決めましたが、この相手での夜這いはまだ確かめていません（要ゲーム内確認）。"}
              {PARTNER_NOTES[spec.type] ? ` ${PARTNER_NOTES[spec.type]}` : ""}
            </p>
          )}
        </div>
        <div className="sm:col-span-3">
          <SelectRow
            label="場所と配置"
            offset={PROMISE_OFFSET}
            value={String(spec.row)}
            options={rowOptions}
            problem={blocked}
            disabled={rowOptions.length <= 1}
            hint={
              partner.kind === "town"
                ? advanced
                  ? `まとまり ${partner.group} の全部の組`
                  : `まとまり ${partner.group} の組のうち、いまの段階（${stage}）以下のもの`
                : undefined
            }
            note="約束の枠の +0x00〜+0x1B に写す組。段階が高い組ほど、家の中の人（家の者・用心棒）が多い。ゲームはいまの段階の組を 70% で選び、30% で1段下げる"
            onChange={(v) => set({ row: Number(v) })}
          />
        </div>
        <SearchSelectRow
          label="名前"
          offset={promiseFieldOffset("name")}
          value={String(spec.name)}
          options={nameChoices}
          problem={blocked}
          disabled={nameChoices.length <= 1}
          hint={partner.kind === "town" && !advanced ? `町の人の名前（${partner.sex === "f" ? "女性" : "男性"}）から` : undefined}
          searchPlaceholder="名前・ID で検索"
          onChange={(v) => set({ name: Number(v) })}
        />
        <SelectRow
          label="見た目と声"
          offset={promiseFieldOffset("look")}
          value={String(spec.look)}
          options={partner.looks.map((v) => ({ value: String(v), label: lookLabel(v) }))}
          problem={blocked}
          disabled={partner.looks.length <= 1}
          onChange={(v) => set({ look: Number(v) })}
        />
        <SelectRow
          label="年齢"
          offset={promiseFieldOffset("age")}
          value={String(spec.age)}
          options={ageCandidates(partner).map((v) => ({ value: String(v), label: ageLabel(v) }))}
          problem={blocked}
          disabled={!partner.ageRandom}
          onChange={(v) => set({ age: Number(v) })}
        />
        <SelectRow
          label="血液型"
          offset={promiseFieldOffset("blood")}
          value={String(spec.blood)}
          options={bloodCandidates(partner).map((v) => ({ value: String(v), label: bloodLabel(v) }))}
          problem={blocked}
          disabled={partner.blood !== 0}
          onChange={(v) => set({ blood: Number(v) })}
        />
      </div>
      {!blocked && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={partner.kind === "special"}
            onClick={() => {
              setError(null);
              setSpec(randomSpec(partner, stage));
            }}
          >
            くじで選び直す
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
        <CardTitle className="flex flex-wrap items-center gap-2">
          夜の約束
          <CertaintyBadge mark="🔶" text="配置の意味は推定" />
        </CardTitle>
        <CardDescription>
          {formatOffset(PROMISE_OFFSET)} から 0x2C
          B。約束中の相手の名前・見た目・年齢などを書き換えます。
          名前・見た目と声・しゃべり方と戦闘力は別々に決まるので、組み合わせを変えられます。
          約束がないとき（+0x04 が 0xFFFFFFFF）は、新しく約束を作れます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {promise && !promise.active ? (
          <CreatePromiseForm problem={problem} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {promise && <PlaceEditor promise={promise} problem={problem} />}
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
          約束の場所・名前・見た目と声・しゃべり方と戦闘力・年齢・血液型は、書き換えでゲームに反映されることを確認済みです（解析ドキュメントの
          night-visit）。
          配置は確認済みの組だけを選べます。夜這いの記録は差分からの推定で、書き換えの反映は確かめていません。
          書き換える前のセーブを残してから試してください。
        </AlertDescription>
      </Alert>

      <PointsCard key={`${k}-points`} view={result?.points ?? null} />
      <PromiseCard key={`${k}-promise`} view={view} />
      <RecordsCard key={`${k}-records`} view={view} />
      <CountersCard view={view} />

      <p className="text-muted-foreground text-xs">
        約束の枠の
        +0x00（約束したときの段階）・+0x0C〜+0x1B（意味は未確認）・+0x26〜+0x2B（初めての説明を見たかのビットなど）は書き換えません。
        {` `}記録の +0x08（入った建物）は {formatOffset(RECORDS_OFFSET + RECORD_BUILDING_REL)} から
        16 B 刻みです。
      </p>
    </div>
  );
}
