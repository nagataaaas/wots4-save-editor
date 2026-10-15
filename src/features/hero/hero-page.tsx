import { ActionButton } from "@/components/action-button";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { FieldShell } from "@/components/field-shell";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { HERO_ANCHORS } from "./anchors";
import { SelectRow } from "@/components/select-row";
import { useSave } from "@/lib/save-context";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { SearchScope } from "@/lib/search-context";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatWarnings } from "@/lib/format";
import { parseDecimal, parseInteger } from "@/lib/parse";
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
import { tr, type Localized } from "@/lib/i18n";

function parseAmount(key: U32Key, input: string): ParseResult<number> {
  return parseInteger(input, value => validateAmount(key, value), {
    error: tr({ ja: "0以上の整数を入力してください", en: "Enter a whole number of 0 or more" }),
  });
}

/** 上限の出典。所持金・金庫はゲーム内の上限 [U]、侍点はユーザー指定の上限 */
const amountLimitNote: Record<U32Key, Localized> = {
  money: { ja: "上限はゲーム内の上限", en: "The limit is the in-game limit" },
  cashbox: { ja: "上限はゲーム内の上限", en: "The limit is the in-game limit" },
  samuraiPoint: { ja: "上限は実用上の上限", en: "The limit is a practical limit" },
};

function parseGauge(input: string): ParseResult<number> {
  return parseDecimal(input, validateGauge, { error: tr({ ja: "0以上の数値を入力してください", en: "Enter a number of 0 or more" }) });
}

/** 0 から max までの範囲の表示 */
const rangeText = (max: string) => tr({ ja: `0〜${max}`, en: `0–${max}` });

function parseName(input: string): ParseResult<string> {
  const error = validateName(input);
  return error ? { ok: false, error } : { ok: true, value: input };
}

const formatAmount = (v: number) => String(v);
/** float32 は有効桁7桁程度なので、それを超える桁は表示しない */
const formatGauge = (v: number) => String(Number(v.toPrecision(7)));
const formatName = (v: string) => v;

const GAUGE_LABELS: Record<GaugeKind, Localized> = {
  hp: { ja: "HP", en: "HP" },
  vitality: { ja: "活力", en: "Vitality" },
  tsuma: { ja: "つま斬りゲージ", en: "Spring Harvest gauge" },
};

/** 現在値の備考。現在HP・つま斬りゲージは 🟢（ゲーム内の反映は未確認）、活力の現在値は ✅ [U] */
const GAUGE_CURRENT_NOTES: Record<GaugeKind, Localized> = {
  hp: { ja: "0 以下はゲームが 1 として保存します", en: "The game saves 0 or less as 1" },
  vitality: { ja: "時間とともに減ります", en: "Decreases over time" },
  tsuma: {
    ja: "最大値の半分以上たまっていると発動できます",
    en: "Can be activated when it is at least half full",
  },
};

export function HeroPage() {
  const { save } = useSave();
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();

  const { view, error: readError, problem } = useSaveView(readHero);

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
      hint={rangeText(AMOUNT_LIMITS[key].toLocaleString())}
      note={tr(amountLimitNote[key])}
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
    const name = tr(GAUGE_LABELS[kind]);
    const currentHint = advanced
      ? tr({ ja: `0〜${GAUGE_MAX.toLocaleString()}（上級者モード）`, en: `0–${GAUGE_MAX.toLocaleString()} (Advanced mode)` })
      : tr({ ja: `0〜最大値`, en: `0–max` });
    return (
      <SearchScope key={kind} title={name} className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{name}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {gaugeRow(current, tr({ ja: "現在", en: "Current" }), currentHint, tr(GAUGE_CURRENT_NOTES[kind]))}
          {/* GAUGE_MAX はユーザー指定の暫定の上限（ゲーム内の上限は ❓） */}
          {gaugeRow(max, tr({ ja: "最大", en: "Max" }), rangeText(GAUGE_MAX.toLocaleString()), "")}
        </div>
      </SearchScope>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      <AnchoredCard anchor={HERO_ANCHORS.name} title={tr({ ja: "名前", en: "Name" })}>
        <CardContent>
          <FieldRow
            key="name"
            label={tr({ ja: "主人公名", en: "Name" })}
            offset={HERO_OFFSETS.name}
            value={view?.name.value ?? null}
            problem={view?.name.problem ?? null}
            format={formatName}
            parse={parseName}
            apply={(v) => update((b) => writeName(b, v))}
            hint={tr({ ja: `最大${NAME_MAX_CHARS}文字`, en: `Up to ${NAME_MAX_CHARS} characters` })}
            // 出典：docs/save_format/README.md §6
            note={tr({ ja: "長すぎる名前はロードできなくなる原因になります", en: "A name that is too long can make the save fail to load" })}
          />
        </CardContent>
      </AnchoredCard>

      <AnchoredCard anchor={HERO_ANCHORS.money} title={tr({ ja: "所持金・侍点", en: "Funds & Samurai Points" })}>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {amountRow("money", tr({ ja: "所持金", en: "Funds" }))}
          {amountRow("cashbox", tr({ ja: "金庫", en: "Treasury" }))}
          {amountRow("samuraiPoint", tr({ ja: "侍点", en: "Samurai Points" }))}
        </CardContent>
      </AnchoredCard>

      <AnchoredCard
        anchor={HERO_ANCHORS.vitals}
        title={tr({ ja: "HP・活力・つま斬り", en: "HP, Vitality & Spring Harvest" })}
        description={
          <>
            {tr({
              ja: "HP・活力・つま斬りの現在値と最大値を編集できます。",
              en: "Edit the current and max values of HP, Vitality and the Spring Harvest gauge.",
            })}
            <br />
            {tr({
              ja: "現在値は最大値まで入力できます（上級者モードでは超えられます）。",
              en: "Current values can be up to the max (Advanced mode allows going over).",
            })}
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
      title={tr({ ja: "難易度・主人公設定のやり直し", en: "Redo difficulty & Character Settings" })}
      description={
        <>
          {tr({
            ja: "今の周回のまま、難易度と主人公の設定だけをやり直せます。",
            en: "Redo only the difficulty and Character Settings while staying in the current playthrough.",
          })}
          <br />
          {tr({
            ja: "周回をはじめからやり直すときは、「世界 / 阿弥浜」画面の「新しい周回」を使います。",
            en: "To restart the playthrough from the beginning, use \"New playthrough\" on the World / Amihama screen.",
          })}
          {/* 次のロードの「続きから」で難易度と主人公の設定に進む。イベントの状態は今の周回のままなので、序章のイベントは始まらず、セーブした場所から続く */}
        </>
      }
    >
      <CardContent>
        <FieldShell
          label={tr({ ja: "難易度と主人公設定", en: "Difficulty & Character Settings" })}
          offset={DATE_OFFSETS.dayTime}
          note={tr({
            ja: "次のロードで難易度と主人公の設定に進む状態にします。元の状態に戻すときは「世界 / 阿弥浜」画面の段階の欄で選び直してください",
            en: "Makes the next load go to the difficulty and Character Settings. To undo, pick the stage again on the World / Amihama screen",
          })}
          problem={null}
        >
          <ActionButton
            size="sm"
            className="w-fit"
            disabled={!view || view.problem !== null}
            label={tr({ ja: "難易度と主人公設定を行えるようにする", en: "Enable difficulty & Character Settings" })}
            confirm="repeat"
            onAction={() => write(enableCharacterSetup)}
          />
        </FieldShell>
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
      title={tr({ ja: "現在地（開始地点）", en: "Location (starting point)" })}
      // クラッシュが報告されている値は選択肢に出さない（selectableLocations）
      description={tr({ ja: "次にロードしたときに出現する場所を選べます。", en: "Choose where you appear the next time you load." })}
    >
      <CardContent>
        <SelectRow
          label={tr({ ja: "場所", en: "Place" })}
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
