import { readFactions, readRouteJudge, factionRouteStatus } from "@/save/factions";
import { EVENTS_ANCHORS } from "./anchors";
import { FieldRow } from "@/components/field-row";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { CardContent } from "@/components/ui/card";
import { AnchoredSection } from "@/components/anchored-section";
import { AnchoredCard } from "@/components/anchored-card";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { formatWarnings } from "@/lib/format";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { FACTIONS, FACTION_ROWS, FACTION_VALUE_MAX, HOSTILE_ROW, HOSTILE_VALUES, ROUTE_JUDGE_OFFSET, ROUTE_JUDGE_VALUES, ROUTE_NONE_OFFSET, ROUTE_NONE_VALUES, ROUTE_THRESHOLD, factionOffset, validateFactionValue, writeFactionValue, writeRouteJudge, type FactionsView, type RouteJudgeView } from "@/save/factions";
import { parseCount } from "./scenario-input";

const hostileOptions: SelectOption[] = HOSTILE_VALUES.map((v) => ({
  value: String(v.value),
  label: v.label,
}));
const judgeOptions: SelectOption[] = ROUTE_JUDGE_VALUES.map((v) => ({
  value: String(v.value),
  label: v.label,
}));
const noneOptions: SelectOption[] = ROUTE_NONE_VALUES.map((v) => ({
  value: String(v.value),
  label: v.label,
}));

/** 剣術大会以後のルート分岐（0x3789〜0x378C）。view が null ならセーブ未読み込み */
function RouteJudgeRows({
  view,
  factions,
}: {
  view: RouteJudgeView | null;
  factions: FactionsView | null;
}) {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const problem = view?.problem ?? null;

  return (
    <AnchoredSection anchor={EVENTS_ANCHORS.factions.routeJudge} title="剣術大会以後のルート分岐" className="gap-2">
      <div className="grid gap-4 sm:grid-cols-4">
        {FACTIONS.map((faction, c) => {
          const status = factions && !factions.problem ? factionRouteStatus(factions, c) : null;
          return (
            <SelectRow
              key={faction}
              label={faction}
              offset={ROUTE_JUDGE_OFFSET + c}
              value={view ? String(view.judges[c]) : null}
              currentLabel={view ? "不明" : undefined}
              options={judgeOptions}
              problem={problem}
              hint={
                status
                  ? `今の記録なら大寄せで${status.eligible ? "入れる" : "入れない"}（友好度 ${status.friendly} − ${status.opposed} ＝ ${status.affinity}${status.moroDead ? "。茂呂が死亡" : ""}）`
                  : undefined
              }
              note={`大寄せのときに決まる。友好度（友好ポイント - 対立ポイント）が ${ROUTE_THRESHOLD} 以上で「ルートに入れる」、それ未満で「入れない」。敵対状態は関係しない。${c === 0 ? "幕府は茂呂が死亡していると友好度にかかわらず「入れない」。" : ""}大寄せのあと、ほかの勢力の剣術大会の誘いを引き受けると「入れない」、その勢力の人物に斬りかかっても「入れない」、最後通告に逆らうと3勢力とも「入れない」`}
              onChange={(v) => update((b) => writeRouteJudge(b, c, Number(v), { advanced }))}
            />
          );
        })}
        <SelectRow
          label="無所属"
          offset={ROUTE_NONE_OFFSET}
          value={view ? String(view.none) : null}
          currentLabel={view ? "不明" : undefined}
          options={noneOptions}
          problem={problem}
          warning={formatWarnings(view?.warnings)}
          note="大寄せで3勢力とも「入れない」のとき「根無し草」になる。勢力のどれかが「ルートに入れる」だと、ここが「根無し草」でも根無し草にはならない"
          onChange={(v) =>
            update((b) => writeRouteJudge(b, FACTIONS.length, Number(v), { advanced }))
          }
        />
      </div>
    </AnchoredSection>
  );
}

const readFactionViews = (b: Uint8Array) => ({ factions: readFactions(b), route: readRouteJudge(b) });

/** 勢力の 3×3 表（🔶 3勢力 × 3項目の並びは推定）。view が null ならセーブ未読み込み */
export function FactionCard() {
  const { view: data, error: readError } = useSaveView(readFactionViews);
  const view = data?.factions ?? null;
  const route = data?.route ?? null;
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const max = advanced ? FACTION_VALUE_MAX.system : FACTION_VALUE_MAX.normal;

  return (
    <AnchoredCard
      anchor={EVENTS_ANCHORS.factions.card}
      title="勢力の状態"
      description={
        <>
          幕府・外国・攘夷との友好・対立の記録を編集できます。どの勢力のルートに入れるかが変わります。
          <br />
          大寄せの時点で友好度が 3 以上の勢力のルートに入れます（幕府は茂呂が生きていることも条件）。
          {/* 友好度＝友好ポイント（協力・成功）− 対立ポイント（不利益・敵対行為） */}
        </>
      }
    >
      <CardContent className="flex flex-col gap-4">
        <PageBanner error={readError} />
        <RouteJudgeRows view={route} factions={view} />
        {FACTION_ROWS.map((row, r) => (
          <div key={row.label} className="flex flex-col gap-2">
            <p className="text-sm font-medium">{row.label}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {FACTIONS.map((faction, c) =>
                r === HOSTILE_ROW ? (
                  <SelectRow
                    key={faction}
                    label={faction}
                    offset={factionOffset(r, c)}
                    value={view ? String(view.values[r][c]) : null}
                    currentLabel={view ? "不明" : undefined}
                    options={hostileOptions}
                    problem={view?.problem ?? null}
                    note={row.note}
                    onChange={(v) =>
                      update((b) => writeFactionValue(b, r, c, Number(v), { advanced }))
                    }
                  />
                ) : (
                  <FieldRow
                    key={faction}
                    label={faction}
                    offset={factionOffset(r, c)}
                    value={view?.values[r][c] ?? null}
                    problem={view?.problem ?? null}
                    format={String}
                    parse={(input) =>
                      parseCount(input, (v) => validateFactionValue(v, { advanced }, r))
                    }
                    apply={(v) => update((b) => writeFactionValue(b, r, c, v, { advanced }))}
                    inputMode="numeric"
                    hint={`0〜${max}`}
                    note={row.note}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </AnchoredCard>
  );
}
