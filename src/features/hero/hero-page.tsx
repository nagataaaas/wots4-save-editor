import { ActionButton } from "@/components/action-button";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { InfoTip } from "@/components/info-tip";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { HERO_ANCHORS } from "./anchors";
import { Label } from "@/components/ui/label";
import { SelectRow } from "@/components/select-row";
import { useSave } from "@/lib/save-context";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { SearchField, SearchScope } from "@/lib/search-context";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatWarnings } from "@/lib/format";
import { parseInteger } from "@/lib/parse";
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

function parseAmount(key: U32Key, input: string): ParseResult<number> {
  return parseInteger(input, value => validateAmount(key, value), { error: "0以上の整数を入力してください" });
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
  const { save } = useSave();
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();

  const { view, error: readError, problem } = useSaveView(readHero, { problem: (v) => v.problem });

  // 未読み込みのときは view が null。同じ項目を無効状態で表示し、何を編集できるかを見せる
  const k = save?.loadId ?? 0;

  const amountRow = (key: U32Key, label: string) => (
    <FieldRow
      key={key}
      label={label}
      offset={HERO_OFFSETS[key]}
      value={view?.[key].value ?? null}
      problem={view?.[key].problem ?? null}
      warning={formatWarnings(view?.[key].warnings)}
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
      key={key}
      label={label}
      offset={HERO_OFFSETS[key]}
      value={view?.[key].value ?? null}
      problem={view?.[key].problem ?? null}
      warning={formatWarnings(view?.[key].warnings)}
      format={formatGauge}
      parse={parseGauge}
      apply={(v) => update((b) => writeGauge(b, key, v, { advanced }))}
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
      <SearchScope key={kind} title={name} className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{name}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {gaugeRow(current, "現在", currentHint, GAUGE_CURRENT_NOTES[kind])}
          {gaugeRow(max, "最大", `0〜${GAUGE_MAX.toLocaleString()}`, "上限は暫定")}
        </div>
      </SearchScope>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      <AnchoredCard anchor={HERO_ANCHORS.name} title="名前">
        <CardContent>
          <FieldRow
            key="name"
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

      <AnchoredCard anchor={HERO_ANCHORS.money} title="所持金・侍点">
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {amountRow("money", "所持金")}
          {amountRow("cashbox", "金庫")}
          {amountRow("samuraiPoint", "侍点")}
        </CardContent>
      </AnchoredCard>

      <AnchoredCard
        anchor={HERO_ANCHORS.vitals}
        title="HP・活力・つま斬り"
        description={
          <>
            HP・活力・つま斬りの現在値と最大値を編集できます。
            <br />
            現在値は最大値まで入力できます（上級者モードでは超えられます）。
            {/* ロード時、現在値は最大値で頭打ちになる */}
          </>
        }
      >
        <CardContent className="flex flex-col gap-6">
          {gaugeGroup("hp")}
          {gaugeGroup("vitality")}
          {gaugeGroup("tsuma")}
        </CardContent>
      </AnchoredCard>

      <LocationCard
        view={view}
        onChange={(v) => update((b) => writeLocation(b, v))}
      />

      <CharacterSetupCard key={`${k}-setup`} view={view} />
    </div>
  );
}

/** 0x0010 だけを 0 にする（new-cycle.ts の enableCharacterSetup。✅ [U] 次のロードで難易度と主人公の設定に進む） */
function CharacterSetupCard({ view }: { view: HeroView | null }) {
  const { write } = useWrite();

  return (
    <AnchoredCard
      anchor={HERO_ANCHORS.difficulty}
      title="難易度・主人公設定のやり直し"
      description={
        <>
          今の周回のまま、難易度と主人公の設定だけをやり直せます。
          <br />
          周回をはじめからやり直すときは、「世界 / 阿弥浜」画面の「新しい周回」を使います。
          {/* 次のロードの「続きから」で難易度と主人公の設定に進む。イベントの状態は今の周回のままなので、序章のイベントは始まらず、セーブした場所から続く */}
        </>
      }
    >
      <CardContent>
        <SearchField label="難易度と主人公設定" className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Label>難易度と主人公設定</Label>
            <InfoTip offset={DATE_OFFSETS.dayTime}>
              次のロードで難易度と主人公の設定に進む状態にします。元の状態に戻すときは「世界 / 阿弥浜」画面の段階の欄で選び直してください
            </InfoTip>
          </div>
          <ActionButton
            size="sm"
            className="w-fit"
            disabled={!view || view.problem !== null}
            label="難易度と主人公設定を行えるようにする"
            confirm="repeat"
            onAction={() => write(enableCharacterSetup)}
          />
        </SearchField>
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
  const current = view?.location.value ?? null;
  const currentLoc = current === null ? undefined : findLocation(current);
  return (
    <AnchoredCard
      anchor={HERO_ANCHORS.location}
      title="現在地（開始地点）"
      // クラッシュが報告されている値は選択肢に出さない（selectableLocations）
      description="次にロードしたときに出現する場所を選べます。"
    >
      <CardContent>
        <SelectRow
          label="場所"
          offset={HERO_OFFSETS.location}
          value={current === null ? null : String(current)}
          currentLabel={currentLoc?.label}
          options={selectableLocations.map((l) => ({ value: String(l.value), label: `${l.label}${l.warning ? " ⚠" : ""}` }))}
          problem={view?.location.problem ?? null}
          warning={currentLoc?.warning}
          onChange={(value) => onChange(Number(value))}
        />
      </CardContent>
    </AnchoredCard>
  );
}
