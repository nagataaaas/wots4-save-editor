import { useMemo, useState, type ReactNode } from "react";
import { FieldRow } from "@/components/field-row";
import { LazyTip } from "@/components/lazy-tip";
import { SelectRow } from "@/components/select-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CUSTOM_SHEET_SKILL_MAX, findSkillConflicts, pickWithoutConflicts } from "@/save/custom-style";
import {
  RANK_LABELS,
  findSect,
  findSkillInfo,
  sheetSkillTree,
  skillName,
  stanceSkillSheet,
  stanceSkills,
  type SkillSheet,
  type SkillTreeGroup,
  type SkillTreeNode,
} from "@/save/master/sect-data";
import { SKILL_STATE, isUsableInOreRyu, type SkillState } from "@/save/sects";
import { uniqueSkillSects, uniqueWeaponsForSkill } from "@/save/unique-weapons";
import { SKILL_TREE_DESCRIPTION, STATE_LABELS, UNIQUE_WEAPON_ATTR, isKnownState, parseIntegerInRange } from "./sect-format";
import { EMPTY_FILTER, filterSortTree } from "./skill-list";

const STATE_BADGE_VARIANTS: Record<SkillState, "outline" | "secondary" | "default"> = {
  [SKILL_STATE.notLearned]: "outline",
  [SKILL_STATE.learned]: "default",
  [SKILL_STATE.learnedParent]: "default",
  [SKILL_STATE.notInOreRyu]: "secondary",
};

/** state が null はセーブ未読み込み */
export function StateBadge({ state }: { state: number | null }) {
  if (state === null) return <span className="text-muted-foreground">—</span>;
  const known = isKnownState(state);
  return (
    <Badge variant={known ? STATE_BADGE_VARIANTS[state] : "outline"} className="font-normal">
      {known ? STATE_LABELS[state] : "不明"}
    </Badge>
  );
}

/** 整数 1 つの入力欄 */
export function IntField({
  label,
  offset,
  value,
  problem,
  min,
  max,
  apply,
  note,
}: {
  label: string;
  offset: number;
  value: number | null;
  problem: string | null;
  min: number;
  max: number;
  apply: (v: number) => void;
  note?: string;
}) {
  return (
    <FieldRow
      label={label}
      offset={offset}
      value={value}
      problem={problem}
      format={String}
      parse={parseIntegerInRange(min, max)}
      apply={apply}
      inputMode="numeric"
      hint={`${min}〜${max}`}
      note={note}
    />
  );
}

const RANK_OPTIONS = RANK_LABELS.map((label, v) => ({ value: String(v), label }));

/** 段の選択欄（内部の値は 0 初段〜5 極） */
export function RankField({
  offset,
  value,
  problem,
  apply,
  note,
}: {
  offset: number;
  value: number | null;
  problem: string | null;
  apply: (v: number) => void;
  note?: string;
}) {
  return (
    <SelectRow
      label="段"
      offset={offset}
      value={value === null ? null : String(value)}
      currentLabel={value === null ? undefined : "不明"}
      options={RANK_OPTIONS}
      problem={problem}
      note={note}
      onChange={(v) => apply(Number(v))}
    />
  );
}

/**
 * 構えの技から俺流に入れる技を選ぶ。通常モードでは構えごとの状態が 1・2 の技だけ選べる（ゲームの俺流の画面と同じ 🟢）。
 * selected は親が持ち、onChange で丸ごと返す。
 */
export function SkillPicker({
  stance,
  selected,
  onChange,
  stanceStates,
  advanced,
  disabled,
}: {
  stance: number;
  selected: ReadonlySet<number>;
  onChange: (next: Set<number>) => void;
  /** null はセーブ未読み込み。状態を「—」で出し、技を薄くしない（操作は disabled で止める） */
  stanceStates: readonly number[] | null;
  advanced: boolean;
  disabled?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const skills = useMemo(() => stanceSkills(stance), [stance]);
  // 技の一覧・流派の画面と同じ木（続けて出す技・上位技）に並べる
  const sheet = useMemo(() => stanceSkillSheet(stance), [stance]);
  const groups = useMemo(() => sheetSkillTree(sheet), [sheet]);
  const shown = useMemo(() => filterSortTree(groups, { ...EMPTY_FILTER, query: filter }, "id-asc"), [groups, filter]);
  const usable = (no: number) => advanced || !stanceStates || isUsableInOreRyu(stanceStates[no]);
  const conflicts = useMemo(() => findSkillConflicts(stance, [...selected]), [stance, selected]);
  const toggle = (no: number, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(no);
    else next.delete(no);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-48"
          placeholder="技の名前で絞り込む"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() =>
            onChange(pickWithoutConflicts(stance, skills.filter((s) => usable(s.skillNo)).map((s) => s.skillNo), selected))
          }
        >
          重ならないように入れられるだけ選ぶ
        </Button>
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => onChange(new Set())}>
          選択をすべて外す
        </Button>
        <span className="text-muted-foreground text-xs">
          {selected.size} 個選択中（最大 {CUSTOM_SHEET_SKILL_MAX}）
          {conflicts.byNo.size > 0 && <span className="text-destructive">・重なり・不足 {conflicts.byNo.size} 件</span>}
        </span>
      </div>
      {conflicts.sheet.map((p) => (
        <p key={p} className="text-destructive text-xs">
          {p}
        </p>
      ))}
      <p className="text-muted-foreground text-xs">
        {SKILL_TREE_DESCRIPTION}
      </p>
      {shown.skillNos.size === 0 ? (
        <p className="text-muted-foreground text-sm">条件に合う技がありません。</p>
      ) : (
        <div className="max-h-[32rem] overflow-y-auto rounded border px-2">
          {/* 欄は技の一覧と揃える（行は subgrid） */}
          <div className="grid grid-cols-[auto_auto_auto_auto_auto_minmax(0,1fr)] gap-x-3 text-sm">
            <div className="text-muted-foreground bg-card sticky top-0 z-10 col-span-full grid grid-cols-subgrid border-b py-1 text-xs">
              <span />
              <span>技</span>
              <span>状態</span>
              <span>入力</span>
              <span>攻撃力</span>
              <span>効果</span>
            </div>
            <SkillTreeRows
              groups={shown.groups}
              // チェック欄（size-4）と欄の間（gap-x-3）の分、帯を名前の欄へずらす
              barStart="1.75rem"
              renderRow={(ctx) => {
                const s = ctx.node.skill;
                const ok = usable(s.skillNo);
                const dim = !shown.matched.has(ctx.node.key);
                const problems = conflicts.byNo.get(s.skillNo) ?? [];
                return (
                  <div
                    className={`col-span-full grid min-h-9 grid-cols-subgrid items-center border-b py-1 ${problems.length ? "bg-destructive/5" : ""} ${dim ? "opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={selected.has(s.skillNo)}
                      disabled={disabled || (!ok && !selected.has(s.skillNo))}
                      onChange={(e) => toggle(s.skillNo, e.target.checked)}
                      aria-label={skillName(s)}
                    />
                    <SkillTreeName sheet={sheet} {...ctx} dim={dim || !ok} />
                    <span>
                      <StateBadge state={stanceStates ? stanceStates[s.skillNo] : null} />
                    </span>
                    <SkillCommandCells skillId={s.skillId} />
                    <SkillAttrs skillId={s.skillId} />
                    {problems.map((p) => (
                      <span key={p} className="text-destructive col-span-full pl-6 text-xs">
                        {p}
                      </span>
                    ))}
                  </div>
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** 技の属性の略称。ホバーで元の名前を出す */
const ATTR_SHORT: Record<string, string> = {
  浮かせる: "浮",
  吹き飛ばす: "飛",
  投げ: "投",
  当て身投げ: "当投",
  打撃投げ: "打投",
  防御崩し: "崩",
  防御不可能: "防不可",
  攻撃を受けてものけぞらない: "剛",
};


function AttrTag({ label, tip }: { label: string; tip: ReactNode }) {
  return (
    <LazyTip
      className="text-muted-foreground hover:text-foreground rounded border px-1 leading-4"
      contentClassName="max-w-xs"
      content={tip}
    >
      {label}
    </LazyTip>
  );
}

/**
 * 技のコマンドと攻撃力 🟢（datatable/sect/skill.csv）。防御技は「防御技」だけ。
 * Fragment で返すので、親が grid なら 2 つの欄（コマンド・攻撃力）に入る（防御技は 2 欄にまたがる）
 */
export function SkillCommandCells({ skillId }: { skillId: number }) {
  const info = findSkillInfo(skillId);
  if (!info) return <span className="col-span-2" />;
  if (info.defenseGroup !== null) {
    return (
      <span className="col-span-2 text-xs">
        <Badge variant="secondary" className="font-normal">
          防御技
        </Badge>
      </span>
    );
  }
  return (
    <>
      <span className="font-mono text-xs">{info.commandJa || "—"}</span>
      <span className="text-muted-foreground text-xs">攻 {info.attack}</span>
    </>
  );
}

/** 固有技を覚えられる流派（🟢）と使える武器（✅ [U] 2026-10-09）の説明 */
function uniqueSkillTip(skillId: number): ReactNode {
  const sects = uniqueSkillSects(skillId).map((id) => findSect(id)?.nameJa ?? String(id));
  return (
    <span className="flex flex-col">
      <span>{UNIQUE_WEAPON_ATTR}</span>
      <span>流派：{sects.join("・") || "（流派が見つかりません）"}</span>
      <span>武器：{uniqueWeaponsForSkill(skillId).join("・") || "（武器が見つかりません）"}</span>
    </span>
  );
}

/** 技の属性の略称 🟢（datatable/sect/skill.csv）。固有技はホバーで覚えられる流派と対応する武器の名前を出す（武器は ✅ [U] 2026-10-09） */
export function SkillAttrs({ skillId }: { skillId: number }) {
  const info = findSkillInfo(skillId);
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs">
      {info?.attrs.map((a) =>
        a === UNIQUE_WEAPON_ATTR ? (
          <AttrTag key={a} label="固有技" tip={uniqueSkillTip(skillId)} />
        ) : (
          <AttrTag key={a} label={ATTR_SHORT[a] ?? a} tip={a} />
        ),
      )}
    </span>
  );
}

/** 技の木の 1 行を描くときに渡すもの */
export type SkillTreeRowContext = { node: SkillTreeNode; depth: number; first: boolean; grouped: boolean };

/** 字下げ 1 段の幅（rem） */
const INDENT_REM = 1.25;

/**
 * 技の木（sheetSkillTree）を並べる。親は grid で、行は subgrid（renderRow が col-span-full の行を返す）。
 * 元の技と上位技のまとまりは左の帯でつなぐ。字下げは続けて出す技だけに使う。
 */
export function SkillTreeRows({
  groups,
  renderRow,
  depth = 0,
  barStart = "0rem",
}: {
  groups: readonly SkillTreeGroup[];
  renderRow: (ctx: SkillTreeRowContext) => ReactNode;
  depth?: number;
  /** 名前の欄より左に欄があるとき、その幅（帯をずらす） */
  barStart?: string;
}) {
  return groups.map((group) => {
    const grouped = group.members.length > 1;
    return (
      <div key={group.key} className="relative col-span-full grid grid-cols-subgrid">
        {grouped && (
          <span aria-hidden className="bg-primary/30 absolute inset-y-1 w-0.5 rounded" style={{ left: `calc(${barStart} + ${depth * INDENT_REM}rem)` }} />
        )}
        {group.members.map((node, i) => (
          <div key={node.key} className="col-span-full grid grid-cols-subgrid">
            {renderRow({ node, depth, first: i === 0, grouped })}
            <SkillTreeRows groups={node.next} renderRow={renderRow} depth={depth + 1} barStart={barStart} />
          </div>
        ))}
      </div>
    );
  });
}

/** 技の木の名前の欄。続けて出す技は字下げして「└」、上位技は「⇧ 元の技の上位」を添える */
export function SkillTreeName({
  sheet,
  node,
  depth,
  first,
  grouped,
  dim,
}: SkillTreeRowContext & { sheet: SkillSheet; dim?: boolean }) {
  const upgradeOf = node.upgradeOf === null ? null : sheet.skills.find((x) => x.skillNo === node.upgradeOf);
  return (
    <span
      className={`flex min-w-40 flex-col ${dim ? "text-muted-foreground" : ""}`}
      style={{ paddingLeft: `${depth * INDENT_REM + (grouped ? 0.625 : 0)}rem` }}
    >
      <span>
        {depth > 0 && first && <span className="text-muted-foreground mr-1">└</span>}
        {skillName(node.skill)}
      </span>
      {upgradeOf && <span className="text-muted-foreground text-xs">⇧ {skillName(upgradeOf)}の上位</span>}
    </span>
  );
}
