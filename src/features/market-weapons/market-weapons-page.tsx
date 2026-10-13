import type { ReactNode } from "react";
import { InfoTip } from "@/components/info-tip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnchorLink, ToggleChevron } from "@/components/anchor-link";
import { ScopeAnchorLink } from "@/components/anchor-link";
import { AnchoredCard } from "@/components/anchored-card";
import { MARKET_ANCHORS } from "./anchors";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WeaponPanel } from "@/features/belt/belt-page";
import { useAnchoredOpen } from "@/lib/navigation-context";
import { useSearchBox } from "@/lib/search-hooks";
import { useSaveView } from "@/lib/use-save-view";
import { PageBanner } from "@/components/page-banner";
import {
  MARKET_ELAPSED,
  MARKET_HOLDER,
  MARKET_OTHERS,
  MARKET_WEAPON_OFFSET,
  MARKET_WEAPON_SLOTS,
  readMarket,
  refineChance,
  vanishChance,
  type MarketOtherSummary,
  type MarketWeaponEntry,
} from "@/save/market-weapons";

/** 🟢 武器種ごとの行き先（刀は刀泥棒、槍は槍泥棒、ほかは落し物屋） */
function destination(type: number): string {
  if (type === 0) return "刀泥棒が持つ";
  if (type === 1) return "槍泥棒が持つ";
  return "落し物屋に並ぶ";
}

/** 流通中の武器・道具・部品（🟢）。読み取り専用 */
export function MarketWeaponsPage() {
  const { view, error: readError, problem } = useSaveView(readMarket, { problem: (v) => v.problem });

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      <AnchoredCard anchor={MARKET_ANCHORS.summary} searchLabel="流通">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <ScopeAnchorLink />
            流通
            <InfoTip offset={MARKET_WEAPON_OFFSET} />
            {/* 武器は 0xA4 B × MARKET_WEAPON_SLOTS 件（武器レコード＋持っている町の人の番号）。続けて道具・刃・鍔・柄の記録 */}
            <Badge variant="outline" className="font-normal">読み取り専用</Badge>
          </CardTitle>
          {/* 🟢 周回の終わりの変化と確率。確率はゲーム内では未確認（要ゲーム内確認） */}
          <CardDescription>
            主人公が死んだときに、町の人に持ち去られた帯刀・道具・部品の一覧です。
            <br />
            周回をまたいで残り、古い武器は消えたり、精錬されたり、銘が付いたりします。
            {/* 周回の終わりごとに古くなる。道具・部品は消えない */}
          </CardDescription>
        </CardHeader>
      </AnchoredCard>

      {view ? (
        <>
          <Group anchor={MARKET_ANCHORS.weapons} title="武器" filled={view.weapons.length} slots={MARKET_WEAPON_SLOTS} offset={MARKET_WEAPON_OFFSET}>
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
          <Group anchor={MARKET_ANCHORS.weapons} title="武器" filled={null} slots={MARKET_WEAPON_SLOTS} offset={MARKET_WEAPON_OFFSET} />
          {MARKET_OTHERS.map((o) => (
            <Group key={o.key} anchor={o.key} title={o.label} filled={null} slots={o.slots} offset={o.offset} />
          ))}
        </>
      )}
    </div>
  );
}

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
  const { id, open, setOpen } = useAnchoredOpen(anchor);
  useSearchBox(id, title);
  return (
    <Card id={id} className="scroll-mt-4 py-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2 px-6 py-4">
          <ToggleChevron open={open} onToggle={() => setOpen(!open)} />
          <AnchorLink id={id} />
          <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-left font-medium">
            {title}
            <span className="text-muted-foreground text-sm font-normal">
              {filled ?? "—"} / {slots}
            </span>
          </CollapsibleTrigger>
          <InfoTip offset={offset} />
        </div>
        <CollapsibleContent>
          <CardContent className="flex flex-col gap-4 pb-6">
            {filled === null ? (
              <p className="text-muted-foreground text-sm">—</p>
            ) : filled === 0 ? (
              <p className="text-muted-foreground text-sm">ありません。</p>
            ) : (
              children
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function MarketWeaponItem({ entry }: { entry: MarketWeaponEntry }) {
  const { weapon, elapsed, holder } = entry;
  const type = weapon.weaponType.value;
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {entry.index + 1}件目
        <InfoTip offset={entry.offset} />
        <Badge variant="secondary" className="font-normal">
          {weapon.weaponType.label ?? "武器種不明"}・{destination(type)}
        </Badge>
      </div>
      <WeaponPanel weapon={weapon} />
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">流通に入ってから</dt>
          <dd>{elapsed} 周</dd>
          <InfoTip offset={entry.offset + MARKET_ELAPSED} />
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">持っている町の人</dt>
          <dd>{holder === null ? "なし" : "いる"}</dd>
          <InfoTip offset={entry.offset + MARKET_HOLDER} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <dt className="text-muted-foreground">次の周回の終わり</dt>
          <dd>
            消える {vanishChance(elapsed)}%・精錬 {refineChance(elapsed)}%・銘 50%
          </dd>
        </div>
      </dl>
      {weapon.problem && (
        <p className="text-xs text-amber-600 dark:text-amber-400">レコードの確認：{weapon.problem}</p>
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
            <th className="py-1 pr-3 font-normal">件目</th>
            <th className="py-1 pr-3 font-normal">名前</th>
            {isItem && <th className="py-1 pr-3 font-normal">個数</th>}
            <th className="py-1 pr-3 font-normal">流通に入ってから</th>
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
                {e.label ?? <span className="text-amber-600 dark:text-amber-400">表にない</span>}
              </td>
              {isItem && <td className="py-1 pr-3">{e.count}</td>}
              <td className="py-1 pr-3">{e.elapsed} 周</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
