import { ORE_RYU_ANCHORS } from "./anchors";
import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FieldRow } from "@/components/field-row";
import { InfoTip } from "@/components/info-tip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import {
  CUSTOM_COUNT_OFFSET,
  CUSTOM_SHEET_COUNT_OFFSET,
  NAME_MAX,
  NAME_MAX_ADVANCED,
  addCustomStance,
  createCustomStyle,
  customSkillLabel,
  deleteCustomStyle,
  readCustomStyles,
  removeCustomStance,
  validateCustomName,
  validateSkillSelection,
  writeCustomName,
  writeCustomSheetSkills,
  writeCustomValues,
  type CustomSheet,
  type CustomStyle,
  type CustomStylesView,
} from "@/save/custom-style";
import { RANK_LABELS, SLOT_LABELS, STANCES, findStance, findStanceSkill } from "@/save/master/sect-data";
import { I16_MAX, MASTERY_MAX } from "@/save/sects";
import { errorMessage } from "./sect-format";
import { IntField, RankField, SkillPicker } from "./sect-ui";

type Message = { error: boolean; text: string } | null;

const isFirstSkill = (stance: number, no: number) => findStanceSkill(stance, no)?.first ?? false;

export function OreRyuPage() {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const [message, setMessage] = useState<Message>(null);

  const result = useMemo((): { view: CustomStylesView } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: readCustomStyles(save.working) };
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

  // 未読み込みのときは view が null。俺流の一覧は空、作る欄は無効にして描く
  const view = result?.view ?? null;
  const k = save?.loadId ?? 0;
  const readOnly = !view || view.problem !== null;
  /** 成功したら true */
  const run = (label: string, f: (b: Uint8Array) => void): boolean => {
    try {
      update(f);
      setMessage({ error: false, text: label });
      return true;
    } catch (e) {
      setMessage({ error: true, text: errorMessage(e) });
      return false;
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
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            俺流
            {/* 並びは 🟢。🔶 書き換えたセーブをゲームで読めるかは要ゲーム内確認 */}
            {/* chunks/custom-style・belt-copy（俺流の技の表）・sect-scrolls */}
            <InfoTip offset={`0x${CUSTOM_COUNT_OFFSET.toString(16).toUpperCase()}、0x${CUSTOM_SHEET_COUNT_OFFSET.toString(16).toUpperCase()}`} />
          </CardTitle>
          <CardDescription>
            俺流の名前・修練度・技の構成を書き換えたり、新しく作ったりできます。
            <br />
            書き換える前に、必ず元のセーブをバックアップしてください。
            {/* 技は構えの技の表から選ぶ（通常モードでは覚えていて俺流に入れられる技だけ、上級者モードでは構えの全部の技） */}
          </CardDescription>
        </CardHeader>
        {message && (
          <CardContent>
            <p className={message.error ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>{message.text}</p>
          </CardContent>
        )}
      </Card>

      {view?.styles.map((style) => (
        <StyleCard key={`${k}-${style.id}`} style={style} view={view} readOnly={readOnly} advanced={advanced} run={run} update={update} />
      ))}

      <CreateCard key={`create-${k}`} view={view} readOnly={readOnly} advanced={advanced} run={run} />
    </div>
  );
}

const KIND_LABELS: Record<CustomStyle["kind"], string> = {
  player: "主人公の俺流",
  "live-proof": "生きた証の人物の流派の写し",
  other: "不明な俺流",
};

function StyleCard({
  style,
  view,
  readOnly,
  advanced,
  run,
  update,
}: {
  style: CustomStyle;
  view: CustomStylesView;
  readOnly: boolean;
  advanced: boolean;
  run: (label: string, f: (b: Uint8Array) => void) => boolean;
  update: (f: (b: Uint8Array) => void) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addStance, setAddStance] = useState<string>("");
  // 生きた証の写しはその人物が町に出るたびに作り直されるので、上級者モードでだけ書き換える 🔶
  const locked = readOnly || (style.kind !== "player" && !advanced);
  const lockReason = readOnly ? "検証に落ちています" : locked ? "生きた証の写しは上級者モードでだけ書き換えられます（その人物が町に出るたびに作り直されます）" : null;
  const sheets = style.sheetIds.filter((id) => id >= 0).map((id) => view.sheets.find((s) => s.id === id)!);
  const firstStance = sheets[0] ? findStance(sheets[0].stance) : undefined;
  const addable = STANCES.filter((s) => s.slot === firstStance?.slot && !sheets.some((x) => x.stance === s.id));
  const values = { mastery: style.mastery, rank: style.rank, kills: style.kills };

  return (
    <CollapsibleCard
      anchor={ORE_RYU_ANCHORS.style(style.id)}
      defaultOpen={style.kind === "player"}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {style.name || "（名前なし）"}
          <span className="text-muted-foreground text-xs font-normal">
            {sheets.map((s) => findStance(s.stance)?.nameJa).join("・")}／{RANK_LABELS[style.rank] ?? "不明"}・修練度 {style.mastery}
          </span>
        </span>
      }
      extra={
        <>
          <Badge variant="outline" className="font-normal">
            {KIND_LABELS[style.kind]}
          </Badge>
          {style.equipped && (
            <Badge variant="outline" className="font-normal">
              装備中（{SLOT_LABELS[firstStance?.slot ?? 0]}）
            </Badge>
          )}
          {style.scroll && (
            <Badge variant="outline" className="font-normal">
              {style.scroll.place === "held" ? "持ち歩き" : "道場の箪笥"}
            </Badge>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FieldRow
            label="名前"
            offset={style.offset + 8}
            value={style.name}
            problem={lockReason}
            format={(s) => s}
            parse={(s) => {
              const p = validateCustomName(s, { advanced });
              return p ? { ok: false, error: p } : { ok: true, value: s };
            }}
            apply={(s) => update((b) => writeCustomName(b, style.id, s, { advanced }))}
            hint={`${advanced ? NAME_MAX_ADVANCED : NAME_MAX} 文字まで`}
            note="ゲームの入力は 10 文字まで。流派の書にある名前の写し（先頭 10 文字）も書き換えます"
          />
          <IntField
            label="修練度"
            offset={style.offset + 2}
            value={values.mastery}
            problem={lockReason}
            min={0}
            max={MASTERY_MAX}
            apply={(m) => update((b) => writeCustomValues(b, style.id, { ...values, mastery: m }))}
          />
          <RankField
            offset={style.offset + 4}
            value={values.rank}
            problem={lockReason}
            apply={(r) => update((b) => writeCustomValues(b, style.id, { ...values, rank: r }))}
            note="俺流は段のしきい値が 0 なので、修練度が増えるとすぐ伍段になります"
          />
          <IntField
            label="この流派で倒した数"
            offset={style.offset + 6}
            value={values.kills}
            problem={lockReason}
            min={0}
            max={I16_MAX}
            apply={(n) => update((b) => writeCustomValues(b, style.id, { ...values, kills: n }))}
          />
        </div>

        {sheets.map((sheet) => (
          <SheetEditor
            key={sheet.id}
            sheet={sheet}
            view={view}
            locked={locked}
            advanced={advanced}
            canRemove={sheets.length > 1}
            onSave={(nos) => run(`${findStance(sheet.stance)?.nameJa}の技を書き換えました`, (b) => writeCustomSheetSkills(b, sheet.id, nos, { advanced }))}
            onRemove={() => run("構えを外しました", (b) => removeCustomStance(b, style.id, sheet.id))}
          />
        ))}

        {sheets.length < 3 && addable.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>構えを足す（同じ構えの組だけ、3 つまで）</Label>
              <Select
                value={addStance}
                items={addable.map((s) => ({ value: String(s.id), label: s.nameJa }))}
                onValueChange={(v) => v !== null && setAddStance(v)}
                disabled={locked}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="構え" />
                </SelectTrigger>
                <SelectContent>
                  {addable.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nameJa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              disabled={locked || addStance === ""}
              onClick={() => {
                const stance = Number(addStance);
                // 足した直後は、その構えで入れられる初段の技だけを入れておく（あとで選び直す）
                const firsts = view.sects.stanceStates[stance]
                  .map((v, no) => ({ v, no }))
                  .filter(({ v, no }) => (advanced || v === 1 || v === 2) && isFirstSkill(stance, no))
                  .map(({ no }) => no);
                run(`${findStance(stance)?.nameJa}を足しました`, (b) => addCustomStance(b, style.id, stance, firsts, { advanced }));
              }}
            >
              足す
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {!confirmDelete ? (
            <Button variant="outline" disabled={readOnly || style.equipped || (style.kind !== "player" && !advanced)} onClick={() => setConfirmDelete(true)}>
              この俺流を消す
            </Button>
          ) : (
            <>
              <Button variant="destructive" onClick={() => run("俺流を消しました", (b) => deleteCustomStyle(b, style.id, { advanced }))}>
                本当に消す
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                やめる
              </Button>
            </>
          )}
          <span className="text-muted-foreground text-xs">
            ゲームで捨てたときと同じく、俺流・技の表・流派の書を消します。装備中は消せません。
          </span>
        </div>
      </div>
    </CollapsibleCard>
  );
}

function SheetEditor({
  sheet,
  view,
  locked,
  advanced,
  canRemove,
  onSave,
  onRemove,
}: {
  sheet: CustomSheet;
  view: CustomStylesView;
  locked: boolean;
  advanced: boolean;
  canRemove: boolean;
  onSave: (nos: number[]) => boolean;
  onRemove: () => void;
}) {
  const current = useMemo(() => new Set(sheet.skills.map((s) => s.skillNo)), [sheet]);
  const [draft, setDraft] = useState<Set<number>>(current);
  const dirty = draft.size !== current.size || [...draft].some((n) => !current.has(n));
  const problem = validateSkillSelection(view, sheet.stance, [...draft], { advanced });

  return (
    <div className="flex flex-col gap-2 rounded border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">
          {findStance(sheet.stance)?.nameJa}の技（{sheet.skills.length} 個）
        </h3>
        {canRemove && (
          <Button size="sm" variant="ghost" disabled={locked} onClick={onRemove}>
            この構えを外す
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        今の技：{sheet.skills.map((s) => customSkillLabel(sheet.stance, s.skillNo)).join("・") || "なし"}
      </p>
      <SkillPicker
        stance={sheet.stance}
        selected={draft}
        onChange={setDraft}
        stanceStates={view.sects.stanceStates[sheet.stance]}
        advanced={advanced}
        disabled={locked}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={locked || !dirty || problem !== null} onClick={() => onSave([...draft])}>
          この技で書き換える
        </Button>
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(current)}>
          元に戻す
        </Button>
        {dirty && problem && <span className="text-destructive text-xs">{problem}</span>}
      </div>
    </div>
  );
}

function CreateCard({
  view,
  readOnly,
  advanced,
  run,
}: {
  /** null はセーブ未読み込み */
  view: CustomStylesView | null;
  readOnly: boolean;
  advanced: boolean;
  run: (label: string, f: (b: Uint8Array) => void) => boolean;
}) {
  const [name, setName] = useState("My流");
  const [stance, setStance] = useState("0");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const s = Number(stance);
  const nameProblem = validateCustomName(name, { advanced });
  const skillProblem = view ? validateSkillSelection(view, s, [...selected], { advanced }) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          俺流を新しく作る
          {/* 🔶 要ゲーム内確認 */}
        </CardTitle>
        <CardDescription>
          白紙目録なしで新しい俺流を作り、流派の書を持ち物（いっぱいなら道場の箪笥）に入れます。
          <br />
          装備はゲーム内の流派の切り替えで行ってください。
          {/* ゲームと同じ手順で書く */}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ore-ryu-new-name">名前</Label>
            <Input id="ore-ryu-new-name" className="w-56" value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>構え</Label>
            <Select
              value={stance}
              items={STANCES.map((x) => ({ value: String(x.id), label: x.nameJa }))}
              onValueChange={(v) => {
                if (v === null) return;
                setStance(v);
                setSelected(new Set());
              }}
              disabled={readOnly}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STANCES.map((x) => (
                  <SelectItem key={x.id} value={String(x.id)}>
                    {x.nameJa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SkillPicker
          stance={s}
          selected={selected}
          onChange={setSelected}
          stanceStates={view ? view.sects.stanceStates[s] : null}
          advanced={advanced}
          disabled={readOnly}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={readOnly || nameProblem !== null || skillProblem !== null}
            onClick={() => {
              if (run(`俺流「${name}」を作りました`, (b) => createCustomStyle(b, { name, stance: s, skillNos: [...selected] }, { advanced }))) {
                setSelected(new Set());
              }
            }}
          >
            作る
          </Button>
          {(nameProblem ?? skillProblem) && <span className="text-destructive text-xs">{nameProblem ?? skillProblem}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
