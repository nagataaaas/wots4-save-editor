import type { ReactNode } from "react";
import { InfoTip } from "@/components/info-tip";
import { Badge } from "@/components/ui/badge";
import { AnchoredCard } from "@/components/anchored-card";
import { CollapsibleCard } from "@/components/collapsible-card";
import { MARKET_ANCHORS } from "./anchors";
import { WeaponPanel } from "@/features/weapon/weapon-panel";
import { useSaveView } from "@/lib/use-save-view";
import { PageBanner } from "@/components/page-banner";
import { tr, type Localized } from "@/lib/i18n";
import {
  MARKET_ELAPSED,
  MARKET_HOLDER,
  MARKET_OTHERS,
  MARKET_WEAPON_OFFSET,
  MARKET_WEAPON_SLOTS,
  MEI_CHANCE,
  marketDestination,
  readMarket,
  refineChance,
  vanishChance,
  type MarketDestination,
  type MarketOtherSummary,
  type MarketWeaponEntry,
} from "@/save/market-weapons";

/** 🟢 武器種ごとの行き先（marketDestination） */
const DESTINATION_LABELS: Record<MarketDestination, Localized> = {
  swordThief: { ja: "刀泥棒が持つ", en: "Held by the Katana Thief" },
  spearThief: { ja: "槍泥棒が持つ", en: "Held by the Lance Thief" },
  lostAndFound: { ja: "落し物屋に並ぶ", en: "Sold at Lost & Found" },
};

/** 流通中の武器・道具・部品（🟢）。読み取り専用 */
export function MarketWeaponsPage() {
  const { view, error: readError, problem } = useSaveView(readMarket);

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      {/* 武器は 0xA4 B × MARKET_WEAPON_SLOTS 件（武器レコード＋持っている町の人の番号）。続けて道具・刃・鍔・柄の記録。
          🟢 周回の終わりの変化と確率。確率はゲーム内では未確認（要ゲーム内確認）。周回の終わりごとに古くなる。道具・部品は消えない */}
      <AnchoredCard
        anchor={MARKET_ANCHORS.summary}
        title={tr({ ja: "流通", en: "Reclamation" })}
        extra={
          <>
            <InfoTip offset={MARKET_WEAPON_OFFSET} />
            <Badge variant="outline" className="font-normal">{tr({ ja: "読み取り専用", en: "Read-only" })}</Badge>
          </>
        }
        description={
          <>
            {tr({
              ja: "主人公が死んだときに、町の人に持ち去られた帯刀・道具・部品の一覧です。",
              en: "Equipped weapons, items and parts that townsfolk took when the hero died.",
            })}
            <br />
            {tr({
              ja: "周回をまたいで残り、古い武器は消えたり、精錬されたり、銘が付いたりします。",
              en: "They carry over between playthroughs; older weapons may disappear, be refined or gain a signature.",
            })}
          </>
        }
      />

      {view ? (
        <>
          <Group anchor={MARKET_ANCHORS.weapons} title={WEAPONS_TITLE()} filled={view.weapons.length} slots={MARKET_WEAPON_SLOTS} offset={MARKET_WEAPON_OFFSET}>
            {view.weapons.map((entry) => (
              <MarketWeaponItem key={entry.index} entry={entry} />
            ))}
          </Group>
          {view.others.map((o) => (
            <Group key={o.key} anchor={o.key} title={o.label} filled={o.filled} slots={o.slots} offset={o.offset}>
              <OtherTable summary={o} />
            </Group>
          ))}
        </>
      ) : (
        // 未読み込みのときはグループの枠だけを描き、件数と中身を「—」にする
        <>
          <Group anchor={MARKET_ANCHORS.weapons} title={WEAPONS_TITLE()} filled={null} slots={MARKET_WEAPON_SLOTS} offset={MARKET_WEAPON_OFFSET} />
          {MARKET_OTHERS.map((o) => (
            <Group key={o.key} anchor={o.key} title={tr(o.label)} filled={null} slots={o.slots} offset={o.offset} />
          ))}
        </>
      )}
    </div>
  );
}

const WEAPONS_TITLE = () => tr({ ja: "武器", en: "Weapons" });
const SINCE_LABEL = () => tr({ ja: "流通に入ってから", en: "Time in reclamation" });

/** 周回の数（「3 周」） */
const cycles = (n: number) => tr({ ja: `${n} 周`, en: n === 1 ? "1 playthrough" : `${n} playthroughs` });

/** 1つのグループ（武器・道具・刃・鍔・柄）。はじめは閉じておく。anchor はリンク先にするときの名前（useAnchoredOpen） */
function Group({
  anchor,
  title,
  filled,
  slots,
  offset,
  children,
}: {
  anchor: string;
  title: string;
  /** null はセーブ未読み込み */
  filled: number | null;
  slots: number;
  offset: number;
  children?: ReactNode;
}) {
  return (
    <CollapsibleCard
      anchor={anchor}
      searchLabel={title}
      title={
        <>
          {title}
          <span className="text-muted-foreground text-sm font-normal">
            {filled ?? "—"} / {slots}
          </span>
        </>
      }
      extra={<InfoTip offset={offset} />}
      contentClassName="flex flex-col gap-4"
    >
      {filled === null ? (
        <p className="text-muted-foreground text-sm">—</p>
      ) : filled === 0 ? (
        <p className="text-muted-foreground text-sm">{tr({ ja: "ありません。", en: "None." })}</p>
      ) : (
        children
      )}
    </CollapsibleCard>
  );
}

function MarketWeaponItem({ entry }: { entry: MarketWeaponEntry }) {
  const { weapon, elapsed, holder } = entry;
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {tr({ ja: `${entry.index + 1}件目`, en: `No. ${entry.index + 1}` })}
        <InfoTip offset={entry.offset} />
        <Badge variant="secondary" className="font-normal">
          {weapon.weaponType.label ?? tr({ ja: "武器種不明", en: "Unknown weapon type" })}
          {tr({ ja: "・", en: " · " })}
          {tr(DESTINATION_LABELS[marketDestination(weapon.weaponType.value)])}
        </Badge>
      </div>
      <WeaponPanel weapon={weapon} />
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">{SINCE_LABEL()}</dt>
          <dd>{cycles(elapsed)}</dd>
          <InfoTip offset={entry.offset + MARKET_ELAPSED} />
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">{tr({ ja: "持っている町の人", en: "Held by a townsperson" })}</dt>
          <dd>{holder === null ? tr({ ja: "なし", en: "No" }) : tr({ ja: "いる", en: "Yes" })}</dd>
          <InfoTip offset={entry.offset + MARKET_HOLDER} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <dt className="text-muted-foreground">{tr({ ja: "次の周回の終わり", en: "At the end of the next playthrough" })}</dt>
          <dd>
            {tr({
              ja: `消える ${vanishChance(elapsed)}%・精錬 ${refineChance(elapsed)}%・銘 ${MEI_CHANCE}%`,
              en: `Disappears ${vanishChance(elapsed)}% · Refined ${refineChance(elapsed)}% · Signature ${MEI_CHANCE}%`,
            })}
          </dd>
        </div>
      </dl>
      {weapon.problem && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {tr({ ja: `レコードの確認：${weapon.problem}`, en: `Record check: ${weapon.problem}` })}
        </p>
      )}
    </div>
  );
}

/** 道具・刃・鍔・柄の一覧（表） */
function OtherTable({ summary }: { summary: MarketOtherSummary }) {
  const isItem = summary.key === "item";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground text-left text-xs">
          <tr className="border-b">
            <th className="py-1 pr-3 font-normal">{tr({ ja: "件目", en: "No." })}</th>
            <th className="py-1 pr-3 font-normal">{tr({ ja: "名前", en: "Name" })}</th>
            {isItem && <th className="py-1 pr-3 font-normal">{tr({ ja: "個数", en: "Qty" })}</th>}
            <th className="py-1 pr-3 font-normal">{SINCE_LABEL()}</th>
          </tr>
        </thead>
        <tbody>
          {summary.entries.map((e) => (
            <tr key={e.index} className="border-b last:border-b-0">
              <td className="flex items-center gap-1 py-1 pr-3">
                {e.index + 1}
                <InfoTip offset={e.offset} />
              </td>
              <td className="py-1 pr-3">
                {e.label ?? (
                  <span className="text-amber-600 dark:text-amber-400">{tr({ ja: "表にない", en: "Not in list" })}</span>
                )}
              </td>
              {isItem && <td className="py-1 pr-3">{e.count}</td>}
              <td className="py-1 pr-3">{cycles(e.elapsed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
