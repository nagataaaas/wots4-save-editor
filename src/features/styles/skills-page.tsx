import { useMemo, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import { LazyTip } from "@/components/lazy-tip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import { SECTS, STANCES, findStanceSkill, skillName, stanceSkills, type Sect, type StanceSkill } from "@/save/master/sect-data";
import {
  forgetStanceSkill,
  isUniqueStanceSkill,
  learnStanceSkill,
  readSects,
  showStanceSkillInOreRyu,
  stanceSkillSheets,
  type SectsView,
} from "@/save/sects";
import { attrLabel, errorMessage } from "./sect-format";
import { SkillAttrs, SkillCommandCells, StateBadge } from "./sect-ui";
import {
  ANY,
  ATTR_OPTIONS,
  COMMAND_OPTIONS,
  EMPTY_FILTER,
  SKILL_KIND_LABELS,
  SKILL_SORT_LABELS,
  matchesSkillFilter,
  sortSkills,
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

/** 構えの技 1 つと、入っている技の表・流派 */
type Row = {
  skill: StanceSkill;
  /** 習得に使う技の表があるか（stanceSkillSheets） */
  learnable: boolean;
  unique: boolean;
  /** 技が入っている流派（主人公が手に入れられない流派は除く） */
  sects: Sect[];
};

function stanceRows(stance: number): Row[] {
  return stanceSkills(stance).map((skill) => {
    const sheets = stanceSkillSheets(stance, skill.skillNo).map((s) => s.id);
    return {
      skill,
      learnable: sheets.length > 0,
      unique: isUniqueStanceSkill(stance, skill.skillNo),
      sects: SECTS.filter((s) => !s.hidden && s.sheets.some((id) => sheets.includes(id))),
    };
  });
}

export function SkillsPage() {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const [filter, setFilter] = useState<SkillFilter>(EMPTY_FILTER);
  const [minAttackText, setMinAttackText] = useState("");
  const [sort, setSort] = useState<SkillSort>("id-asc");
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const rowsByStance = useMemo(() => STANCES.map((s) => stanceRows(s.id)), []);

  const result = useMemo((): { view: SectsView } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: readSects(save.working) };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  }, [save]);

  if (!result) {
    return (
      <Alert>
        <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
        <AlertDescription>サイドバーの「ファイルを開く」から読み込んでください。</AlertDescription>
      </Alert>
    );
  }
  if ("error" in result) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込めません</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  const view = result.view;
  const readOnly = view.problem !== null;
  const set = (patch: Partial<SkillFilter>) => setFilter((f) => ({ ...f, ...patch }));

  const run = (label: string, f: (b: Uint8Array) => void) => {
    try {
      update(f);
      setMessage({ error: false, text: label });
    } catch (e) {
      setMessage({ error: true, text: errorMessage(e) });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {view.problem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.problem}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            技
            <InfoTip offset="0x1837C〜0x189FB（構えごと）、0x1417C〜（技の表ごと）">
              構えごとの技の覚え状況（chunks/skill-states）。状態は構えごとの状態を出します
            </InfoTip>
          </CardTitle>
          <CardDescription>
            構えごとにすべての技を並べます。「習得する」は、その技が入っているすべての流派の技の表と構えごとの状態に書きます（流派の画面と同じ書き込み。ゲームで反映を確認済み）。
            固有技は「習得する」で習得済（俺流には未組み込み）（🟢 要ゲーム内確認）、「俺流で表示」で俺流に組み込める状態にします。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-48" placeholder="技の名前で絞り込み" value={filter.query} onChange={(e) => set({ query: e.target.value })} />
            <Select value={filter.command} items={COMMAND_LABELS} onValueChange={(v) => v !== null && set({ command: v })}>
              <SelectTrigger className="w-44" aria-label="入力で絞り込み">
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
            <Select value={filter.kind} items={SKILL_KIND_LABELS} onValueChange={(v) => v !== null && set({ kind: v as SkillKind })}>
              <SelectTrigger className="w-32" aria-label="技の種類で絞り込み">
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
            <label className="flex items-center gap-1.5">
              攻撃力
              <Input
                className="w-20"
                inputMode="numeric"
                placeholder="0"
                value={minAttackText}
                onChange={(e) => {
                  const t = e.target.value;
                  setMinAttackText(t);
                  const n = Number(t.normalize("NFKC").trim());
                  set({ minAttack: t.trim() === "" || !Number.isFinite(n) ? null : n });
                }}
                aria-label="攻撃力の下限"
              />
              以上
            </label>
            <Select value={filter.attr} items={ATTR_LABELS} onValueChange={(v) => v !== null && set({ attr: v })}>
              <SelectTrigger className="w-44" aria-label="効果で絞り込み">
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
            <Select value={sort} items={SKILL_SORT_LABELS} onValueChange={(v) => v !== null && setSort(v as SkillSort)}>
              <SelectTrigger className="w-48" aria-label="並べ替え">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilter(EMPTY_FILTER);
                setMinAttackText("");
              }}
            >
              条件を戻す
            </Button>
          </div>
          {message && <p className={message.error ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>{message.text}</p>}
        </CardContent>
      </Card>

      <Tabs defaultValue="0">
        <TabsList className="flex-wrap group-data-horizontal/tabs:h-auto">
          {STANCES.map((stance) => {
            const states = view.stanceStates[stance.id];
            const rows = rowsByStance[stance.id];
            return (
              <TabsTrigger key={stance.id} value={String(stance.id)} className="flex-none">
                {stance.nameJa}
                <span className="text-muted-foreground text-xs font-normal tabular-nums">
                  {rows.filter((r) => states[r.skill.skillNo] !== 0).length}/{rows.length}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {STANCES.map((stance) => (
          <TabsContent key={stance.id} value={String(stance.id)}>
            <StanceSkillTable
              stance={stance.id}
              rows={sortSkills(
                rowsByStance[stance.id].filter((r) => matchesSkillFilter(r.skill, filter)),
                sort,
                (r) => r.skill,
              )}
              states={view.stanceStates[stance.id]}
              readOnly={readOnly}
              advanced={advanced}
              run={run}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function StanceSkillTable({
  stance,
  rows,
  states,
  readOnly,
  advanced,
  run,
}: {
  stance: number;
  rows: Row[];
  states: readonly number[];
  readOnly: boolean;
  advanced: boolean;
  run: (label: string, f: (b: Uint8Array) => void) => void;
}) {
  const pending = rows.filter((r) => r.learnable && states[r.skill.skillNo] === 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={readOnly || pending.length === 0}
          onClick={() =>
            run(`${pending.length} 個の技を習得しました`, (b) => {
              for (const r of pending) learnStanceSkill(b, stance, r.skill.skillNo);
            })
          }
        >
          表示中の技を全部習得する
        </Button>
        <span className="text-muted-foreground text-xs">
          {rows.length} 件（未習得 {rows.filter((r) => states[r.skill.skillNo] === 0).length}）。段 5（極）や習得条件は見ずに書き込みます。
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">条件に合う技がありません。</p>
      ) : (
        <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_minmax(0,1fr)_auto] gap-x-3 text-sm">
          <div className="text-muted-foreground col-span-full grid grid-cols-subgrid border-b py-1 text-xs">
            <span>ID</span>
            <span>技</span>
            <span>状態</span>
            <span>入力</span>
            <span>攻撃力</span>
            <span>効果</span>
            <span>流派</span>
            <span />
          </div>
          {rows.map((r) => (
            <SkillRow key={r.skill.skillNo} row={r} stance={stance} state={states[r.skill.skillNo]} readOnly={readOnly} advanced={advanced} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkillRow({
  row,
  stance,
  state,
  readOnly,
  advanced,
  run,
}: {
  row: Row;
  stance: number;
  state: number;
  readOnly: boolean;
  advanced: boolean;
  run: (label: string, f: (b: Uint8Array) => void) => void;
}) {
  const s = row.skill;
  const prev = s.prev.map((p) => skillName(findStanceSkill(stance, p) ?? { nameJa: String(p) }));
  return (
    <div className="col-span-full grid min-h-9 grid-cols-subgrid items-center border-b py-1">
      <span className="text-muted-foreground font-mono text-xs tabular-nums">{s.skillId}</span>
      <span className="flex min-w-40 flex-col">
        <span>{skillName(s)}</span>
        {prev.length > 0 && <span className="text-muted-foreground text-xs">← {prev.join("・")} の次</span>}
      </span>
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
          (state === 0 || state === 3) && (
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
        {advanced && state !== 0 && (
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
