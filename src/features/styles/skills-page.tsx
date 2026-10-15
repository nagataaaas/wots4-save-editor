import { useMemo, useState, type ReactNode } from "react";
import { FilterSelect, type FilterOption } from "@/components/filter-select";
import { InfoTip } from "@/components/info-tip";
import { LazyTip } from "@/components/lazy-tip";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { formatOffset } from "@/lib/format";
import { SKILLS_ANCHORS } from "./anchors";
import { useAnchor } from "@/lib/navigation-context";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { WriteResult } from "@/components/write-error";
import { tr, type Localized } from "@/lib/i18n";
import {
  SECTS,
  SLOT_LABELS,
  STANCES,
  commandLabel,
  sectName,
  sheetSkillTree,
  stanceName,
  stanceSkillSheet,
  stanceSkills,
  type Sect,
  type SkillSheet,
} from "@/save/master/sect-data";
import {
  SHEET_STATES_OFFSET,
  STANCE_STATES_END,
  countLearned,
  forgetStanceSkill,
  isLearned,
  isUniqueStanceSkill,
  learnStanceSkill,
  learnStanceSkills,
  readSects,
  showStanceSkillInOreRyu,
  stanceSkillSheets,
} from "@/save/sects";
import { STANCE_TAB_CLASS, attrLabel, skillTreeDescription } from "./sect-format";
import { SkillAttrs, SkillCommandCells, SkillTreeName, SkillTreeRows, StateBadge, type SkillTreeRowContext } from "./sect-ui";
import { SkillActionButtons } from "./skill-action-buttons";
import {
  ANY,
  ATTR_OPTIONS,
  COMMAND_OPTIONS,
  EMPTY_FILTER,
  SKILL_KIND_LABELS,
  SKILL_SORT_LABELS,
  filterSortTree,
  type ShownTree,
  type SkillFilter,
  type SkillKind,
  type SkillSort,
} from "./skill-list";

/** 絞り込み・並べ替えの選択肢（今の言語で作るので描画中に呼ぶ） */
function filterOptions() {
  const command: FilterOption<string>[] = [
    { value: ANY, label: tr({ ja: "すべての入力", en: "All commands" }) },
    ...COMMAND_OPTIONS.map((c) => ({ value: c, label: commandLabel(c) || tr({ ja: "入力なし", en: "No command" }) })),
  ];
  const attr: FilterOption<string>[] = [
    { value: ANY, label: tr({ ja: "すべての効果", en: "All effects" }) },
    ...ATTR_OPTIONS.map((a) => ({ value: a, label: attrLabel(a) })),
  ];
  const kind = (Object.keys(SKILL_KIND_LABELS) as SkillKind[]).map((value) => ({ value, label: tr(SKILL_KIND_LABELS[value]) }));
  const sort = (Object.keys(SKILL_SORT_LABELS) as SkillSort[]).map((value) => ({ value, label: tr(SKILL_SORT_LABELS[value]) }));
  return { command, attr, kind, sort };
}

/** タブの段：刀の構え（構えの組 0）と、それ以外（構えの組の順 🟢：槍・無手・拳銃・ライフル・二刀）。key は段の識別子 */
const STANCE_ROWS: { key: string; label: Localized; stances: typeof STANCES }[] = [
  { key: "sword", label: SLOT_LABELS[0], stances: STANCES.filter((s) => s.slot === 0) },
  {
    key: "other",
    label: { ja: `${SLOT_LABELS[0].ja}以外`, en: "Other" },
    stances: STANCES.filter((s) => s.slot !== 0).toSorted((a, b) => a.slot - b.slot || a.id - b.id),
  },
];

/** 構えの技 1 つが入っている技の表・流派 */
type Row = {
  /** 習得に使う技の表があるか（stanceSkillSheets） */
  learnable: boolean;
  unique: boolean;
  /** 技が入っている流派（主人公が手に入れられない流派は除く） */
  sects: Sect[];
};

/** 構えの技の番号 → Row */
function stanceRows(stance: number): Map<number, Row> {
  return new Map(
    stanceSkills(stance).map((skill) => {
      const sheets = stanceSkillSheets(stance, skill.skillNo).map((s) => s.id);
      const row: Row = {
        learnable: sheets.length > 0,
        unique: isUniqueStanceSkill(stance, skill.skillNo),
        sects: SECTS.filter((s) => !s.hidden && s.sheets.some((id) => sheets.includes(id))),
      };
      return [skill.skillNo, row];
    }),
  );
}

/** 表にない技の Row（習得できない・流派なし）。行も木も stanceSkills から作るので、ふつうは使わない */
const NO_ROW: Row = { learnable: false, unique: false, sects: [] };
const rowOf = (rows: ReadonlyMap<number, Row>, no: number): Row => rows.get(no) ?? NO_ROW;

export function SkillsPage() {
  const { advanced } = useAdvancedMode();
  const [filter, setFilter] = useState<SkillFilter>(EMPTY_FILTER);
  const [minAttackText, setMinAttackText] = useState("");
  // 構えのタブの箱（リンク先にするときの名前）
  const { id: stancesId, ref: stancesRef } = useAnchor(SKILLS_ANCHORS.stances);
  const [sort, setSort] = useState<SkillSort>("id-asc");
  const rowsByStance = useMemo(() => STANCES.map((s) => stanceRows(s.id)), []);
  // 構えの技を、流派の画面と同じ木（続けて出す技・上位技）に並べる
  const trees = useMemo(
    () =>
      STANCES.map((s) => {
        const sheet = stanceSkillSheet(s.id);
        return { sheet, groups: sheetSkillTree(sheet) };
      }),
    [],
  );
  const shownByStance = useMemo(() => trees.map((t) => filterSortTree(t.groups, filter, sort)), [trees, filter, sort]);
  const filtering = JSON.stringify(filter) !== JSON.stringify(EMPTY_FILTER);
  const options = useMemo(() => filterOptions(), []);

  const { view, error: readError, problem, readOnly } = useSaveView(readSects);

  // 未読み込みのときは view が null。技の表から同じ一覧を描き、状態を「—」・操作を無効にする
  const set = (patch: Partial<SkillFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      {/* 「習得する」は ✅（ゲームで反映を確認済み）。固有技の「習得する」は 🟢 要ゲーム内確認 */}
      <AnchoredCard
        anchor={SKILLS_ANCHORS.overview}
        title={tr({ ja: "技", en: "Moves" })}
        // 技の覚え状況（chunks/skill-states）：技の表ごとの状態に続いて構えごとの状態。状態は構えごとの状態を出す
        extra={<InfoTip offset={`${formatOffset(SHEET_STATES_OFFSET)}〜${formatOffset(STANCE_STATES_END - 1)}`} />}
        description={
          <>
            {tr({ ja: "構えごとに全部の技を一覧し、技を習得済みにできます。", en: "Lists every move for each stance and lets you mark moves as learned." })}
            <br />
            {tr({
              ja: "固有技は「俺流で表示」にすると、俺流に組み込めるようになります。",
              en: 'Unique moves can be added to My Style after you use "Show in My Style".',
            })}
            {/* 「習得する」は、その技が入っているすべての流派の技の表と構えごとの状態に書く（流派の画面と同じ書き込み）。
                固有技は「習得する」で習得済（俺流には未組み込み） */}
          </>
        }
      >
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
            <FilterField label={tr({ ja: "技の名前", en: "Move name" })}>
              <Input
                placeholder={tr({ ja: "名前で絞り込み", en: "Filter by name" })}
                value={filter.query}
                onChange={(e) => set({ query: e.target.value })}
              />
            </FilterField>
            <FilterField label={tr({ ja: "入力", en: "Command" })}>
              <FilterSelect
                options={options.command}
                value={filter.command}
                onChange={(command) => set({ command })}
                className="w-full"
                aria-label={tr({ ja: "入力で絞り込み", en: "Filter by command" })}
              />
            </FilterField>
            <FilterField label={tr({ ja: "種類", en: "Type" })}>
              <FilterSelect
                options={options.kind}
                value={filter.kind}
                onChange={(kind) => set({ kind })}
                className="w-full"
                aria-label={tr({ ja: "技の種類で絞り込み", en: "Filter by move type" })}
              />
            </FilterField>
            <FilterField label={tr({ ja: "攻撃力（以上）", en: "Strength (min)" })}>
              <Input
                inputMode="numeric"
                placeholder={tr({ ja: "指定なし", en: "Any" })}
                value={minAttackText}
                onChange={(e) => {
                  const t = e.target.value;
                  setMinAttackText(t);
                  const n = Number(t.normalize("NFKC").trim());
                  set({ minAttack: t.trim() === "" || !Number.isFinite(n) ? null : n });
                }}
                aria-label={tr({ ja: "攻撃力の下限", en: "Minimum strength" })}
              />
            </FilterField>
            <FilterField label={tr({ ja: "効果", en: "Effects" })}>
              <FilterSelect
                options={options.attr}
                value={filter.attr}
                onChange={(attr) => set({ attr })}
                className="w-full"
                aria-label={tr({ ja: "効果で絞り込み", en: "Filter by effect" })}
              />
            </FilterField>
            <FilterField label={tr({ ja: "並べ替え", en: "Sort" })}>
              <FilterSelect
                options={options.sort}
                value={sort}
                onChange={setSort}
                className="w-full"
                aria-label={tr({ ja: "並べ替え", en: "Sort" })}
              />
            </FilterField>
            <Button
              variant="outline"
              className="self-end"
              disabled={!filtering && sort === "id-asc"}
              onClick={() => {
                setFilter(EMPTY_FILTER);
                setMinAttackText("");
                setSort("id-asc");
              }}
            >
              {tr({ ja: "条件を戻す", en: "Reset filters" })}
            </Button>
          </div>
        </CardContent>
      </AnchoredCard>

      <Tabs ref={stancesRef} id={stancesId} defaultValue="0" className="bg-card scroll-mt-4 rounded-xl border p-3 shadow-xs">
        {/* 構えは「刀」と「刀以外」の 2 段に、同じ幅の枠で並べる。数は 習得済/技の数、絞り込み中は条件に合う技の数 */}
        <TabsList className="h-auto w-full flex-col items-stretch gap-1.5 p-2 group-data-horizontal/tabs:h-auto">
          {STANCE_ROWS.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <span className="text-muted-foreground w-12 shrink-0 pl-1 text-xs font-medium">{tr(row.label)}</span>
              <div className="grid flex-1 grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-7">
                {row.stances.map((stance) => {
                  const states = view?.stanceStates[stance.id];
                  const nos = [...rowsByStance[stance.id].keys()];
                  const hits = shownByStance[stance.id].skillNos.size;
                  return (
                    <TabsTrigger
                      key={stance.id}
                      value={String(stance.id)}
                      className={`${STANCE_TAB_CLASS} w-full justify-between`}
                      disabled={filtering && hits === 0}
                    >
                      {stanceName(stance)}
                      <span className="text-xs font-normal tabular-nums opacity-70">
                        {filtering
                          ? tr({ ja: `${hits}件`, en: String(hits) })
                          : `${states ? countLearned(states, nos) : "—"}/${nos.length}`}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsList>
        {STANCES.map((stance) => (
          <TabsContent key={stance.id} value={String(stance.id)}>
            <StanceSkillTable
              stance={stance.id}
              sheet={trees[stance.id].sheet}
              shown={shownByStance[stance.id]}
              rows={rowsByStance[stance.id]}
              states={view ? view.stanceStates[stance.id] : null}
              readOnly={readOnly}
              advanced={advanced}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </label>
  );
}

type RowActions = {
  stance: number;
  readOnly: boolean;
  advanced: boolean;
};

function StanceSkillTable({
  sheet,
  shown,
  rows,
  states,
  ...actions
}: RowActions & {
  sheet: SkillSheet;
  shown: ShownTree;
  rows: ReadonlyMap<number, Row>;
  /** null はセーブ未読み込み */
  states: readonly number[] | null;
}) {
  const { stance, readOnly } = actions;
  // 結果は表の上に出す（行ごとには出さない）
  const { tryWrite, message } = useWrite();
  const nos = [...shown.skillNos];
  const pending = states ? nos.filter((no) => rowOf(rows, no).learnable && !isLearned(states[no])) : [];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={readOnly || pending.length === 0}
          onClick={() =>
            tryWrite(
              (b) => learnStanceSkills(b, stance, pending),
              tr({
                ja: `${pending.length} 個の技を習得しました`,
                en: pending.length === 1 ? "Learned 1 move" : `Learned ${pending.length} moves`,
              }),
            )
          }
        >
          {tr({ ja: "条件に合う技を全部習得する", en: "Learn all matching moves" })}
        </Button>
        <span className="text-muted-foreground text-xs">
          {tr({
            ja: `${nos.length} 件（未習得 ${states ? nos.length - countLearned(states, nos) : "—"}）。段や習得条件は見ずに書き込みます。`,
            en: `${nos.length} moves (${states ? nos.length - countLearned(states, nos) : "—"} not learned). Writes without checking rank or learning conditions. `,
          })}
          {skillTreeDescription()}
          {tr({ ja: "条件に合わない前の技は薄く出します。", en: " Preceding moves that do not match are dimmed." })}
        </span>
      </div>
      <WriteResult message={message} />
      {nos.length === 0 ? (
        <p className="text-muted-foreground text-sm">{tr({ ja: "条件に合う技がありません。", en: "No moves match." })}</p>
      ) : (
        <div className="grid grid-cols-[auto_auto_auto_auto_auto_minmax(0,1fr)_auto] gap-x-3 text-sm">
          <div className="text-muted-foreground col-span-full grid grid-cols-subgrid border-b py-1 text-xs">
            <span>{tr({ ja: "技", en: "Move" })}</span>
            <span>{tr({ ja: "状態", en: "Status" })}</span>
            <span>{tr({ ja: "入力", en: "Command" })}</span>
            <span>{tr({ ja: "攻撃力", en: "Strength" })}</span>
            <span>{tr({ ja: "効果", en: "Effects" })}</span>
            <span>{tr({ ja: "流派", en: "Styles" })}</span>
            <span />
          </div>
          <SkillTreeRows
            groups={shown.groups}
            renderRow={(ctx) => (
              <SkillRow
                {...ctx}
                {...actions}
                tryWrite={tryWrite}
                sheet={sheet}
                row={rowOf(rows, ctx.node.skill.skillNo)}
                state={states ? states[ctx.node.skill.skillNo] : null}
                dim={!shown.matched.has(ctx.node.key)}
              />
            )}
          />
        </div>
      )}
    </div>
  );
}

function SkillRow({
  row,
  state,
  dim,
  sheet,
  stance,
  readOnly,
  advanced,
  tryWrite,
  ...ctx
}: RowActions & SkillTreeRowContext & {
  sheet: SkillSheet;
  row: Row;
  state: number | null;
  dim: boolean;
  /** 書き込んで、結果を構えのカードに出す（useWrite の tryWrite） */
  tryWrite: (f: (b: Uint8Array) => void, success: string) => void;
}) {
  const s = ctx.node.skill;
  return (
    <div className={`col-span-full grid min-h-9 grid-cols-subgrid items-center border-b py-1 ${dim ? "opacity-60" : ""}`}>
      <SkillTreeName sheet={sheet} {...ctx} dim={dim} />
      <span>
        <StateBadge state={state} />
      </span>
      <SkillCommandCells skillId={s.skillId} />
      <SkillAttrs skillId={s.skillId} />
      <span className="text-xs">
        {row.sects.length > 0 ? (
          <LazyTip
            className="text-muted-foreground hover:text-foreground underline decoration-dotted"
            contentClassName="max-w-sm"
            content={row.sects.map(sectName).join(tr({ ja: "・", en: ", " }))}
          >
            {row.sects.length === 1
              ? sectName(row.sects[0])
              : tr({
                  ja: `${sectName(row.sects[0])} ほか ${row.sects.length - 1}`,
                  en: `${sectName(row.sects[0])} and ${row.sects.length - 1} more`,
                })}
          </LazyTip>
        ) : (
          <span className="text-muted-foreground">
            {row.learnable ? tr({ ja: "（手に入れられない流派のみ）", en: "(Only styles you cannot obtain)" }) : "—"}
          </span>
        )}
      </span>
      {/* 流派の画面と同じ：固有技は 0 →「習得する」（3）→「俺流で表示」（1）。ほかの技は 0・3 から「習得する」（1） */}
      <SkillActionButtons
        state={state}
        unique={row.unique}
        advanced={advanced}
        disabled={readOnly}
        learnable={row.learnable}
        onLearn={() => tryWrite((b) => learnStanceSkill(b, stance, s.skillNo), tr({ ja: "技を習得しました", en: "Learned the move" }))}
        onShowInOreRyu={() =>
          tryWrite(
            (b) => showStanceSkillInOreRyu(b, stance, s.skillNo),
            tr({ ja: "俺流に組み込めるようにしました", en: "The move can now be used in My Style" }),
          )
        }
        onForget={() => tryWrite((b) => forgetStanceSkill(b, stance, s.skillNo), tr({ ja: "技を忘れさせました", en: "Forgot the move" }))}
      />
    </div>
  );
}
