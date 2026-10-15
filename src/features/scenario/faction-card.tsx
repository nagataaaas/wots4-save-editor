import { tr } from "@/lib/i18n";
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

const toOptions = (values: readonly { value: number; label: string }[]): SelectOption[] =>
  values.map((v) => ({ value: String(v.value), label: v.label }));

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
  const unknown = tr({ ja: "不明", en: "Unknown" });

  return (
    <AnchoredSection
      anchor={EVENTS_ANCHORS.factions.routeJudge}
      title={tr({ ja: "剣術大会以後のルート分岐", en: "Route split after the Battle Tournament" })}
      className="gap-2"
    >
      <div className="grid gap-4 sm:grid-cols-4">
        {FACTIONS.map((faction, c) => {
          const status = factions && !factions.problem ? factionRouteStatus(factions, c) : null;
          return (
            <SelectRow
              key={c}
              label={faction}
              offset={ROUTE_JUDGE_OFFSET + c}
              value={view ? String(view.judges[c]) : null}
              currentLabel={view ? unknown : undefined}
              options={toOptions(ROUTE_JUDGE_VALUES)}
              problem={problem}
              hint={
                status
                  ? tr({
                      ja: `今の記録なら大寄せで${status.eligible ? "入れる" : "入れない"}（友好度 ${status.friendly} − ${status.opposed} ＝ ${status.affinity}${status.moroDead ? "。茂呂が死亡" : ""}）`,
                      en: `With the current records you ${status.eligible ? "can" : "can't"} enter at The Chief Minister's Big Move (friendship ${status.friendly} − ${status.opposed} = ${status.affinity}${status.moroDead ? "; Moro is dead" : ""})`,
                    })
                  : undefined
              }
              note={tr({
                ja: `大寄せのときに決まる。友好度（友好ポイント - 対立ポイント）が ${ROUTE_THRESHOLD} 以上で「ルートに入れる」、それ未満で「入れない」。敵対状態は関係しない。${c === 0 ? "幕府は茂呂が死亡していると友好度にかかわらず「入れない」。" : ""}大寄せのあと、ほかの勢力の剣術大会の誘いを引き受けると「入れない」、その勢力の人物に斬りかかっても「入れない」、最後通告に逆らうと3勢力とも「入れない」`,
                en: `Decided at The Chief Minister's Big Move. "Can enter the route" if friendship (friendship points − hostility points) is ${ROUTE_THRESHOLD} or more, otherwise "Can't enter". Hostility status doesn't matter. ${c === 0 ? "For the Shogunate, it's \"Can't enter\" whatever the friendship if Moro is dead. " : ""}After The Chief Minister's Big Move, it becomes "Can't enter" if you accept another faction's Battle Tournament invitation or attack this faction's people, and defying the Final Warning makes it "Can't enter" for all three factions`,
              })}
              onChange={(v) => update((b) => writeRouteJudge(b, c, Number(v), { advanced }))}
            />
          );
        })}
        <SelectRow
          label={tr({ ja: "無所属", en: "Independent" })}
          offset={ROUTE_NONE_OFFSET}
          value={view ? String(view.none) : null}
          currentLabel={view ? unknown : undefined}
          options={toOptions(ROUTE_NONE_VALUES)}
          problem={problem}
          warning={formatWarnings(view?.warnings)}
          note={tr({
            ja: "大寄せで3勢力とも「入れない」のとき「根無し草」になる。勢力のどれかが「ルートに入れる」だと、ここが「根無し草」でも根無し草にはならない",
            en: "Becomes \"Idle Chatter\" when all three factions are \"Can't enter\" at The Chief Minister's Big Move. If any faction is \"Can enter the route\", you won't get Idle Chatter even if this is set to \"Idle Chatter\"",
          })}
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
      title={tr({ ja: "勢力の状態", en: "Factions" })}
      description={
        <>
          {tr({
            ja: "幕府・外国・攘夷との友好・対立の記録を編集できます。どの勢力のルートに入れるかが変わります。",
            en: "Edit your friendship and hostility records with the Shogunate, the Foreigners and the Prajnas. This changes which faction routes you can enter.",
          })}
          <br />
          {tr({
            ja: "大寄せの時点で友好度が 3 以上の勢力のルートに入れます（幕府は茂呂が生きていることも条件）。",
            en: "At The Chief Minister's Big Move, you can enter the route of any faction with friendship of 3 or more (for the Shogunate, Moro must also be alive).",
          })}
          {/* 友好度＝友好ポイント（協力・成功）− 対立ポイント（不利益・敵対行為） */}
        </>
      }
    >
      <CardContent className="flex flex-col gap-4">
        <PageBanner error={readError} />
        <RouteJudgeRows view={route} factions={view} />
        {FACTION_ROWS.map((row, r) => (
          <div key={r} className="flex flex-col gap-2">
            <p className="text-sm font-medium">{row.label}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {FACTIONS.map((faction, c) =>
                r === HOSTILE_ROW ? (
                  <SelectRow
                    key={c}
                    label={faction}
                    offset={factionOffset(r, c)}
                    value={view ? String(view.values[r][c]) : null}
                    currentLabel={view ? tr({ ja: "不明", en: "Unknown" }) : undefined}
                    options={toOptions(HOSTILE_VALUES)}
                    problem={view?.problem ?? null}
                    note={row.note}
                    onChange={(v) =>
                      update((b) => writeFactionValue(b, r, c, Number(v), { advanced }))
                    }
                  />
                ) : (
                  <FieldRow
                    key={c}
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
