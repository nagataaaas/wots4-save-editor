import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { InfoTip } from "@/components/info-tip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import {
  RANK_LABELS,
  SECTS,
  SLOT_LABELS,
  findSect,
  findSkillSheet,
  findStance,
  sheetSkillTree,
  skillName,
  type Sect,
  type SkillSheet,
  type SkillTreeGroup,
  type SkillTreeNode,
} from "@/save/master/sect-data";
import {
  I16_MAX,
  LEARNED_COUNT_OFFSET,
  MASTERY_MAX,
  RANK_MAX,
  SKILL_POINTS_OFFSET,
  forgetSheetSkill,
  isSpecialCond,
  learnSectSkills,
  learnSheetSkills,
  ownedSectIds,
  rankForMastery,
  readSects,
  sheetStates,
  writeSectValues,
  type SectsView,
} from "@/save/sects";
import { errorMessage } from "./sect-format";
import { IntField, SkillMeta, StateBadge } from "./sect-ui";

/** その流派がどこにあるか（装備・持ち歩き・箪笥） */
function placesOf(view: SectsView, id: number): string[] {
  const places: string[] = [];
  const slot = view.equipped.indexOf(id);
  if (slot >= 0) places.push(`装備中（${SLOT_LABELS[slot]}）`);
  if (view.held.some((s) => s.sect?.id === id)) places.push("持ち歩き");
  if (view.stored.some((s) => s.sect?.id === id)) places.push("道場の箪笥");
  return places;
}

export function StylesPage() {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const [showAll, setShowAll] = useState(false);
  const [includeSpecial, setIncludeSpecial] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

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
  const k = save?.loadId ?? 0;
  const owned = ownedSectIds(view);
  const sects = SECTS.filter((s) => (showAll ? !s.hidden || advanced : owned.has(s.id)));
  const readOnly = view.problem !== null;

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
            流派
            <InfoTip offset="0x1417C〜0x1920D、0x48CC〜0x58BD">
              技の覚え状況・流派の表・流派の書（chunks/skill-states・styles・sect-scrolls）
            </InfoTip>
          </CardTitle>
          <CardDescription>
            流派ごとに技を覚えた状態にできます（ゲームで反映を確認済み）。修練度・段・倒した数の書き換えはゲーム内で未確認です（🟢）。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>
              習得技数：{view.learnedCount}
              <InfoTip offset={LEARNED_COUNT_OFFSET}>戦闘中に閃いて覚えた数。ここでの書き換えでは増やしません</InfoTip>
            </span>
            <span>
              腕前点：{view.skillPoints}
              <InfoTip offset={SKILL_POINTS_OFFSET}>俺流を作るとき、選んだ技の腕前点の合計がこれ以下である必要があります</InfoTip>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {view.equipped.map((id, s) => (
              <Badge key={s} variant="outline" className="font-normal">
                {SLOT_LABELS[s]}：{findSect(id)?.nameJa ?? `俺流など（${id}）`}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <Switch checked={showAll} onCheckedChange={setShowAll} aria-label="すべての流派を表示" />
              <Label>持っていない流派も表示する</Label>
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={includeSpecial} onCheckedChange={setIncludeSpecial} aria-label="特別な技も覚えさせる" />
              <Label>
                特別な技も覚えさせる
                <InfoTip>
                  「今 装備している武器で100人惨殺する」などで覚える技（秘伝黒生・くるひかぶきなど）。覚えさせた状態は 1（俺流に組み込める）にします（🟢）
                </InfoTip>
              </Label>
            </label>
          </div>
          {message && <p className={message.error ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>{message.text}</p>}
        </CardContent>
      </Card>

      {sects.map((sect) => (
        <SectCard
          key={`${k}-${sect.id}`}
          sect={sect}
          view={view}
          readOnly={readOnly}
          advanced={advanced}
          onLearnAll={() =>
            run(`${sect.nameJa} の技を覚えさせました`, (b) => learnSectSkills(b, sect.id, { includeSpecial }))
          }
          onLearn={(sheet, no) => run("技を覚えさせました", (b) => learnSheetSkills(b, sheet, [no], { includeSpecial: true }))}
          onForget={(sheet, no) => run("技を忘れさせました", (b) => forgetSheetSkill(b, sheet, no))}
          onValues={(v) => update((b) => writeSectValues(b, sect.id, v))}
        />
      ))}
      {sects.length === 0 && <p className="text-muted-foreground text-sm">持っている流派がありません。</p>}
    </div>
  );
}

function SectCard({
  sect,
  view,
  readOnly,
  advanced,
  onLearnAll,
  onLearn,
  onForget,
  onValues,
}: {
  sect: Sect;
  view: SectsView;
  readOnly: boolean;
  advanced: boolean;
  onLearnAll: () => void;
  onLearn: (sheet: number, no: number) => void;
  onForget: (sheet: number, no: number) => void;
  onValues: (v: { mastery: number; rank: number; kills: number }) => void;
}) {
  const rec = view.records.find((r) => r.id === sect.id) ?? null;
  const places = placesOf(view, sect.id);
  const sheets = sect.sheets.map((id) => ({ sheet: findSkillSheet(id)!, states: sheetStates(view, id) }));
  const total = sheets.reduce((n, s) => n + s.sheet.skills.length, 0);
  const learned = sheets.reduce((n, s) => n + s.sheet.skills.filter((x) => s.states[x.skillNo] !== 0).length, 0);
  const valueProblem = readOnly ? "検証に落ちています" : rec ? null : "流派の表にこの流派がありません";
  const values = rec ? { mastery: rec.mastery, rank: rec.rank, kills: rec.kills } : null;

  return (
    <CollapsibleCard
      title={
        <span className="flex flex-wrap items-center gap-2">
          {sect.nameJa}
          <span className="text-muted-foreground text-xs font-normal">
            {sect.sheets.map((id) => findStance(findSkillSheet(id)!.stance)?.nameJa).join("・")}
            ／{rec ? `${RANK_LABELS[rec.rank] ?? rec.rank}・修練度 ${rec.mastery}` : "—"}／技 {learned}/{total}
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
          <Button onClick={onLearnAll} disabled={readOnly || learned === total}>
            技を全部覚えさせる
          </Button>
          <span className="text-muted-foreground text-xs">
            派生先を覚えた技は「派生先あり」（2）になります。段 5（極）にはならないので、必要なら下の段を 5 にしてください。
            続けて出す技は字下げして並べます（前の技が複数ある技は、それぞれの下に出します）。上位技（⇧）は元の技と左の帯でまとめます。
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <IntField
            label="修練度"
            offset={rec?.offset ? rec.offset + 2 : 0}
            value={values?.mastery ?? null}
            problem={valueProblem}
            min={0}
            max={MASTERY_MAX}
            apply={(m) => values && onValues({ ...values, mastery: m, rank: Math.max(values.rank, rankForMastery(sect, m)) })}
            note={`しきい値：${sect.thresholds.join("・")}。修練度に合わせて段も上げます（🟢 要ゲーム内確認）`}
          />
          <IntField
            label="段（0 初段〜4 伍段、5 極）"
            offset={rec?.offset ? rec.offset + 4 : 0}
            value={values?.rank ?? null}
            problem={valueProblem}
            min={0}
            max={RANK_MAX}
            apply={(r) => values && onValues({ ...values, rank: r })}
            note="🟢 要ゲーム内確認"
          />
          <IntField
            label="この流派で倒した数"
            offset={rec?.offset ? rec.offset + 6 : 0}
            value={values?.kills ?? null}
            problem={valueProblem}
            min={0}
            max={I16_MAX}
            apply={(n) => values && onValues({ ...values, kills: n })}
            note="🟢 要ゲーム内確認"
          />
        </div>

        {sheets.map(({ sheet, states }) => (
          <div key={sheet.id} className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">
              {findStance(sheet.stance)?.nameJa}の技（技の表 {sheet.id}）
            </h3>
            <div className="text-sm">
              {sheetSkillTree(sheet).map((g) => (
                <SkillGroupView
                  key={g.key}
                  group={g}
                  depth={0}
                  sheet={sheet}
                  states={states}
                  readOnly={readOnly}
                  advanced={advanced}
                  onLearn={onLearn}
                  onForget={onForget}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}

type SkillRowProps = {
  depth: number;
  sheet: SkillSheet;
  states: readonly number[];
  readOnly: boolean;
  advanced: boolean;
  onLearn: (sheet: number, no: number) => void;
  onForget: (sheet: number, no: number) => void;
};

/** 字下げ 1 段の幅（rem） */
const INDENT_REM = 1.25;

/**
 * 元の技と上位技のまとまり。上位技があるときは、続けて出す技も含めて左の帯でつなぐ。
 * 字下げは続けて出す技だけに使う。
 */
function SkillGroupView({ group, ...props }: SkillRowProps & { group: SkillTreeGroup }) {
  const grouped = group.members.length > 1;
  return (
    <div className="relative">
      {grouped && (
        <span
          aria-hidden
          className="bg-primary/30 absolute inset-y-1 w-0.5 rounded"
          style={{ left: `${props.depth * INDENT_REM}rem` }}
        />
      )}
      {group.members.map((node, i) => (
        <div key={node.key}>
          <SkillRow node={node} first={i === 0} grouped={grouped} {...props} />
          {node.next.map((g) => (
            <SkillGroupView key={g.key} group={g} {...props} depth={props.depth + 1} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkillRow({
  node,
  first,
  grouped,
  depth,
  sheet,
  states,
  readOnly,
  advanced,
  onLearn,
  onForget,
}: SkillRowProps & { node: SkillTreeNode; first: boolean; grouped: boolean }) {
  const s = node.skill;
  const state = states[s.skillNo];
  const upgradeOf = node.upgradeOf === null ? null : sheet.skills.find((x) => x.skillNo === node.upgradeOf);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b py-1">
      <span className="flex min-w-44 flex-col" style={{ paddingLeft: `${depth * INDENT_REM + (grouped ? 0.625 : 0)}rem` }}>
        <span>
          {depth > 0 && first && <span className="text-muted-foreground mr-1">└</span>}
          {skillName(s)}
        </span>
        {upgradeOf && <span className="text-muted-foreground text-xs">⇧ {skillName(upgradeOf)}の上位</span>}
      </span>
      <StateBadge state={state} />
      <SkillMeta skillId={s.skillId} />
      {isSpecialCond(s.cond) && (
        <Badge variant="outline" className="font-normal">
          斬殺数で覚える技
        </Badge>
      )}
      <span className="text-muted-foreground flex-1 text-xs">
        {s.rank >= 0 ? `${RANK_LABELS[s.rank]}以上` : ""}
        {s.condJa ? `：${s.condJa}` : s.cond === 0 ? "：流派を装備すると覚える" : ""}
      </span>
      {(state === 0 || state === 3) && (
        <Button size="sm" variant="outline" disabled={readOnly} onClick={() => onLearn(sheet.id, s.skillNo)}>
          覚えさせる
        </Button>
      )}
      {advanced && state !== 0 && (
        <Button size="sm" variant="ghost" disabled={readOnly} onClick={() => onForget(sheet.id, s.skillNo)}>
          忘れさせる
        </Button>
      )}
    </div>
  );
}
