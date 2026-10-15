import { ORE_RYU_ANCHORS } from "./anchors";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/action-button";
import { CollapsibleCard } from "@/components/collapsible-card";
import { FieldRow } from "@/components/field-row";
import { InfoTip } from "@/components/info-tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { FilterSelect } from "@/components/filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { useSave } from "@/lib/save-context";
import { formatOffset } from "@/lib/format";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { WriteResult } from "@/components/write-error";
import { SearchField } from "@/lib/search-context";
import {
  CUSTOM_COUNT_OFFSET,
  customNameOffset,
  CUSTOM_SHEET_COUNT_OFFSET,
  CUSTOM_STANCE_MAX,
  NAME_MAX,
  NAME_MAX_ADVANCED,
  addCustomStance,
  createCustomStyle,
  customSkillLabel,
  deleteCustomStyle,
  initialStanceSkills,
  readCustomStyles,
  removeCustomStance,
  styleSheets,
  validateCustomName,
  validateSkillSelection,
  writeCustomName,
  writeCustomSheetSkills,
  writeCustomValues,
  type CustomSheet,
  type CustomStyle,
  type CustomStylesView,
} from "@/save/custom-style";
import { tr, type Localized } from "@/lib/i18n";
import { STANCES, findStance, rankLabel, slotLabel, stanceName, stanceNameById } from "@/save/master/sect-data";
import { I16_MAX, MASTERY_MAX, sectValueOffset } from "@/save/sect-record";
import { readOnlyReason } from "./sect-format";
import { IntField, RankField, SkillPicker } from "./sect-ui";

export function OreRyuPage() {
  const { save } = useSave();
  const { advanced } = useAdvancedMode();
  const { view, error: readError, problem, readOnly } = useSaveView(readCustomStyles);

  // 未読み込みのときは view が null。俺流の一覧は空、作る欄は無効にして描く
  const k = save?.loadId ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />
      {/* 並びは 🟢。🔶 書き換えたセーブをゲームで読めるかは要ゲーム内確認 */}
      <AnchoredCard
        anchor={ORE_RYU_ANCHORS.overview}
        title={tr({ ja: "俺流", en: "My Style" })}
        // chunks/custom-style・belt-copy（俺流の技の表）・sect-scrolls
        extra={<InfoTip offset={`${formatOffset(CUSTOM_COUNT_OFFSET)}、${formatOffset(CUSTOM_SHEET_COUNT_OFFSET)}`} />}
        description={
          <>
            {tr({
              ja: "俺流の名前・修練度・技の構成を書き換えたり、新しく作ったりできます。",
              en: "Change the name, mastery and moves of your My Styles, or create new ones.",
            })}
            <br />
            {tr({ ja: "書き換える前に、必ず元のセーブをバックアップしてください。", en: "Always back up the original save before making changes." })}
            {/* 技は構えの技の表から選ぶ（通常モードでは覚えていて俺流に入れられる技だけ、上級者モードでは構えの全部の技） */}
          </>
        }
      />

      {view?.styles.map((style) => (
        <StyleCard key={`${k}-${style.id}`} style={style} view={view} readOnly={readOnly} advanced={advanced} />
      ))}

      <CreateCard key={`create-${k}`} view={view} readOnly={readOnly} advanced={advanced} />
    </div>
  );
}

const KIND_LABELS: Record<CustomStyle["kind"], Localized> = {
  player: { ja: "主人公の俺流", en: "Your My Style" },
  "live-proof": { ja: "生きた証の人物の流派の写し", en: "Copy of a past hero's style" },
  other: { ja: "不明な俺流", en: "Unknown My Style" },
};

const noName = () => tr({ ja: "（名前なし）", en: "(No name)" });

function StyleCard({
  style,
  view,
  readOnly,
  advanced,
}: {
  style: CustomStyle;
  view: CustomStylesView;
  readOnly: boolean;
  advanced: boolean;
}) {
  const { write: update, tryWrite, message } = useWrite();
  const [addStance, setAddStance] = useState<string>("");
  // 生きた証の写しはその人物が町に出るたびに作り直されるので、上級者モードでだけ書き換える 🔶
  const locked = readOnly || (style.kind !== "player" && !advanced);
  const lockReason = readOnly
    ? readOnlyReason()
    : locked
      ? tr({
          ja: "生きた証の写しは上級者モードでだけ書き換えられます（その人物が町に出るたびに作り直されます）",
          en: "Copies of past heroes' styles can be changed only in Advanced mode (they are recreated each time that person appears in town)",
        })
      : null;
  const sheets = styleSheets(view, style);
  const firstStance = sheets[0] ? findStance(sheets[0].stance) : undefined;
  const addable = STANCES.filter((s) => s.slot === firstStance?.slot && !sheets.some((x) => x.stance === s.id));
  const values = { mastery: style.mastery, rank: style.rank, kills: style.kills };

  return (
    <CollapsibleCard
      anchor={ORE_RYU_ANCHORS.style(style.id)}
      defaultOpen={style.kind === "player"}
      searchLabel={style.name || noName()}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {style.name || noName()}
          <span className="text-muted-foreground text-xs font-normal">
            {(() => {
              const stances = sheets.map((s) => stanceNameById(s.stance)).join(tr({ ja: "・", en: ", " }));
              const rank = rankLabel(style.rank) ?? tr({ ja: "不明", en: "Unknown" });
              return tr({
                ja: `${stances}／${rank}・修練度 ${style.mastery}`,
                en: `${stances} / ${rank} · Mastery ${style.mastery}`,
              });
            })()}
          </span>
        </span>
      }
      extra={
        <>
          <Badge variant="outline" className="font-normal">
            {tr(KIND_LABELS[style.kind])}
          </Badge>
          {style.equipped && (
            <Badge variant="outline" className="font-normal">
              {tr({ ja: `装備中（${slotLabel(firstStance?.slot ?? 0)}）`, en: `Equipped (${slotLabel(firstStance?.slot ?? 0)})` })}
            </Badge>
          )}
          {style.scroll && (
            <Badge variant="outline" className="font-normal">
              {style.scroll.place === "held"
                ? tr({ ja: "持ち歩き", en: "Style Library" })
                : tr({ ja: "道場の箪笥", en: "Dojo shelf" })}
            </Badge>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FieldRow
            label={tr({ ja: "名前", en: "Name" })}
            offset={customNameOffset(style.offset)}
            value={style.name}
            problem={lockReason}
            format={(s) => s}
            parse={(s) => {
              const p = validateCustomName(s, { advanced });
              return p ? { ok: false, error: p } : { ok: true, value: s };
            }}
            apply={(s) => update((b) => writeCustomName(b, style.id, s, { advanced }))}
            hint={tr({
              ja: `${advanced ? NAME_MAX_ADVANCED : NAME_MAX} 文字まで`,
              en: `Up to ${advanced ? NAME_MAX_ADVANCED : NAME_MAX} characters`,
            })}
            note={tr({
              ja: "ゲームの入力は 10 文字まで。流派の書にある名前の写し（先頭 10 文字）も書き換えます",
              en: "The game allows up to 10 characters. Also updates the copy of the name in the style book (first 10 characters)",
            })}
          />
          <IntField
            label={tr({ ja: "修練度", en: "Mastery" })}
            offset={sectValueOffset(style.offset, 'mastery')}
            value={values.mastery}
            problem={lockReason}
            min={0}
            max={MASTERY_MAX}
            apply={(m) => update((b) => writeCustomValues(b, style.id, { ...values, mastery: m }))}
          />
          <RankField
            offset={sectValueOffset(style.offset, 'rank')}
            value={values.rank}
            problem={lockReason}
            apply={(r) => update((b) => writeCustomValues(b, style.id, { ...values, rank: r }))}
            note={tr({
              ja: "俺流は段のしきい値が 0 なので、修練度が増えるとすぐ伍段になります",
              en: "My Style has rank thresholds of 0, so it reaches Fifth as soon as mastery increases",
            })}
          />
          <IntField
            label={tr({ ja: "この流派で倒した数", en: "Kills with this style" })}
            offset={sectValueOffset(style.offset, 'kills')}
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
            onSave={(nos) => {
              const stance = stanceNameById(sheet.stance);
              return tryWrite(
                (b) => writeCustomSheetSkills(b, sheet.id, nos, { advanced }),
                tr({ ja: `${stance}の技を書き換えました`, en: `Updated the ${stance} moves` }),
              ).ok;
            }}
            onRemove={() =>
              tryWrite((b) => removeCustomStance(b, style.id, sheet.id), tr({ ja: "構えを外しました", en: "Removed the stance" }))
            }
          />
        ))}

        {sheets.length < CUSTOM_STANCE_MAX && addable.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>
                {tr({
                  ja: `構えを足す（同じ構えの組だけ、${CUSTOM_STANCE_MAX} つまで）`,
                  en: `Add a stance (same weapon type only, up to ${CUSTOM_STANCE_MAX})`,
                })}
              </Label>
              <FilterSelect
                options={addable.map((s) => ({ value: String(s.id), label: stanceName(s) }))}
                value={addStance === "" ? null : addStance}
                onChange={setAddStance}
                disabled={locked}
                className="w-40"
                placeholder={tr({ ja: "構え", en: "Stance" })}
              />
            </div>
            <Button
              variant="outline"
              disabled={locked || addStance === ""}
              onClick={() => {
                const stance = Number(addStance);
                // 足した直後は、その構えで入れられる初段の技だけを入れておく（あとで選び直す）
                const firsts = initialStanceSkills(view.sects.stanceStates[stance], stance, { advanced });
                const added = stanceNameById(stance);
                tryWrite(
                  (b) => addCustomStance(b, style.id, stance, firsts, { advanced }),
                  tr({ ja: `${added}を足しました`, en: `Added ${added}` }),
                );
              }}
            >
              {tr({ ja: "足す", en: "Add" })}
            </Button>
          </div>
        )}

        <WriteResult message={message} />

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {/* 消すとこのカードごとなくなるので、成功の文は出さない */}
          <ActionButton
            disabled={readOnly || style.equipped || (style.kind !== "player" && !advanced)}
            label={tr({ ja: "この俺流を消す", en: "Delete this My Style" })}
            confirm="inline"
            confirmLabel={tr({ ja: "本当に消す", en: "Really delete" })}
            onAction={() => update((b) => deleteCustomStyle(b, style.id, { advanced }))}
          />
          <span className="text-muted-foreground text-xs">
            {tr({
              ja: "ゲームで捨てたときと同じく、俺流・技の表・流派の書を消します。装備中は消せません。",
              en: "As when discarded in the game, this deletes the My Style, its move lists and its style book. A style in use cannot be deleted.",
            })}
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
          {tr({
            ja: `${stanceNameById(sheet.stance)}の技（${sheet.skills.length} 個）`,
            en: `${stanceNameById(sheet.stance)} moves (${sheet.skills.length})`,
          })}
        </h3>
        {canRemove && (
          <Button size="sm" variant="ghost" disabled={locked} onClick={onRemove}>
            {tr({ ja: "この構えを外す", en: "Remove this stance" })}
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {tr({ ja: "今の技：", en: "Current moves: " })}
        {sheet.skills.map((s) => customSkillLabel(sheet.stance, s.skillNo)).join(tr({ ja: "・", en: ", " })) ||
          tr({ ja: "なし", en: "None" })}
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
          {tr({ ja: "この技で書き換える", en: "Write these moves" })}
        </Button>
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(current)}>
          {tr({ ja: "元に戻す", en: "Revert" })}
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
}: {
  /** null はセーブ未読み込み */
  view: CustomStylesView | null;
  readOnly: boolean;
  advanced: boolean;
}) {
  const { tryWrite, message } = useWrite();
  // 名前の初期値（10 文字以内）。言語を変えると画面ごと描き直すので、そのときの言語で決める
  const [name, setName] = useState(() => tr({ ja: "My流", en: "My Style" }));
  const [stance, setStance] = useState("0");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const s = Number(stance);
  const nameProblem = validateCustomName(name, { advanced });
  const skillProblem = view ? validateSkillSelection(view, s, [...selected], { advanced }) : null;

  return (
    // 🔶 要ゲーム内確認。ゲームと同じ手順で書く
    <AnchoredCard
      anchor={ORE_RYU_ANCHORS.create}
      title={tr({ ja: "俺流を新しく作る", en: "Create a new My Style" })}
      description={
        <>
          {tr({
            ja: "白紙目録なしで新しい俺流を作り、流派の書を持ち物（いっぱいなら道場の箪笥）に入れます。",
            en: "Creates a new My Style without a Blank Book, and puts its style book in your Style Library (or on the dojo shelf if full).",
          })}
          <br />
          {tr({ ja: "装備はゲーム内の流派の切り替えで行ってください。", en: "Equip it by switching styles in the game." })}
        </>
      }
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <SearchField label={tr({ ja: "名前", en: "Name" })} className="flex flex-col gap-1.5">
            <Label htmlFor="ore-ryu-new-name">{tr({ ja: "名前", en: "Name" })}</Label>
            <Input id="ore-ryu-new-name" className="w-56" value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
          </SearchField>
          <SearchField label={tr({ ja: "構え", en: "Stance" })} className="flex flex-col gap-1.5">
            <Label>{tr({ ja: "構え", en: "Stance" })}</Label>
            <FilterSelect
              options={STANCES.map((x) => ({ value: String(x.id), label: stanceName(x) }))}
              value={stance}
              onChange={(value) => {
                setStance(value);
                setSelected(new Set());
              }}
              disabled={readOnly}
              className="w-40"
            />
          </SearchField>
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
              const created = tr({ ja: `俺流「${name}」を作りました`, en: `Created the My Style "${name}"` });
              if (tryWrite((b) => createCustomStyle(b, { name, stance: s, skillNos: [...selected] }, { advanced }), created).ok) {
                setSelected(new Set());
              }
            }}
          >
            {tr({ ja: "作る", en: "Create" })}
          </Button>
          {(nameProblem ?? skillProblem) && <span className="text-destructive text-xs">{nameProblem ?? skillProblem}</span>}
        </div>
        <WriteResult message={message} />
      </CardContent>
    </AnchoredCard>
  );
}
