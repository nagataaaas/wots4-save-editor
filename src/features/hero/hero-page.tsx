import { useMemo, useState } from "react";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { InfoTip } from "@/components/info-tip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { HERO_ANCHORS } from "./anchors";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSave } from "@/lib/save-context";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
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
  GAUGES,
  type F32Key,
  type GaugeKind,
  type HeroView,
  type U32Key,
} from "@/save/hero";
import { findLocation, selectableLocations } from "@/save/locations";
import { enableCharacterSetup } from "@/save/new-cycle";
import { DATE_OFFSETS } from "@/save/scenario-date";
import { Button } from "@/components/ui/button";

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

const GAUGE_LABELS: Record<GaugeKind, string> = {
  hp: "HP",
  vitality: "活力",
  tsuma: "つま斬りゲージ",
};

/** 現在値の備考。現在HP・つま斬りゲージは 🟢（ゲーム内の反映は未確認）、活力の現在値は ✅ [U] */
const GAUGE_CURRENT_NOTES: Record<GaugeKind, string> = {
  hp: "0 以下はゲームが 1 として保存します",
  vitality: "時間とともに減ります",
  tsuma: "最大値の半分以上たまっていると発動できます",
};

export function HeroPage() {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();

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

  const gaugeRow = (key: F32Key, label: string, hint: string, note: string) => (
    <FieldRow
      key={`${k}-${key}`}
      label={label}
      offset={HERO_OFFSETS[key]}
      value={view?.[key].value ?? null}
      problem={view?.[key].problem ?? null}
      warning={view?.[key].warning ?? null}
      format={formatGauge}
      parse={parseGauge}
      apply={(v) => update((b) => writeGauge(b, key, v, advanced))}
      inputMode="decimal"
      hint={hint}
      note={note}
    />
  );

  const gaugeGroup = (kind: GaugeKind) => {
    const { current, max } = GAUGES[kind];
    const name = GAUGE_LABELS[kind];
    const currentHint = advanced
      ? `0〜${GAUGE_MAX.toLocaleString()}（上級者モード）`
      : `0〜最大値`;
    return (
      <section key={kind} className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{name}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {gaugeRow(current, "現在", currentHint, GAUGE_CURRENT_NOTES[kind])}
          {gaugeRow(max, "最大", `0〜${GAUGE_MAX.toLocaleString()}`, "上限は暫定")}
        </div>
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {view?.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.layoutProblem}</AlertDescription>
        </Alert>
      )}

      <AnchoredCard anchor={HERO_ANCHORS.name}>
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
            // 出典：docs/save_format/README.md §6
            note="長すぎる名前はロードできなくなる原因になります"
          />
        </CardContent>
      </AnchoredCard>

      <AnchoredCard anchor={HERO_ANCHORS.money}>
        <CardHeader>
          <CardTitle>所持金・侍点</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {amountRow("money", "所持金")}
          {amountRow("cashbox", "金庫")}
          {amountRow("samuraiPoint", "侍点")}
        </CardContent>
      </AnchoredCard>

      <AnchoredCard anchor={HERO_ANCHORS.vitals}>
        <CardHeader>
          <CardTitle>HP・活力・つま斬り</CardTitle>
          <CardDescription>
            HP・活力・つま斬りの現在値と最大値を編集できます。
            <br />
            現在値は最大値まで入力できます（上級者モードでは超えられます）。
            {/* ロード時、現在値は最大値で頭打ちになる */}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {gaugeGroup("hp")}
          {gaugeGroup("vitality")}
          {gaugeGroup("tsuma")}
        </CardContent>
      </AnchoredCard>

      <LocationCard
        key={`${k}-location`}
        view={view}
        onChange={(v) => update((b) => writeLocation(b, v))}
      />

      <CharacterSetupCard key={`${k}-setup`} view={view} />
    </div>
  );
}

/** 0x0010 だけを 0 にする（new-cycle.ts の enableCharacterSetup。✅ [U] 次のロードで難易度と主人公の設定に進む） */
function CharacterSetupCard({ view }: { view: HeroView | null }) {
  const { update } = useSave();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    try {
      update(enableCharacterSetup);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <AnchoredCard anchor={HERO_ANCHORS.difficulty}>
      <CardHeader>
        <CardTitle>難易度・主人公設定のやり直し</CardTitle>
        <CardDescription>
          今の周回のまま、難易度と主人公の設定だけをやり直せます。
          <br />
          周回をはじめからやり直すときは、「世界 / 阿弥浜」画面の「新しい周回」を使います。
          {/* 次のロードの「続きから」で難易度と主人公の設定に進む。イベントの状態は今の周回のままなので、序章のイベントは始まらず、セーブした場所から続く */}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Label>難易度と主人公設定</Label>
          <InfoTip offset={DATE_OFFSETS.dayTime}>
            次のロードで難易度と主人公の設定に進む状態にします。元の状態に戻すときは「世界 / 阿弥浜」画面の段階の欄で選び直してください
          </InfoTip>
        </div>
        <Button
          variant={armed ? "destructive" : "outline"}
          size="sm"
          className="w-fit"
          disabled={!view || view.layoutProblem !== null}
          onClick={run}
          onBlur={() => setArmed(false)}
        >
          {armed ? "もう一度押すと書き込みます" : "難易度と主人公設定を行えるようにする"}
        </Button>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </CardContent>
    </AnchoredCard>
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
  // Base UI の Select はトリガーに出す名前を items から引く
  const locationItems: Record<string, string> = {};
  for (const l of selectableLocations) locationItems[String(l.value)] = `${l.label}${l.warning ? " ⚠" : ""}`;
  if (!isSelectable && current !== null)
    locationItems[String(current)] = `${currentLoc?.label ?? "不明"}（現在の値）`;

  return (
    <AnchoredCard anchor={HERO_ANCHORS.location}>
      <CardHeader>
        <CardTitle>現在地（開始地点）</CardTitle>
        <CardDescription>
          次にロードしたときに出現する場所を選べます。
          {/* クラッシュが報告されている値は選択肢に出さない */}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Label>場所</Label>
          <InfoTip offset={HERO_OFFSETS.location}></InfoTip>
        </div>
        <Select
          // null でプレースホルダー表示になる（undefined だと非制御扱いになる）
          value={current === null ? null : String(current)}
          items={locationItems}
          disabled={current === null || problem !== null}
          onValueChange={(s) => {
            if (s === null) return;
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
                {currentLoc?.label ?? "不明"}（現在の値）
              </SelectItem>
            )}
            {selectableLocations.map((l) => (
              <SelectItem key={l.value} value={String(l.value)}>
                {l.label}
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
    </AnchoredCard>
  );
}
