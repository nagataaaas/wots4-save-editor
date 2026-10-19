import { STYLES_ANCHORS } from "./anchors";
import { useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FilterSelect } from "@/components/filter-select";
import { InfoTip } from "@/components/info-tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatOffset } from "@/lib/format";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { WriteResult } from "@/components/write-error";
import { matchesSearch } from "@/lib/search";
import { getLanguage, tr, type Localized } from "@/lib/i18n";
import {
  SECTS,
  SLOT_LABELS,
  condLabel,
  findSect,
  findSkillSheet,
  rankLabel,
  sectName,
  sheetSkillTree,
  slotLabel,
  stanceName,
  stanceNameById,
  type Sect,
  type SkillSheet,
} from "@/save/master/sect-data";
import { I16_MAX, MASTERY_MAX, sectValueOffset, type SectValues } from "@/save/sect-record";
import {
  LEARNED_COUNT_OFFSET,
  SCROLLS_END,
  SCROLL_HELD_OFFSET,
  SECT_RECORDS_END,
  SHEET_STATES_OFFSET,
  SKILL_POINTS_MAX,
  SKILL_POINTS_OFFSET,
  acquireMissingSects,
  acquireSect,
  countLearned,
  missingSects,
  forgetSheetSkill,
  learnSectSkills,
  isUniqueSkill,
  learnSheetSkill,
  learnSheetSkills,
  ownedSectIds,
  rankForMastery,
  readSects,
  sectHasUniqueSkill,
  sectSheetSkills,
  sheetStates,
  writeSectValues,
  writeSkillPoints,
  type ScrollPlace,
  type SectsView,
} from "@/save/sects";
import { STANCE_ROWS, STANCE_TAB_CLASS, readOnlyReason, skillTreeDescription } from "./sect-format";
import {
  IntField,
  RankField,
  SkillAttrs,
  SkillCommandCells,
  SkillTreeName,
  SkillTreeRows,
  StateBadge,
  type SkillTreeRowContext,
} from "./sect-ui";
import { SkillActionButtons } from "./skill-action-buttons";

/** 流派の画面で扱う範囲：技の覚え状況〜流派の表、流派の書（持ち歩き〜箪笥の件数） */
const OVERVIEW_OFFSETS = `${formatOffset(SHEET_STATES_OFFSET)}〜${formatOffset(SECT_RECORDS_END - 1)}、${formatOffset(SCROLL_HELD_OFFSET)}〜${formatOffset(SCROLLS_END - 1)}`;

/** その流派がどこにあるか（装備・持ち歩き・箪笥） */
function placesOf(view: SectsView, id: number): string[] {
  const places: string[] = [];
  const slot = view.equipped.indexOf(id);
  if (slot >= 0) places.push(tr({ ja: `装備中（${slotLabel(slot)}）`, en: `Equipped (${slotLabel(slot)})` }));
  if (view.held.some((s) => s.sect?.id === id)) places.push(tr(PLACE_FILTER_LABELS.held));
  if (view.stored.some((s) => s.sect?.id === id)) places.push(tr(PLACE_FILTER_LABELS.stored));
  return places;
}

type PlaceFilter = "owned" | "equipped" | "held" | "stored" | "missing" | "all";

const PLACE_FILTER_LABELS: Record<PlaceFilter, Localized> = {
  owned: { ja: "持っている", en: "Owned" },
  equipped: { ja: "装備中", en: "Equipped" },
  held: { ja: "持ち歩き", en: "Style Library" },
  stored: { ja: "道場の箪笥", en: "Dojo shelf" },
  missing: { ja: "持っていない", en: "Not owned" },
  all: { ja: "すべて", en: "All" },
};

function matchesPlace(filter: PlaceFilter, view: SectsView, owned: ReadonlySet<number>, id: number): boolean {
  switch (filter) {
    case "owned":
      return owned.has(id);
    case "equipped":
      return view.equipped.includes(id);
    case "held":
      return view.held.some((s) => s.sect?.id === id);
    case "stored":
      return view.stored.some((s) => s.sect?.id === id);
    case "missing":
      return !owned.has(id);
    case "all":
      return true;
  }
}

export function StylesPage() {
  const { write: update } = useWrite();
  // 「持っていない流派をすべて入手する」の結果
  const { tryWrite: tryAcquire, message: acquireMessage } = useWrite();
  const { advanced } = useAdvancedMode();
  const [query, setQuery] = useState("");
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>("owned");
  const [uniqueOnly, setUniqueOnly] = useState(false);
  // 構えの絞り込み。null はすべての構え
  const [stance, setStance] = useState<number | null>(null);

  const { view, error: readError, problem, readOnly } = useSaveView(readSects);

  // 未読み込みのときは view が null。流派の表から同じカードを描き、値を空・操作を無効にする
  const owned = view ? ownedSectIds(view) : null;
  const missingCount = view ? missingSects(view).length : null;
  const acquireAll = (place: ScrollPlace) =>
    tryAcquire(
      (b) => acquireMissingSects(b, place),
      (n) => tr({ ja: `${n} 件の流派を入手しました`, en: n === 1 ? "Obtained 1 style" : `Obtained ${n} styles` }),
    );
  // 構えのほかの条件で絞り込んだ流派。構えのボタンの件数はここから数える
  const baseSects = SECTS.filter((s) => !s.hidden || advanced)
    .filter((s) => matchesSearch(query, [s.nameJa, s.nameEn]))
    // 置き場所はセーブから決まるので、未読み込みのときは絞り込まない
    .filter((s) => !view || !owned || matchesPlace(placeFilter, view, owned, s.id))
    .filter((s) => !uniqueOnly || sectHasUniqueSkill(s));
  const sects = stance === null ? baseSects : baseSects.filter((s) => sectHasStance(s, stance));

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      {/* 技の覚え状況の書き込みは ✅（ゲームで反映を確認済み）。腕前点・修練度・段・倒した数は 🟢（書き換えはゲーム内で未確認） */}
      <AnchoredCard
        anchor={STYLES_ANCHORS.overview}
        title={tr({ ja: "流派", en: "Styles" })}
        // chunks/skill-states・styles（技の覚え状況〜流派の表）・sect-scrolls（流派の書）
        extra={<InfoTip offset={OVERVIEW_OFFSETS} />}
        description={tr({ ja: "流派ごとに技を覚えた状態にできます。", en: "Mark moves as learned for each style." })}
      >
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid items-start gap-4 sm:grid-cols-3">
            <IntField
              label={tr({ ja: "腕前点", en: "Ability points" })}
              offset={SKILL_POINTS_OFFSET}
              value={view?.skillPoints ?? null}
              problem={view?.problem ? readOnlyReason() : null}
              min={0}
              max={advanced ? 0xffff : SKILL_POINTS_MAX}
              apply={(v) => update((b) => writeSkillPoints(b, v, { advanced }))}
              note={tr({
                ja: `俺流を作るとき、選んだ技の腕前点の合計がこれ以下である必要があります。上限は ${SKILL_POINTS_MAX} です（上級者モードではそれ以上も入力できます）`,
                en: `When creating a My Style, the total ability points of the chosen moves must not exceed this. The maximum is ${SKILL_POINTS_MAX} (Advanced mode allows more)`,
              })}
              // 🟢 要ゲーム内確認
            />
            <span className="sm:pt-7">
              {tr({ ja: "習得技数：", en: "Moves learned: " })}
              {view?.learnedCount ?? "—"}
              <InfoTip offset={LEARNED_COUNT_OFFSET}>
                {tr({
                  ja: "戦闘中に閃いて覚えた数。ここでの書き換えでは増やしません",
                  en: "The number of moves learned by inspiration in battle. Edits here do not increase it",
                })}
              </InfoTip>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SLOT_LABELS.map((label, s) => {
              const sect = view ? findSect(view.equipped[s]) : undefined;
              return (
                <Badge key={s} variant="outline" className="font-normal">
                  {tr(label)}
                  {tr({ ja: "：", en: ": " })}
                  {view ? (sect ? sectName(sect) : tr({ ja: "俺流など", en: "My Style, etc." })) : "—"}
                </Badge>
              );
            })}
          </div>
          {/* 流派の入手は 🟢 要ゲーム内確認（acquireMissingSects） */}
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {tr({ ja: "持っていない流派：", en: "Styles not owned: " })}
              {missingCount ?? "—"}
            </span>
            <Button variant="outline" size="sm" onClick={() => acquireAll("held")} disabled={readOnly || !missingCount}>
              {tr({ ja: "すべて持ち歩きに入れる", en: "Add all to Style Library" })}
            </Button>
            <Button variant="outline" size="sm" onClick={() => acquireAll("stored")} disabled={readOnly || !missingCount}>
              {tr({ ja: "すべて道場の箪笥に入れる", en: "Add all to Dojo shelf" })}
            </Button>
            <span className="text-muted-foreground text-xs">
              {tr({
                ja: "修練度と倒した数が 0、段が初段で、技を覚えていない状態で入手します。持ち歩きは 20 冊までです。",
                en: "Styles are obtained at First rank, with mastery and kills at 0 and no moves learned. The Style Library holds up to 20 books.",
              })}
            </span>
            <WriteResult message={acquireMessage} className="basis-full" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-56"
              placeholder={tr({ ja: "流派名で絞り込み", en: "Filter by style name" })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <FilterSelect
              options={(Object.keys(PLACE_FILTER_LABELS) as PlaceFilter[]).map((value) => ({ value, label: tr(PLACE_FILTER_LABELS[value]) }))}
              value={placeFilter}
              onChange={setPlaceFilter}
              disabled={!view}
              className="w-36"
              aria-label={tr({ ja: "置き場所で絞り込み", en: "Filter by location" })}
            />
            <Label className="font-normal">
              <Checkbox checked={uniqueOnly} onCheckedChange={(on) => setUniqueOnly(on)} />
              {tr({ ja: "固有技がある流派のみ", en: "Only styles with unique moves" })}
            </Label>
            <span className="text-muted-foreground text-xs">
              {tr({ ja: `${sects.length} 件`, en: sects.length === 1 ? "1 style" : `${sects.length} styles` })}
            </span>
          </div>
          <StanceFilter sects={baseSects} value={stance} onChange={setStance} />
        </CardContent>
      </AnchoredCard>

      {sects.map((sect) => (
        <SectCard key={sect.id} sect={sect} view={view} readOnly={readOnly} stance={stance} />
      ))}
      {sects.length === 0 && (
        <p className="text-muted-foreground text-sm">{tr({ ja: "条件に合う流派がありません。", en: "No styles match." })}</p>
      )}
    </div>
  );
}

const skillNosOf = (sheet: SkillSheet) => sheet.skills.map((s) => s.skillNo);

/** 流派にその構えの技の表があるか */
const sectHasStance = (sect: Sect, stance: number): boolean => sect.sheets.some((id) => findSkillSheet(id)?.stance === stance);

/**
 * 構えの絞り込み。技の画面の構えのタブと同じ 2 段（刀・刀以外）に並べる。
 * 選んだ構えをもう一度押すと解除する。数はほかの条件に合う流派のうち、その構えを持つ流派の数
 */
function StanceFilter({
  sects,
  value,
  onChange,
}: {
  sects: readonly Sect[];
  value: number | null;
  onChange: (stance: number | null) => void;
}) {
  return (
    <div className="bg-muted flex flex-col gap-1.5 rounded-lg p-2" role="group" aria-label={tr({ ja: "構えで絞り込み", en: "Filter by stance" })}>
      {STANCE_ROWS.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <span className="text-muted-foreground w-12 shrink-0 pl-1 text-xs font-medium">{tr(row.label)}</span>
          <div className="grid flex-1 grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-7">
            {row.stances.map((s) => {
              const on = value === s.id;
              const hits = sects.filter((sect) => sectHasStance(sect, s.id)).length;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  data-active={on ? "" : undefined}
                  disabled={!on && hits === 0}
                  onClick={() => onChange(on ? null : s.id)}
                  className={`${STANCE_TAB_CLASS} flex w-full items-center justify-between gap-1.5 rounded-md border py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50`}
                >
                  {stanceName(s)}
                  <span className="text-xs font-normal tabular-nums opacity-70">{tr({ ja: `${hits}件`, en: String(hits) })}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectCard({
  sect,
  view,
  readOnly,
  stance,
}: {
  sect: Sect;
  /** null はセーブ未読み込み */
  view: SectsView | null;
  readOnly: boolean;
  /** 構えで絞り込んでいるときは、その構えのタブを開く。null は絞り込みなし */
  stance: number | null;
}) {
  const { advanced } = useAdvancedMode();
  // ボタンの書き込みの結果は、このカードの「技を全部習得する」の下に出す（欄の書き込みのエラーは欄に出る）
  const { write: update, tryWrite, message } = useWrite();
  const rec = view?.records.find((r) => r.id === sect.id) ?? null;
  const places = view ? placesOf(view, sect.id) : [];
  // 固有技は覚えられる流派でだけ出す（sectSheetSkills）。未読み込みのときは states が null。
  // 流派の技の表はすべて技の表にある（sects.test.ts で確かめている）
  const sheets = sect.sheets.flatMap((id) => {
    const sheet = findSkillSheet(id);
    return sheet ? [{ sheet: { ...sheet, skills: sectSheetSkills(sect, sheet) }, states: view ? sheetStates(view, id) : null }] : [];
  });
  const hasUnique = sheets.some((s) => s.sheet.skills.some(isUniqueSkill));
  const total = sheets.reduce((n, s) => n + s.sheet.skills.length, 0);
  const learned = view ? sheets.reduce((n, s) => n + (s.states ? countLearned(s.states, skillNosOf(s.sheet)) : 0), 0) : null;
  const valueProblem = !view
    ? null
    : readOnly
      ? readOnlyReason()
      : rec
        ? null
        : tr({ ja: "流派の表にこの流派がありません", en: "This style is not in the style list" });
  const values: SectValues | null = rec ? { mastery: rec.mastery, rank: rec.rank, kills: rec.kills } : null;
  const writeValues = (v: SectValues) => update((b) => writeSectValues(b, sect.id, v));
  const name = sectName(sect);
  const acquire = (place: ScrollPlace) =>
    tryWrite(
      (b) => acquireSect(b, sect.id, place, { advanced }),
      place === "held"
        ? tr({ ja: `${name} を持ち歩きに入れました`, en: `Added ${name} to the Style Library` })
        : tr({ ja: `${name} を道場の箪笥に入れました`, en: `Added ${name} to the Dojo shelf` }),
    );
  const uniqueMark = tr({ ja: "固有技がある流派です", en: "This style has unique moves" });
  // 英語の段の名前（Second など）は日本語より長いので欄を広げる
  const rankWidth = getLanguage() === "en" ? "w-[4em]" : "w-[2.5em]";

  return (
    <CollapsibleCard
      anchor={STYLES_ANCHORS.sect(sect.id)}
      searchLabel={name}
      title={
        // 流派名・構え・段・修練度・技の数は、流派のカードどうしで縦に揃うように幅を決めておく
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex w-[10.5em] shrink-0 items-center gap-1.5">
            {/* 固有技のある流派の印。ない流派も同じ幅を空けて、流派名の左端を揃える */}
            <span className="w-5 shrink-0">
              {hasUnique && (
                <span
                  className="text-muted-foreground rounded border px-1 text-xs leading-4 font-normal"
                  title={uniqueMark}
                  aria-label={uniqueMark}
                >
                  {tr({ ja: "固", en: "U" })}
                </span>
              )}
            </span>
            {name}
          </span>
          <span className="text-muted-foreground flex items-center gap-x-3 text-xs font-normal">
            <span className="w-[9em] shrink-0">
              {sheets.map((s) => stanceNameById(s.sheet.stance)).join(tr({ ja: "・", en: ", " }))}
            </span>
            <span className={`${rankWidth} shrink-0`}>{rec ? (rankLabel(rec.rank) ?? tr({ ja: "不明", en: "Unknown" })) : "—"}</span>
            <span className="w-[7.5em] shrink-0 tabular-nums">
              {tr({ ja: "修練度 ", en: "Mastery " })}
              {rec ? rec.mastery : "—"}
            </span>
            <span className="w-[5em] shrink-0 tabular-nums">
              {tr({ ja: "技 ", en: "Moves " })}
              {learned ?? "—"}/{total}
            </span>
          </span>
        </span>
      }
      extra={places.map((p) => (
        <Badge key={p} variant="outline" className="font-normal">
          {p}
        </Badge>
      ))}
    >
      <div className="flex flex-col gap-4">
        {/* 流派の入手は 🟢 要ゲーム内確認（acquireSect）。持っていない流派だけに出す */}
        {sect.scrollNo !== null && places.length === 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">{tr({ ja: "この流派を入手する：", en: "Obtain this style: " })}</span>
            {(["held", "stored"] as const).map((place) => (
              <Button key={place} variant="outline" size="sm" onClick={() => acquire(place)} disabled={readOnly}>
                {place === "held"
                  ? tr({ ja: "持ち歩きに入れる", en: "Add to Style Library" })
                  : tr({ ja: "道場の箪笥に入れる", en: "Add to Dojo shelf" })}
              </Button>
            ))}
            <span className="text-muted-foreground text-xs">
              {tr({
                ja: "修練度と倒した数が 0、段が初段で、技を覚えていない状態で入手します。",
                en: "The style is obtained at First rank, with mastery and kills at 0 and no moves learned.",
              })}
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() =>
              tryWrite(
                (b) => learnSectSkills(b, sect.id),
                tr({ ja: `${name} の技を習得しました`, en: `Learned the moves of ${name}` }),
              )
            }
            disabled={readOnly || learned === total}
          >
            {tr({ ja: "技を全部習得する", en: "Learn all moves" })}
          </Button>
          <span className="text-muted-foreground text-xs">
            {/* 固有技の「習得する」は 🟢 要ゲーム内確認 */}
            {tr({
              ja: "段は「極」にはならないので、必要なら下の段を変更してください。固有技は「習得する」で習得済（俺流には未組み込み）、「俺流で表示」で俺流に組み込める状態にします。",
              en: 'The rank does not become "Master", so change the rank below if needed. "Learn" marks unique moves as learned (not yet usable in My Style); "Show in My Style" makes them usable in My Style. ',
            })}
            {skillTreeDescription()}
          </span>
          <WriteResult message={message} className="basis-full" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <IntField
            label={tr({ ja: "修練度", en: "Mastery" })}
            offset={rec ? sectValueOffset(rec.offset, 'mastery') : undefined}
            value={values?.mastery ?? null}
            problem={valueProblem}
            min={0}
            max={MASTERY_MAX}
            apply={(m) => values && writeValues({ ...values, mastery: m, rank: Math.max(values.rank, rankForMastery(sect, m)) })}
            note={tr({
              ja: `しきい値：${sect.thresholds.join("・")}。修練度に合わせて段も上げます`,
              en: `Thresholds: ${sect.thresholds.join(", ")}. The rank is raised to match the mastery`,
            })}
            // 🟢 要ゲーム内確認
          />
          <RankField
            offset={rec ? sectValueOffset(rec.offset, 'rank') : undefined}
            value={values?.rank ?? null}
            problem={valueProblem}
            apply={(r) => values && writeValues({ ...values, rank: r })}
            // 🟢 要ゲーム内確認
          />
          <IntField
            label={tr({ ja: "この流派で倒した数", en: "Kills with this style" })}
            offset={rec ? sectValueOffset(rec.offset, 'kills') : undefined}
            value={values?.kills ?? null}
            problem={valueProblem}
            min={0}
            max={I16_MAX}
            apply={(n) => values && writeValues({ ...values, kills: n })}
            // 🟢 要ゲーム内確認
          />
        </div>

        {/* 構え（技の表）ごとにタブで切り替える。技の表が 1 つならタブは出さない */}
        {/* 構えの絞り込みを変えたら、選んだ構えのタブを開き直す */}
        <Tabs
          key={stance ?? "all"}
          defaultValue={String((sheets.find((s) => s.sheet.stance === stance) ?? sheets[0])?.sheet.id)}
        >
          {sheets.length > 1 && (
            <TabsList className="h-auto gap-1.5 p-1.5 group-data-horizontal/tabs:h-auto">
              {sheets.map(({ sheet, states }) => (
                <TabsTrigger key={sheet.id} value={String(sheet.id)} className={`${STANCE_TAB_CLASS} flex-none gap-3`}>
                  {stanceNameById(sheet.stance)}
                  <span className="text-xs font-normal tabular-nums opacity-70">
                    {states ? countLearned(states, skillNosOf(sheet)) : "—"}/{sheet.skills.length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          )}
          {sheets.map(({ sheet, states }) => (
            <TabsContent key={sheet.id} value={String(sheet.id)}>
              {/* 技の名前・状態・コマンド・攻撃力・属性・習得条件・ボタンの欄を揃える（行は subgrid） */}
              <div className="grid grid-cols-[auto_auto_auto_auto_auto_minmax(0,1fr)_auto] gap-x-3 text-sm">
                <SkillTreeRows
                  groups={sheetSkillTree(sheet)}
                  renderRow={(ctx) => (
                    <SkillRow
                      {...ctx}
                      sheet={sheet}
                      states={states}
                      readOnly={readOnly}
                      advanced={advanced}
                      tryWrite={tryWrite}
                    />
                  )}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </CollapsibleCard>
  );
}

type SkillRowProps = {
  sheet: SkillSheet;
  /** null はセーブ未読み込み */
  states: readonly number[] | null;
  readOnly: boolean;
  advanced: boolean;
  /** 書き込んで、結果を流派のカードに出す（useWrite の tryWrite） */
  tryWrite: (mutate: (bytes: Uint8Array) => void, success: string) => void;
};

function SkillRow({ sheet, states, readOnly, advanced, tryWrite, ...ctx }: SkillRowProps & SkillTreeRowContext) {
  const s = ctx.node.skill;
  const state = states ? states[s.skillNo] : null;
  return (
    <div className="col-span-full grid min-h-9 grid-cols-subgrid items-center border-b py-1">
      <SkillTreeName sheet={sheet} {...ctx} />
      <span>
        <StateBadge state={state} />
      </span>
      <SkillCommandCells skillId={s.skillId} />
      <SkillAttrs skillId={s.skillId} />
      <span className="text-muted-foreground text-xs">
        {[
          s.rank >= 0 ? tr({ ja: `${rankLabel(s.rank)}以上`, en: `${rankLabel(s.rank)} or higher` }) : "",
          condLabel(s) || (s.cond === 0 ? tr({ ja: "流派を装備すると覚える", en: "Learned by equipping the style" }) : ""),
        ]
          .filter(Boolean)
          .join(tr({ ja: "：", en: ": " }))}
      </span>
      {/* 固有技は 0 →「習得する」（3）→「俺流で表示」（1）の 2 段階。ほかの技は 0・3 から「習得する」（1） */}
      <SkillActionButtons
        state={state}
        unique={isUniqueSkill(s)}
        advanced={advanced}
        disabled={readOnly}
        onLearn={() => tryWrite((b) => learnSheetSkill(b, sheet.id, s.skillNo), tr({ ja: "技を習得しました", en: "Learned the move" }))}
        onShowInOreRyu={() =>
          tryWrite(
            (b) => learnSheetSkills(b, sheet.id, [s.skillNo]),
            tr({ ja: "俺流に組み込めるようにしました", en: "The move can now be used in My Style" }),
          )
        }
        onForget={() => tryWrite((b) => forgetSheetSkill(b, sheet.id, s.skillNo), tr({ ja: "技を忘れさせました", en: "Forgot the move" }))}
      />
    </div>
  );
}
