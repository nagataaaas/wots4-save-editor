import { useMemo, useState } from "react";
import { FieldRow } from "@/components/field-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findSkillConflicts, pickWithoutConflicts } from "@/save/custom-style";
import { findSkillInfo, findStanceSkill, skillName, stanceSkills } from "@/save/master/sect-data";
import { STATE_LABELS, parseInteger } from "./sect-format";

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

/** 技のコマンド・攻撃力・属性・防御技の表示 🟢（datatable/sect/skill.csv） */
export function SkillMeta({ skillId }: { skillId: number }) {
  const info = findSkillInfo(skillId);
  if (!info) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      {info.defenseGroup !== null ? (
        <Badge variant="secondary" className="font-normal">
          防御技
        </Badge>
      ) : (
        <>
          <span className="font-mono">{info.commandJa || "—"}</span>
          <span className="text-muted-foreground">攻 {info.attack}</span>
        </>
      )}
      {info.attrs.map((a) => (
        <Badge key={a} variant="outline" className="font-normal">
          {a}
        </Badge>
      ))}
    </span>
  );
}
