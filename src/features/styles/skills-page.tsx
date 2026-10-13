import { useMemo, useState, type ReactNode } from "react";
import { InfoTip } from "@/components/info-tip";
import { LazyTip } from "@/components/lazy-tip";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScopeAnchorLink } from "@/components/anchor-link";
import { AnchoredCard } from "@/components/anchored-card";
import { SKILLS_ANCHORS } from "./anchors";
import { useAnchor } from "@/lib/navigation-context";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { WriteResult } from "@/components/write-error";
import { SECTS, SLOT_LABELS, STANCES, sheetSkillTree, stanceSkillSheet, stanceSkills, type Sect, type SkillSheet } from "@/save/master/sect-data";
import {
  forgetStanceSkill,
  isUniqueStanceSkill,
  learnStanceSkill,
  readSects,
  showStanceSkillInOreRyu,
  stanceSkillSheets,
} from "@/save/sects";
import { STANCE_TAB_CLASS, attrLabel } from "./sect-format";
import { SkillAttrs, SkillCommandCells, SkillTreeName, SkillTreeRows, StateBadge, type SkillTreeRowContext } from "./sect-ui";
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

const COMMAND_LABELS: Record<string, string> = {
  [ANY]: "すべての入力",
  ...Object.fromEntries(COMMAND_OPTIONS.map((c) => [c, c || "入力なし"])),
};
const ATTR_LABELS: Record<string, string> = {
  [ANY]: "すべての効果",
  ...Object.fromEntries(ATTR_OPTIONS.map((a) => [a, attrLabel(a)])),
};

/** タブの段：刀の構え（構えの組 0）と、それ以外（構えの組の順 🟢：槍・無手・拳銃・ライフル・二刀） */
const STANCE_ROWS = [
  { label: SLOT_LABELS[0], stances: STANCES.filter((s) => s.slot === 0) },
  { label: `${SLOT_LABELS[0]}以外`, stances: STANCES.filter((s) => s.slot !== 0).toSorted((a, b) => a.slot - b.slot || a.id - b.id) },
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

export function SkillsPage() {
  const { advanced } = useAdvancedMode();
  const [filter, setFilter] = useState<SkillFilter>(EMPTY_FILTER);
  const [minAttackText, setMinAttackText] = useState("");
  // 構えのタブの箱（リンク先にするときの名前）
  const { id: stancesId } = useAnchor(SKILLS_ANCHORS.stances);
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

  const { view, error: readError, problem, readOnly } = useSaveView(readSects, { problem: (v) => v.problem });

  // 未読み込みのときは view が null。技の表から同じ一覧を描き、状態を「—」・操作を無効にする
  const set = (patch: Partial<SkillFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      <AnchoredCard anchor={SKILLS_ANCHORS.overview} searchLabel="技">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <ScopeAnchorLink />
            技
            {/* 構えごとの技の覚え状況（chunks/skill-states）。状態は構えごとの状態を出す */}
            <InfoTip offset="0x1837C〜0x189FB、0x1417C〜" />
          </CardTitle>
          {/* 「習得する」は ✅（ゲームで反映を確認済み）。固有技の「習得する」は 🟢 要ゲーム内確認 */}
          <CardDescription>
            構えごとに全部の技を一覧し、技を習得済みにできます。
            <br />
            固有技は「俺流で表示」にすると、俺流に組み込めるようになります。
            {/* 「習得する」は、その技が入っているすべての流派の技の表と構えごとの状態に書く（流派の画面と同じ書き込み）。
                固有技は「習得する」で習得済（俺流には未組み込み） */}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
            <FilterField label="技の名前">
              <Input placeholder="名前で絞り込み" value={filter.query} onChange={(e) => set({ query: e.target.value })} />
            </FilterField>
            <FilterField label="入力">
              <Select value={filter.command} items={COMMAND_LABELS} onValueChange={(v) => v !== null && set({ command: v })}>
                <SelectTrigger className="w-full" aria-label="入力で絞り込み">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[ANY, ...COMMAND_OPTIONS].map((c) => (
                    <SelectItem key={c} value={c}>
                      {COMMAND_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="種類">
              <Select value={filter.kind} items={SKILL_KIND_LABELS} onValueChange={(v) => v !== null && set({ kind: v as SkillKind })}>
                <SelectTrigger className="w-full" aria-label="技の種類で絞り込み">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SKILL_KIND_LABELS) as SkillKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SKILL_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="攻撃力（以上）">
              <Input
                inputMode="numeric"
                placeholder="指定なし"
                value={minAttackText}
                onChange={(e) => {
                  const t = e.target.value;
                  setMinAttackText(t);
                  const n = Number(t.normalize("NFKC").trim());
                  set({ minAttack: t.trim() === "" || !Number.isFinite(n) ? null : n });
                }}
                aria-label="攻撃力の下限"
              />
            </FilterField>
            <FilterField label="効果">
              <Select value={filter.attr} items={ATTR_LABELS} onValueChange={(v) => v !== null && set({ attr: v })}>
                <SelectTrigger className="w-full" aria-label="効果で絞り込み">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[ANY, ...ATTR_OPTIONS].map((a) => (
                    <SelectItem key={a} value={a}>
                      {ATTR_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="並べ替え">
              <Select value={sort} items={SKILL_SORT_LABELS} onValueChange={(v) => v !== null && setSort(v as SkillSort)}>
                <SelectTrigger className="w-full" aria-label="並べ替え">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SKILL_SORT_LABELS) as SkillSort[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SKILL_SORT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              条件を戻す
            </Button>
          </div>
        </CardContent>
      </AnchoredCard>

      <Tabs id={stancesId} defaultValue="0" className="bg-card scroll-mt-4 rounded-xl border p-3 shadow-xs">
        {/* 構えは「刀」と「刀以外」の 2 段に、同じ幅の枠で並べる。数は 習得済/技の数、絞り込み中は条件に合う技の数 */}
        <TabsList className="h-auto w-full flex-col items-stretch gap-1.5 p-2 group-data-horizontal/tabs:h-auto">
          {STANCE_ROWS.map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="text-muted-foreground w-12 shrink-0 pl-1 text-xs font-medium">{row.label}</span>
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
                      {stance.nameJa}
                      <span className="text-xs font-normal tabular-nums opacity-70">
                        {filtering ? `${hits}件` : `${states ? nos.filter((no) => states[no] !== 0).length : "—"}/${nos.length}`}
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
  const { run, message } = useWrite();
  const nos = [...shown.skillNos];
  const pending = states ? nos.filter((no) => rows.get(no)?.learnable && states[no] === 0) : [];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={readOnly || pending.length === 0}
          onClick={() =>
            run(`${pending.length} 個の技を習得しました`, (b) => {
              for (const no of pending) learnStanceSkill(b, stance, no);
            })
          }
        >
          条件に合う技を全部習得する
        </Button>
        <span className="text-muted-foreground text-xs">
          {nos.length} 件（未習得 {states ? nos.filter((no) => states[no] === 0).length : "—"}）。段や習得条件は見ずに書き込みます。
          続けて出す技は字下げして並べます（前の技が複数ある技は、それぞれの下に出します）。上位技（⇧）は元の技と左の帯でまとめます。
          条件に合わない前の技は薄く出します。
        </span>
      </div>
      <WriteResult message={message} />
      {nos.length === 0 ? (
        <p className="text-muted-foreground text-sm">条件に合う技がありません。</p>
      ) : (
        <div className="grid grid-cols-[auto_auto_auto_auto_auto_minmax(0,1fr)_auto] gap-x-3 text-sm">
          <div className="text-muted-foreground col-span-full grid grid-cols-subgrid border-b py-1 text-xs">
            <span>技</span>
            <span>状態</span>
            <span>入力</span>
            <span>攻撃力</span>
            <span>効果</span>
            <span>流派</span>
            <span />
          </div>
          <SkillTreeRows
            groups={shown.groups}
            renderRow={(ctx) => (
              <SkillRow
                {...ctx}
                {...actions}
                run={run}
                sheet={sheet}
                row={rows.get(ctx.node.skill.skillNo)!}
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
  run,
  ...ctx
}: RowActions & SkillTreeRowContext & {
  sheet: SkillSheet;
  row: Row;
  state: number | null;
  dim: boolean;
  run: (label: string, f: (b: Uint8Array) => void) => void;
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
            content={row.sects.map((x) => x.nameJa).join("・")}
          >
            {row.sects.length === 1 ? row.sects[0].nameJa : `${row.sects[0].nameJa} ほか ${row.sects.length - 1}`}
          </LazyTip>
        ) : (
          <span className="text-muted-foreground">{row.learnable ? "（手に入れられない流派のみ）" : "—"}</span>
        )}
      </span>
      <span className="flex justify-end gap-1">
        {/* 流派の画面と同じ：固有技は 0 →「習得する」（3）→「俺流で表示」（1）。ほかの技は 0・3 から「習得する」（1） */}
        {state === 3 && row.unique ? (
          <Button
            size="sm"
            variant="outline"
            disabled={readOnly || !row.learnable}
            onClick={() => run("俺流に組み込めるようにしました", (b) => showStanceSkillInOreRyu(b, stance, s.skillNo))}
          >
            俺流で表示
          </Button>
        ) : (
          // 未読み込み（state が null）のときも、無効にした「習得する」を出す
          (state === null || state === 0 || state === 3) && (
            <Button
              size="sm"
              variant="outline"
              disabled={readOnly || !row.learnable}
              title={row.learnable ? undefined : "この技が入っている流派がないので習得できません"}
              onClick={() => run("技を習得しました", (b) => learnStanceSkill(b, stance, s.skillNo))}
            >
              習得する
            </Button>
          )
        )}
        {advanced && state !== null && state !== 0 && (
          <Button
            size="sm"
            variant="ghost"
            disabled={readOnly}
            onClick={() => run("技を忘れさせました", (b) => forgetStanceSkill(b, stance, s.skillNo))}
          >
            忘れさせる
          </Button>
        )}
      </span>
    </div>
  );
}
