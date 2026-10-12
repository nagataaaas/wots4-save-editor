import { STYLES_ANCHORS } from "./anchors";
import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { InfoTip } from "@/components/info-tip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
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
  type SheetSkill,
  type SkillSheet,
} from "@/save/master/sect-data";
import {
  I16_MAX,
  LEARNED_COUNT_OFFSET,
  MASTERY_MAX,
  SKILL_POINTS_MAX,
  SKILL_POINTS_OFFSET,
  forgetSheetSkill,
  learnSectSkills,
  isUniqueSkill,
  learnSheetSkills,
  learnUniqueSkills,
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
import { STANCE_TAB_CLASS, errorMessage } from "./sect-format";
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
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const [query, setQuery] = useState("");
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>("owned");
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const result = useMemo((): { view: SectsView } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: readSects(save.working) };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  }, [save]);

  if (result && "error" in result) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込めません</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  // 未読み込みのときは view が null。流派の表から同じカードを描き、値を空・操作を無効にする
  const view = result?.view ?? null;
  const k = save?.loadId ?? 0;
  const owned = view ? ownedSectIds(view) : null;
  const sects = SECTS.filter((s) => !s.hidden || advanced)
    .filter((s) => matchesSearch(query, [s.nameJa, s.nameEn]))
    // 置き場所はセーブから決まるので、未読み込みのときは絞り込まない
    .filter((s) => !view || !owned || matchesPlace(placeFilter, view, owned, s.id))
    .filter((s) => !uniqueOnly || sectHasUniqueSkill(s));
  const readOnly = !view || view.problem !== null;

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
      {view?.problem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.problem}</AlertDescription>
        </Alert>
      )}

      <AnchoredCard anchor={STYLES_ANCHORS.overview}>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            流派
            {/* chunks/skill-states・styles・sect-scrolls */}
            <InfoTip offset="0x1417C〜0x1920D、0x48CC〜0x58BD" />
          </CardTitle>
          {/* 技の覚え状況の書き込みは ✅（ゲームで反映を確認済み）。腕前点・修練度・段・倒した数は 🟢（書き換えはゲーム内で未確認） */}
          <CardDescription>流派ごとに技を覚えた状態にできます。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid items-start gap-4 sm:grid-cols-3">
            <IntField
              label="腕前点"
              offset={SKILL_POINTS_OFFSET}
              value={view?.skillPoints ?? null}
              problem={view?.problem ? "検証に落ちています" : null}
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
            <Select
              value={placeFilter}
              items={PLACE_FILTER_LABELS}
              onValueChange={(v) => v !== null && setPlaceFilter(v as PlaceFilter)}
              disabled={!view}
            >
              <SelectTrigger className="w-36" aria-label="置き場所で絞り込み">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PLACE_FILTER_LABELS) as PlaceFilter[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {PLACE_FILTER_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="font-normal">
              <Checkbox checked={uniqueOnly} onCheckedChange={(on) => setUniqueOnly(on)} />
              固有技がある流派のみ
            </Label>
            <span className="text-muted-foreground text-xs">{sects.length} 件</span>
          </div>
          {message && <p className={message.error ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>{message.text}</p>}
        </CardContent>
      </AnchoredCard>

      {sects.map((sect) => (
        <SectCard
          key={`${k}-${sect.id}`}
          sect={sect}
          view={view}
          readOnly={readOnly}
          advanced={advanced}
          onLearnAll={() =>
            run(`${sect.nameJa} の技を習得しました`, (b) => learnSectSkills(b, sect.id))
          }
          onLearn={(sheet, skill) =>
            run("技を習得しました", (b) =>
              isUniqueSkill(skill) ? learnUniqueSkills(b, sheet, [skill.skillNo]) : learnSheetSkills(b, sheet, [skill.skillNo]),
            )
          }
          onShowInOreRyu={(sheet, no) => run("俺流に組み込めるようにしました", (b) => learnSheetSkills(b, sheet, [no]))}
          onForget={(sheet, no) => run("技を忘れさせました", (b) => forgetSheetSkill(b, sheet, no))}
          onValues={(v) => update((b) => writeSectValues(b, sect.id, v))}
        />
      ))}
      {sects.length === 0 && <p className="text-muted-foreground text-sm">条件に合う流派がありません。</p>}
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
  onShowInOreRyu,
  onForget,
  onValues,
}: {
  sect: Sect;
  /** null はセーブ未読み込み */
  view: SectsView | null;
  readOnly: boolean;
  advanced: boolean;
  onLearnAll: () => void;
  onLearn: (sheet: number, skill: SheetSkill) => void;
  onShowInOreRyu: (sheet: number, no: number) => void;
  onForget: (sheet: number, no: number) => void;
  onValues: (v: { mastery: number; rank: number; kills: number }) => void;
}) {
  const rec = view?.records.find((r) => r.id === sect.id) ?? null;
  const places = view ? placesOf(view, sect.id) : [];
  // 固有技は覚えられる流派でだけ出す（sectSheetSkills）。未読み込みのときは states が null
  const sheets = sect.sheets.map((id) => {
    const sheet = findSkillSheet(id)!;
    return { sheet: { ...sheet, skills: sectSheetSkills(sect, sheet) }, states: view ? sheetStates(view, id) : null };
  });
  const hasUnique = sheets.some((s) => s.sheet.skills.some(isUniqueSkill));
  const total = sheets.reduce((n, s) => n + s.sheet.skills.length, 0);
  const learned = view
    ? sheets.reduce((n, s) => n + s.sheet.skills.filter((x) => s.states?.[x.skillNo] !== 0).length, 0)
    : null;
  const valueProblem = !view ? null : readOnly ? "検証に落ちています" : rec ? null : "流派の表にこの流派がありません";
  const values = rec ? { mastery: rec.mastery, rank: rec.rank, kills: rec.kills } : null;

  return (
    <CollapsibleCard
      anchor={STYLES_ANCHORS.sect(sect.id)}
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
              {sect.sheets.map((id) => findStance(findSkillSheet(id)!.stance)?.nameJa).join("・")}
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
          <Button onClick={onLearnAll} disabled={readOnly || learned === total}>
            技を全部習得する
          </Button>
          <span className="text-muted-foreground text-xs">
            {/* 固有技の「習得する」は 🟢 要ゲーム内確認 */}
            段は「極」にはならないので、必要なら下の段を変更してください。
            固有技は「習得する」で習得済（俺流には未組み込み）、「俺流で表示」で俺流に組み込める状態にします。
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
            note={`しきい値：${sect.thresholds.join("・")}。修練度に合わせて段も上げます`}
            // 🟢 要ゲーム内確認
          />
          <RankField
            offset={rec?.offset ? rec.offset + 4 : 0}
            value={values?.rank ?? null}
            problem={valueProblem}
            apply={(r) => values && onValues({ ...values, rank: r })}
            // 🟢 要ゲーム内確認
          />
          <IntField
            label="この流派で倒した数"
            offset={rec?.offset ? rec.offset + 6 : 0}
            value={values?.kills ?? null}
            problem={valueProblem}
            min={0}
            max={I16_MAX}
            apply={(n) => values && onValues({ ...values, kills: n })}
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
                    {states ? sheet.skills.filter((x) => states[x.skillNo] !== 0).length : "—"}/{sheet.skills.length}
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
                      onLearn={onLearn}
                      onShowInOreRyu={onShowInOreRyu}
                      onForget={onForget}
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
  onLearn: (sheet: number, skill: SheetSkill) => void;
  onShowInOreRyu: (sheet: number, no: number) => void;
  onForget: (sheet: number, no: number) => void;
};

function SkillRow({
  sheet,
  states,
  readOnly,
  advanced,
  onLearn,
  onShowInOreRyu,
  onForget,
  ...ctx
}: SkillRowProps & SkillTreeRowContext) {
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
      <span className="flex justify-end gap-1">
        {/* 固有技は 0 →「習得する」（3）→「俺流で表示」（1）の 2 段階。ほかの技は 0・3 から「習得する」（1） */}
        {state === 3 && isUniqueSkill(s) ? (
          <Button size="sm" variant="outline" disabled={readOnly} onClick={() => onShowInOreRyu(sheet.id, s.skillNo)}>
            俺流で表示
          </Button>
        ) : (
          // 未読み込み（state が null）のときも、無効にした「習得する」を出す
          (state === null || state === 0 || state === 3) && (
            <Button size="sm" variant="outline" disabled={readOnly} onClick={() => onLearn(sheet.id, s)}>
              習得する
            </Button>
          )
        )}
        {advanced && state !== null && state !== 0 && (
          <Button size="sm" variant="ghost" disabled={readOnly} onClick={() => onForget(sheet.id, s.skillNo)}>
            忘れさせる
          </Button>
        )}
      </span>
    </div>
  );
}
