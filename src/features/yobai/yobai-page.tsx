import { useMemo } from "react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { FieldRow, type ParseResult } from "@/components/field-row";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatHex2, formatOffset } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import {
  AGE_NORMAL_MAX,
  AGE_UNKNOWN,
  BLOOD_TYPES,
  KNOWN_LOOKS,
  KNOWN_NAMES,
  KNOWN_TYPES,
  PLACES,
  PLACE_LAYOUTS,
  PROMISE_LAYOUT_REL,
  PROMISE_OFFSET,
  PROMISE_PLACE_REL,
  RECORD_CAPACITY,
  RECORD_COUNT_OFFSET,
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

const placeLayoutOptions: SelectOption[] = PLACE_LAYOUTS.map((p) => ({
  value: `${p.place}:${p.layout}`,
  label: `${formatHex2(p.place)} ${placeLabel(p.place)}（配置 ${formatHex2(p.layout)}）`,
}));

const placeOptions: SelectOption[] = PLACES.map((name, i) => ({ value: String(i), label: `${formatHex2(i)} ${name}` }));

const PERSON_FIELDS: Record<
  PersonField,
  { label: string; known: readonly KnownValue[] | null; note: string; badge?: string }
> = {
  name: {
    label: "名前",
    known: KNOWN_NAMES,
    note: "名前（または NPC の ID）。はるなをさよの値にすると、名前がさよになった（確認済み）。約束の画面に職業は出ない",
  },
  look: {
    label: "見た目と声",
    known: KNOWN_LOOKS,
    note: "見た目（モデル）と声。はるなをさよの値にすると、見た目と声がさよになった。台詞・強さ・名前は変わらない（確認済み）",
  },
  type: {
    label: "しゃべり方と戦闘力",
    known: KNOWN_TYPES,
    note: "はるなをさよの値にすると、台詞がさよの「・・・」になり、体力・攻撃力が高くなった。見た目・声・名前は変わらない（確認済み）",
  },
  age: {
    label: "年齢",
    known: null,
    note: "0x30（48）にすると48歳と表示された（確認済み）。255 は「？」（さよ）",
  },
  blood: {
    label: "血液型",
    known: BLOOD_TYPES,
    note: "1＝A、2＝B、3＝O、4＝AB（確認済み）。5 は「？」（さよ）",
  },
  group: {
    label: "相手の種類（生の値）",
    known: null,
    badge: "意味は未確認",
    note: "日付ではない（1日目に町の人と約束して 1 だった。確認済み）。さよ・先生は 0、町の人は 1〜3。約束の +0x02 と記録の +0x0C は同じ値",
  },
};

function hintFor(field: PersonField, advanced: boolean): string {
  if (field === "age") return advanced ? "0〜255（255＝？）" : `0〜${AGE_NORMAL_MAX}、または 255（？）`;
  if (field === "group") return "0〜0xFFFF";
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
  const badges = spec.badge ? <CertaintyBadge mark="❓" text={spec.badge} /> : undefined;
  const apply = (v: number) => update((b) => write(b, v, { advanced }));
  const validate = (v: number) => validatePersonField(field, v, current ?? 0, { advanced });

  if (field === "group")
    return (
      <FieldRow
        // 上級者モードを切り替えたときに入力欄を作り直す
        key={String(advanced)}
        label={spec.label}
        offset={offset}
        badges={badges}
        value={current}
        problem={problem ?? (advanced ? null : "意味が分かっていない値です（上級者モードで書けます）")}
        format={hex}
        parse={(input) => parseNumber(input, validate)}
        apply={apply}
        hint={hintFor(field, advanced)}
        note={spec.note}
      />
    );

  if (!spec.known)
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
      <SelectRow
        label={spec.label}
        offset={offset}
        badges={badges}
        value={current === null ? null : String(current)}
        currentLabel={current === null ? undefined : `${hex(current)} 不明`}
        options={spec.known.map((k) => ({ value: String(k.value), label: `${k.label}（${hex(k.value)}）` }))}
        problem={problem}
        note={spec.note}
        onChange={(v) => apply(Number(v))}
      />
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
      <SelectRow
        label="場所と配置"
        offset={offset}
        value={pairValue}
        currentLabel={`${formatHex2(promise.place)} ${placeLabel(promise.place)}（配置 ${formatHex2(promise.layout)}。未確認の組）`}
        options={placeLayoutOptions}
        problem={problem}
        warning={known ? null : "確認済みの組ではありません。布団の位置がおかしくなることがあります"}
        hint="確認済みの組だけを選べます"
        note="+0x08 は夜這いに入る扉と、その先のマップ。+0x0A はその先での人と布団の配置。場所だけを変えると、布団が宙に浮いたり壁にめり込んだりした（確認済み）。組は約束の実データから集めたもの"
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
            onChange={(v) => update((b) => writePromisePlace(b, Number(v), promise.layout, { advanced }))}
          />
          <FieldRow
            key={promise.layout}
            label="配置だけ（+0x0A）"
            offset={PROMISE_OFFSET + PROMISE_LAYOUT_REL}
            value={promise.layout}
            problem={problem}
            format={hex}
            parse={(input) => parseNumber(input, (v) => validatePlaceLayout(promise.place, v, current, { advanced }))}
            apply={(v) => update((b) => writePromisePlace(b, promise.place, v, { advanced }))}
            hint="0〜0xFFFF"
          />
        </div>
      )}
    </div>
  );
}

const PROMISE_ORDER: PersonField[] = ["name", "look", "type", "age", "blood", "group"];
const RECORD_ORDER = ["name", "type", "age", "blood", "group"] as const;

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
          {formatOffset(PROMISE_OFFSET)} から 0x2C B。約束中の相手の名前・見た目・年齢などを書き換えます。
          名前・見た目と声・しゃべり方と戦闘力は別々に決まるので、組み合わせを変えられます。
          約束がないときは編集できません（新しく約束を作る機能はありません）。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {promise && !promise.active ? (
          <p className="text-muted-foreground text-sm">約束はありません（+0x04 が 0xFFFFFFFF）。</p>
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
  const name = KNOWN_NAMES.find((n) => n.value === record.name)?.label ?? hex(record.name);
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
          {formatOffset(RECORDS_OFFSET)} から 16 B × {RECORD_CAPACITY} 件。夜這いのたびに1件足されます。
          件数は {formatOffset(RECORD_COUNT_OFFSET)}（{view ? `${view.count} 件` : "未読み込み"}）。
          今ある記録の項目だけを書き換えます（記録を足したり消したりする機能はありません）。
          見た目と声は記録に残りません。+0x08 の入った建物の番号は表示だけです。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {view && view.records.length === 0 && <p className="text-muted-foreground text-sm">記録はありません。</p>}
        {problem && view && <p className="text-muted-foreground pb-4 text-xs">読み取り専用：{problem}</p>}
        {view?.records.map((r) => <RecordRow key={r.index} record={r} problem={problem} />)}
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
        <CardTitle className="flex flex-wrap items-center gap-2">
          夜這いの約束の条件
          <CertaintyBadge mark="🔶" text="書き換えの反映は未確認" />
        </CardTitle>
        <CardDescription>
          朱美・ローラ・三姉妹・メリンダと夜這いの約束をするための好感度とポイントです（{formatOffset(0x3792)}〜{formatOffset(0x3797)}）。
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
              badges={p.pending ? <CertaintyBadge mark={p.threshold === null ? "❓" : "🔶"} text={p.pending} /> : undefined}
              value={current}
              problem={problem}
              format={String}
              parse={(input) => parseNumber(input, (v) => validateYobaiPoint(v, { advanced }))}
              apply={(v) => update((b) => writeYobaiPoint(b, p.offset, v, { advanced }))}
              inputMode="numeric"
              hint={p.threshold === null ? range : `${range}。${p.threshold} 以上で約束`}
              note={p.note}
              warning={current !== null && current > POINT_NORMAL_MAX ? `通常の進行では見ない値です（${current}）` : null}
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
          夜這いのたびに 1 増えた3か所です。約束の画面の「夜這い回数」は記録の件数（0x137EC）でした（確認済み）。0x37C8 は夜這いの回数と合わないセーブがあり、意味は分かっていません。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
        {view?.counters.map((c) => (
          <p key={c.offset}>
            <span className="font-mono">{formatOffset(c.offset)}</span>：{c.value}
            <span className="text-muted-foreground ml-2 text-xs">{c.note}</span>
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

export function YobaiPage() {
  const { save } = useSave();

  const result = useMemo((): { view: YobaiView; points: YobaiPointsView } | { error: string } | null => {
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
          <AlertDescription>サイドバーの「ファイルを開く」から読み込むと、下の項目を編集できます。</AlertDescription>
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
          約束の場所・名前・見た目と声・しゃべり方と戦闘力・年齢・血液型は、書き換えでゲームに反映されることを確認済みです（解析ドキュメントの night-visit）。
          配置は確認済みの組だけを選べます。夜這いの記録は差分からの推定で、書き換えの反映は確かめていません。
          書き換える前のセーブを残してから試してください。
        </AlertDescription>
      </Alert>

      <PointsCard key={`${k}-points`} view={result?.points ?? null} />
      <PromiseCard key={`${k}-promise`} view={view} />
      <RecordsCard key={`${k}-records`} view={view} />
      <CountersCard view={view} />

      <p className="text-muted-foreground text-xs">
        約束の枠の +0x00・+0x0C〜+0x1B・+0x26〜+0x2B は意味が分かっていないので書き換えません（❓）。
        {` `}記録の +0x08（入った建物）は {formatOffset(RECORDS_OFFSET + RECORD_BUILDING_REL)} から 16 B 刻みです。
      </p>
    </div>
  );
}
