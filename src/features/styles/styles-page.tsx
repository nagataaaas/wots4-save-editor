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
import {
  RANK_LABELS,
  SECTS,
  SLOT_LABELS,
  findSect,
  findSkillSheet,
  findStance,
  sheetSkillTree,
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
  countLearned,
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
  type SectsView,
} from "@/save/sects";
import { READ_ONLY_REASON, SKILL_TREE_DESCRIPTION, STANCE_TAB_CLASS } from "./sect-format";
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
  if (slot >= 0) places.push(`装備中（${SLOT_LABELS[slot]}）`);
  if (view.held.some((s) => s.sect?.id === id)) places.push("持ち歩き");
  if (view.stored.some((s) => s.sect?.id === id)) places.push("道場の箪笥");
  return places;
}

type PlaceFilter = "owned" | "equipped" | "held" | "stored" | "missing" | "all";

const PLACE_FILTER_LABELS: Record<PlaceFilter, string> = {
  owned: "持っている",
  equipped: "装備中",
  held: "持ち歩き",
  stored: "道場の箪笥",
  missing: "持っていない",
  all: "すべて",
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
  const { advanced } = useAdvancedMode();
  const [query, setQuery] = useState("");
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>("owned");
  const [uniqueOnly, setUniqueOnly] = useState(false);

  const { view, error: readError, problem, readOnly } = useSaveView(readSects);

  // 未読み込みのときは view が null。流派の表から同じカードを描き、値を空・操作を無効にする
  const owned = view ? ownedSectIds(view) : null;
  const sects = SECTS.filter((s) => !s.hidden || advanced)
    .filter((s) => matchesSearch(query, [s.nameJa, s.nameEn]))
    // 置き場所はセーブから決まるので、未読み込みのときは絞り込まない
    .filter((s) => !view || !owned || matchesPlace(placeFilter, view, owned, s.id))
    .filter((s) => !uniqueOnly || sectHasUniqueSkill(s));

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      {/* 技の覚え状況の書き込みは ✅（ゲームで反映を確認済み）。腕前点・修練度・段・倒した数は 🟢（書き換えはゲーム内で未確認） */}
      <AnchoredCard
        anchor={STYLES_ANCHORS.overview}
        title="流派"
        // chunks/skill-states・styles（技の覚え状況〜流派の表）・sect-scrolls（流派の書）
        extra={<InfoTip offset={OVERVIEW_OFFSETS} />}
        description="流派ごとに技を覚えた状態にできます。"
      >
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid items-start gap-4 sm:grid-cols-3">
            <IntField
              label="腕前点"
              offset={SKILL_POINTS_OFFSET}
              value={view?.skillPoints ?? null}
              problem={view?.problem ? READ_ONLY_REASON : null}
              min={0}
              max={advanced ? 0xffff : SKILL_POINTS_MAX}
              apply={(v) => update((b) => writeSkillPoints(b, v, { advanced }))}
              note={`俺流を作るとき、選んだ技の腕前点の合計がこれ以下である必要があります。上限は ${SKILL_POINTS_MAX} です（上級者モードではそれ以上も入力できます）`}
              // 🟢 要ゲーム内確認
            />
            <span className="sm:pt-7">
              習得技数：{view?.learnedCount ?? "—"}
              <InfoTip offset={LEARNED_COUNT_OFFSET}>戦闘中に閃いて覚えた数。ここでの書き換えでは増やしません</InfoTip>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SLOT_LABELS.map((label, s) => (
              <Badge key={s} variant="outline" className="font-normal">
                {label}：{view ? (findSect(view.equipped[s])?.nameJa ?? "俺流など") : "—"}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="流派名で絞り込み" value={query} onChange={(e) => setQuery(e.target.value)} />
            <FilterSelect
              options={(Object.keys(PLACE_FILTER_LABELS) as PlaceFilter[]).map((value) => ({ value, label: PLACE_FILTER_LABELS[value] }))}
              value={placeFilter}
              onChange={setPlaceFilter}
              disabled={!view}
              className="w-36"
              aria-label="置き場所で絞り込み"
            />
            <Label className="font-normal">
              <Checkbox checked={uniqueOnly} onCheckedChange={(on) => setUniqueOnly(on)} />
              固有技がある流派のみ
            </Label>
            <span className="text-muted-foreground text-xs">{sects.length} 件</span>
          </div>
        </CardContent>
      </AnchoredCard>

      {sects.map((sect) => (
        <SectCard key={sect.id} sect={sect} view={view} readOnly={readOnly} />
      ))}
      {sects.length === 0 && <p className="text-muted-foreground text-sm">条件に合う流派がありません。</p>}
    </div>
  );
}

const skillNosOf = (sheet: SkillSheet) => sheet.skills.map((s) => s.skillNo);

function SectCard({
  sect,
  view,
  readOnly,
}: {
  sect: Sect;
  /** null はセーブ未読み込み */
  view: SectsView | null;
  readOnly: boolean;
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
  const valueProblem = !view ? null : readOnly ? READ_ONLY_REASON : rec ? null : "流派の表にこの流派がありません";
  const values: SectValues | null = rec ? { mastery: rec.mastery, rank: rec.rank, kills: rec.kills } : null;
  const writeValues = (v: SectValues) => update((b) => writeSectValues(b, sect.id, v));

  return (
    <CollapsibleCard
      anchor={STYLES_ANCHORS.sect(sect.id)}
      searchLabel={sect.nameJa}
      title={
        // 流派名・構え・段・修練度・技の数は、流派のカードどうしで縦に揃うように幅を決めておく
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex w-[10.5em] shrink-0 items-center gap-1.5">
            {/* 固有技のある流派の印。ない流派も同じ幅を空けて、流派名の左端を揃える */}
            <span className="w-5 shrink-0">
              {hasUnique && (
                <span
                  className="text-muted-foreground rounded border px-1 text-xs leading-4 font-normal"
                  title="固有技がある流派です"
                  aria-label="固有技がある流派です"
                >
                  固
                </span>
              )}
            </span>
            {sect.nameJa}
          </span>
          <span className="text-muted-foreground flex items-center gap-x-3 text-xs font-normal">
            <span className="w-[9em] shrink-0">
              {sheets.map((s) => findStance(s.sheet.stance)?.nameJa).join("・")}
            </span>
            <span className="w-[2.5em] shrink-0">{rec ? (RANK_LABELS[rec.rank] ?? "不明") : "—"}</span>
            <span className="w-[7.5em] shrink-0 tabular-nums">修練度 {rec ? rec.mastery : "—"}</span>
            <span className="w-[5em] shrink-0 tabular-nums">
              技 {learned ?? "—"}/{total}
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => tryWrite((b) => learnSectSkills(b, sect.id), `${sect.nameJa} の技を習得しました`)}
            disabled={readOnly || learned === total}
          >
            技を全部習得する
          </Button>
          <span className="text-muted-foreground text-xs">
            {/* 固有技の「習得する」は 🟢 要ゲーム内確認 */}
            段は「極」にはならないので、必要なら下の段を変更してください。
            固有技は「習得する」で習得済（俺流には未組み込み）、「俺流で表示」で俺流に組み込める状態にします。
            {SKILL_TREE_DESCRIPTION}
          </span>
          <WriteResult message={message} className="basis-full" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <IntField
            label="修練度"
            offset={rec ? sectValueOffset(rec.offset, 'mastery') : undefined}
            value={values?.mastery ?? null}
            problem={valueProblem}
            min={0}
            max={MASTERY_MAX}
            apply={(m) => values && writeValues({ ...values, mastery: m, rank: Math.max(values.rank, rankForMastery(sect, m)) })}
            note={`しきい値：${sect.thresholds.join("・")}。修練度に合わせて段も上げます`}
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
            label="この流派で倒した数"
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
        <Tabs defaultValue={String(sheets[0]?.sheet.id)}>
          {sheets.length > 1 && (
            <TabsList className="h-auto gap-1.5 p-1.5 group-data-horizontal/tabs:h-auto">
              {sheets.map(({ sheet, states }) => (
                <TabsTrigger key={sheet.id} value={String(sheet.id)} className={`${STANCE_TAB_CLASS} flex-none gap-3`}>
                  {findStance(sheet.stance)?.nameJa}
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
        {[s.rank >= 0 ? `${RANK_LABELS[s.rank]}以上` : "", s.condJa || (s.cond === 0 ? "流派を装備すると覚える" : "")]
          .filter(Boolean)
          .join("：")}
      </span>
      {/* 固有技は 0 →「習得する」（3）→「俺流で表示」（1）の 2 段階。ほかの技は 0・3 から「習得する」（1） */}
      <SkillActionButtons
        state={state}
        unique={isUniqueSkill(s)}
        advanced={advanced}
        disabled={readOnly}
        onLearn={() => tryWrite((b) => learnSheetSkill(b, sheet.id, s.skillNo), "技を習得しました")}
        onShowInOreRyu={() => tryWrite((b) => learnSheetSkills(b, sheet.id, [s.skillNo]), "俺流に組み込めるようにしました")}
        onForget={() => tryWrite((b) => forgetSheetSkill(b, sheet.id, s.skillNo), "技を忘れさせました")}
      />
    </div>
  );
}
