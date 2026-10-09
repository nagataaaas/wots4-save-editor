import { useMemo, useState, type ReactNode } from "react";
import { FieldRow } from "@/components/field-row";
import { LazyTip } from "@/components/lazy-tip";
import { SelectRow } from "@/components/select-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findSkillConflicts, pickWithoutConflicts } from "@/save/custom-style";
import {
  RANK_LABELS,
  findSect,
  findSkillInfo,
  findStanceSkill,
  skillName,
  stanceSkills,
  type SkillSheet,
  type SkillTreeGroup,
  type SkillTreeNode,
} from "@/save/master/sect-data";
import { uniqueSkillSects, uniqueWeaponsForSkill } from "@/save/unique-weapons";
import { STATE_LABELS, UNIQUE_WEAPON_ATTR, parseInteger } from "./sect-format";

export function StateBadge({ state }: { state: number }) {
  return (
    <Badge variant={state === 0 ? "outline" : state === 3 ? "secondary" : "default"} className="font-normal">
      {STATE_LABELS[state] ?? `不明（${state}）`}
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
      parse={parseInteger(min, max)}
      apply={apply}
      inputMode="numeric"
      hint={`${min}〜${max}`}
      note={note}
    />
  );
}

const RANK_OPTIONS = RANK_LABELS.map((label, v) => ({ value: String(v), label }));

/** 段の選択欄（0 初段〜5 極） */
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
      currentLabel={value === null ? undefined : `不明（${value}）`}
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
  stanceStates: readonly number[];
  advanced: boolean;
  disabled?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const skills = useMemo(() => stanceSkills(stance), [stance]);
  const usable = (no: number) => advanced || stanceStates[no] === 1 || stanceStates[no] === 2;
  const shown = skills.filter((s) => (filter === "" ? true : skillName(s).includes(filter) || (findSkillInfo(s.skillId)?.commandJa ?? "").includes(filter)));
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
          {selected.size} 個選択中（最大 128）
          {conflicts.byNo.size > 0 && <span className="text-destructive">・重なり・不足 {conflicts.byNo.size} 件</span>}
        </span>
      </div>
      {conflicts.sheet.map((p) => (
        <p key={p} className="text-destructive text-xs">
          {p}
        </p>
      ))}
      <ul className="max-h-[32rem] divide-y overflow-y-auto rounded border px-2">
        {shown.map((s) => {
          const ok = usable(s.skillNo);
          const problems = conflicts.byNo.get(s.skillNo) ?? [];
          return (
            <li key={s.skillNo} className={`flex flex-col gap-0.5 py-1 text-sm ${problems.length ? "bg-destructive/5" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={selected.has(s.skillNo)}
                  disabled={disabled || (!ok && !selected.has(s.skillNo))}
                  onChange={(e) => toggle(s.skillNo, e.target.checked)}
                  aria-label={skillName(s)}
                />
                <span className={`min-w-28 ${ok ? "" : "text-muted-foreground"}`}>{skillName(s)}</span>
                {s.first && (
                  <Badge variant="outline" className="font-normal">
                    初段
                  </Badge>
                )}
                <SkillMeta skillId={s.skillId} />
                {!s.first && s.prev.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    ← {s.prev.map((p) => skillName(findStanceSkill(stance, p) ?? { nameJa: String(p) })).join("・")} の次
                  </span>
                )}
                {!ok && <span className="text-muted-foreground text-xs">（{STATE_LABELS[stanceStates[s.skillNo]] ?? ""}）</span>}
              </div>
              {problems.map((p) => (
                <span key={p} className="text-destructive pl-6 text-xs">
                  {p}
                </span>
              ))}
            </li>
          );
        })}
      </ul>
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

/** 技のコマンド・攻撃力・属性・防御技を 1 か所にまとめた表示（俺流の技選び用） */
export function SkillMeta({ skillId }: { skillId: number }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <SkillCommandCells skillId={skillId} />
      <SkillAttrs skillId={skillId} />
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
}: {
  groups: readonly SkillTreeGroup[];
  renderRow: (ctx: SkillTreeRowContext) => ReactNode;
  depth?: number;
}) {
  return groups.map((group) => {
    const grouped = group.members.length > 1;
    return (
      <div key={group.key} className="relative col-span-full grid grid-cols-subgrid">
        {grouped && (
          <span aria-hidden className="bg-primary/30 absolute inset-y-1 w-0.5 rounded" style={{ left: `${depth * INDENT_REM}rem` }} />
        )}
        {group.members.map((node, i) => (
          <div key={node.key} className="col-span-full grid grid-cols-subgrid">
            {renderRow({ node, depth, first: i === 0, grouped })}
            <SkillTreeRows groups={node.next} renderRow={renderRow} depth={depth + 1} />
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
