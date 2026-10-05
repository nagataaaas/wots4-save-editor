import { useMemo, useState } from "react";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { InfoTip } from "@/components/info-tip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatHex2 as hex2 } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import {
  AMOUNT_LIMITS,
  GAUGE_MAX,
  HERO_OFFSETS,
  NAME_MAX_CHARS,
  readHero,
  validateAmount,
  validateGauge,
  validateName,
  writeAmount,
  writeGauge,
  writeLocation,
  writeName,
  type F32Key,
  type HeroView,
  type U32Key,
} from "@/save/hero";
import { findLocation, selectableLocations } from "@/save/locations";

function parseAmount(key: U32Key, input: string): ParseResult<number> {
  if (!/^\d+$/.test(input.trim())) return { ok: false, error: "0以上の整数を入力してください" };
  const value = Number(input.trim());
  const error = validateAmount(key, value);
  return error ? { ok: false, error } : { ok: true, value };
}

/** 上限の出典。所持金・金庫はゲーム内の上限 [U]、侍点はユーザー指定の上限 */
const amountLimitNote: Record<U32Key, string> = {
  money: "上限はゲーム内の上限",
  cashbox: "上限はゲーム内の上限",
  samuraiPoint: "上限は実用上の上限",
};

function parseGauge(input: string): ParseResult<number> {
  if (!/^\d+(\.\d+)?$/.test(input.trim()))
    return { ok: false, error: "0以上の数値を入力してください" };
  const value = Number(input.trim());
  const error = validateGauge(value);
  return error ? { ok: false, error } : { ok: true, value };
}

function parseName(input: string): ParseResult<string> {
  const error = validateName(input);
  return error ? { ok: false, error } : { ok: true, value: input };
}

const formatAmount = (v: number) => String(v);
/** float32 は有効桁7桁程度なので、それを超える桁は表示しない */
const formatGauge = (v: number) => String(Number(v.toPrecision(7)));
const formatName = (v: string) => v;

export function HeroPage() {
  const { save, update } = useSave();

  const result = useMemo((): { view: HeroView } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: readHero(save.working) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
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

  // 未読み込みのときは view が null。同じ項目を無効状態で表示し、何を編集できるかを見せる
  const view = result?.view ?? null;
  const k = save?.loadId ?? 0;

  const amountRow = (key: U32Key, label: string) => (
    <FieldRow
      key={`${k}-${key}`}
      label={label}
      offset={HERO_OFFSETS[key]}
      value={view?.[key].value ?? null}
      problem={view?.[key].problem ?? null}
      warning={view?.[key].warning ?? null}
      format={formatAmount}
      parse={(input) => parseAmount(key, input)}
      apply={(v) => update((b) => writeAmount(b, key, v))}
      inputMode="numeric"
      hint={`0〜${AMOUNT_LIMITS[key].toLocaleString()}`}
      note={amountLimitNote[key]}
    />
  );

  const gaugeRow = (key: F32Key, label: string) => (
    <FieldRow
      key={`${k}-${key}`}
      label={label}
      offset={HERO_OFFSETS[key]}
      value={view?.[key].value ?? null}
      problem={view?.[key].problem ?? null}
      format={formatGauge}
      parse={parseGauge}
      apply={(v) => update((b) => writeGauge(b, key, v))}
      inputMode="decimal"
      hint={`0〜${GAUGE_MAX.toLocaleString()}`}
      note="上限は暫定"
    />
  );

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {!view && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>
            サイドバーの「ファイルを開く」から読み込むと、下の項目を編集できます。
          </AlertDescription>
        </Alert>
      )}

      {view?.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.layoutProblem}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>名前</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldRow
            key={`${k}-name`}
            label="主人公名"
            offset={HERO_OFFSETS.name}
            value={view?.name.value ?? null}
            problem={view?.name.problem ?? null}
            format={formatName}
            parse={parseName}
            apply={(v) => update((b) => writeName(b, v))}
            hint={`最大${NAME_MAX_CHARS}文字`}
            note="長すぎる名前はロードできなくなる原因になります（§10.1）"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>所持金・侍点</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {amountRow("money", "所持金")}
          {amountRow("cashbox", "金庫")}
          {amountRow("samuraiPoint", "侍点")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>HP・活力</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {gaugeRow("hp", "最大HP")}
          {gaugeRow("vitalityMax", "最大活力")}
        </CardContent>
      </Card>

      <LocationCard
        key={`${k}-location`}
        view={view}
        onChange={(v) => update((b) => writeLocation(b, v))}
      />
    </div>
  );
}

/** view が null のときはセーブ未読み込み。選択欄を無効にして表示する */
function LocationCard({
  view,
  onChange,
}: {
  view: HeroView | null;
  onChange: (value: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const current = view?.location.value ?? null;
  const problem = view?.location.problem ?? null;
  const currentLoc = current === null ? undefined : findLocation(current);
  const isSelectable = current === null || selectableLocations.some((l) => l.value === current);
  const warning = currentLoc?.warning;

  return (
    <Card>
      <CardHeader>
        <CardTitle>現在地（開始地点）</CardTitle>
        <CardDescription>
          ロード時に出現する場所。クラッシュが報告されている値は選択肢に出しません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Label>場所</Label>
          <InfoTip offset={HERO_OFFSETS.location}></InfoTip>
        </div>
        <Select
          // '' は Radix Select でプレースホルダー表示になる（undefined だと非制御扱いになる）
          value={current === null ? "" : String(current)}
          disabled={current === null || problem !== null}
          onValueChange={(s) => {
            setError(null);
            try {
              onChange(Number(s));
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="未読み込み" />
          </SelectTrigger>
          <SelectContent>
            {!isSelectable && current !== null && (
              <SelectItem value={String(current)} disabled>
                {hex2(current)} {currentLoc?.label ?? "未調査"}（現在の値）
              </SelectItem>
            )}
            {selectableLocations.map((l) => (
              <SelectItem key={l.value} value={String(l.value)}>
                {hex2(l.value)} {l.label}
                {l.warning && " ⚠"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {problem ? (
          <p className="text-muted-foreground text-xs">読み取り専用：{problem}</p>
        ) : error ? (
          <p className="text-destructive text-xs">{error}</p>
        ) : (
          warning && <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {warning}</p>
        )}
      </CardContent>
    </Card>
  );
}
