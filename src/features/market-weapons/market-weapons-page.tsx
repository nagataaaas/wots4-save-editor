import { useMemo, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WeaponPanel } from "@/features/belt/belt-page";
import { formatHex4, formatOffset } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import {
  MARKET_ELAPSED,
  MARKET_HOLDER,
  MARKET_WEAPON_OFFSET,
  MARKET_WEAPON_SLOTS,
  readMarket,
  refineChance,
  vanishChance,
  type MarketOtherSummary,
  type MarketView,
  type MarketWeaponEntry,
} from "@/save/market-weapons";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 🟢 武器種ごとの行き先（刀は刀泥棒、槍は槍泥棒、ほかは落し物屋） */
function destination(type: number): string {
  if (type === 0) return "刀泥棒が持つ";
  if (type === 1) return "槍泥棒が持つ";
  return "落し物屋に並ぶ";
}

const hexBytes = (b: Uint8Array) => [...b].map((v) => v.toString(16).toUpperCase().padStart(2, "0")).join(" ");

/** 流通中の武器・道具・部品（🟢）。読み取り専用 */
export function MarketWeaponsPage() {
  const { save } = useSave();

  const result = useMemo((): { view: MarketView } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: readMarket(save.working) };
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

  const view = result?.view ?? null;

  return (
    <div className="flex flex-col gap-4">
      {!view && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>サイドバーの「ファイルを開く」から読み込むと、流通中の武器・道具・部品を表示します。</AlertDescription>
        </Alert>
      )}

      {view?.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>位置がずれている可能性があります</AlertTitle>
          <AlertDescription>{view.layoutProblem}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            流通
            <InfoTip offset={`${formatOffset(MARKET_WEAPON_OFFSET)}〜`}>
              武器は 0xA4 B × {MARKET_WEAPON_SLOTS} 件（武器レコード＋持っている町の人の番号）。続けて道具・刃・鍔・柄の記録があります。
            </InfoTip>
            <Badge variant="outline" className="font-normal">読み取り専用</Badge>
          </CardTitle>
          <CardDescription>
            主人公が死んだときに町の人に持ち去られた帯刀・道具・部品です。周回をまたいで残り、周回の終わりごとに古くなります。
            古い武器は消えたり、精錬されたり、銘が付いたりします（道具・部品は消えません）。確率はゲーム内では未確認です（要ゲーム内確認）。
          </CardDescription>
        </CardHeader>
      </Card>

      {view && (
        <>
          <Group title="武器" filled={view.weapons.length} slots={MARKET_WEAPON_SLOTS} offset={MARKET_WEAPON_OFFSET}>
            {view.weapons.map((entry) => (
              <MarketWeaponItem key={entry.index} entry={entry} />
            ))}
          </Group>
          {view.others.map((o) => (
            <Group key={o.key} title={o.label} filled={o.filled} slots={o.slots} offset={o.offset}>
              <OtherTable summary={o} />
            </Group>
          ))}
        </>
      )}
    </div>
  );
}

/** 1つのグループ（武器・道具・刃・鍔・柄）。はじめは閉じておく */
function Group({
  title,
  filled,
  slots,
  offset,
  children,
}: {
  title: string;
  filled: number;
  slots: number;
  offset: number;
  children: ReactNode;
}) {
  return (
    <Card className="py-0">
      <Collapsible>
        <div className="flex items-center gap-2 px-6 py-4">
          <CollapsibleTrigger className="group flex flex-1 items-center gap-2 text-left font-medium">
            <ChevronRight className="size-4 shrink-0 transition-transform group-data-panel-open:rotate-90" aria-hidden />
            {title}
            <span className="text-muted-foreground text-sm font-normal">
              {filled} / {slots}
            </span>
          </CollapsibleTrigger>
          <InfoTip offset={offset} />
        </div>
        <CollapsibleContent>
          <CardContent className="flex flex-col gap-4 pb-6">
            {filled === 0 ? <p className="text-muted-foreground text-sm">ありません。</p> : children}
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
          {weapon.weaponType.label ?? `武器種 ${type}`}・{destination(type)}
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
          <dd>{holder === null ? "なし" : `番号 ${holder}`}</dd>
          <InfoTip offset={entry.offset + MARKET_HOLDER}>場面を読み込むたびに選び直されます。</InfoTip>
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
            <th className="py-1 pr-3 font-normal">位置</th>
            <th className="py-1 pr-3 font-normal">名前</th>
            {isItem && <th className="py-1 pr-3 font-normal">個数</th>}
            <th className="py-1 pr-3 font-normal">流通に入ってから</th>
            <th className="py-1 font-normal">残りのバイト（❓）</th>
          </tr>
        </thead>
        <tbody>
          {summary.entries.map((e) => (
            <tr key={e.index} className="border-b last:border-b-0">
              <td className="py-1 pr-3">{e.index + 1}</td>
              <td className="py-1 pr-3 font-mono text-xs">{formatOffset(e.offset)}</td>
              <td className="py-1 pr-3">
                {e.label ?? <span className="text-amber-600 dark:text-amber-400">表にない ID</span>}
                <span className="text-muted-foreground ml-2 font-mono text-xs">{formatHex4(e.id)}</span>
              </td>
              {isItem && <td className="py-1 pr-3">{e.count}</td>}
              <td className="py-1 pr-3">{e.elapsed} 周</td>
              <td className="text-muted-foreground py-1 font-mono text-xs">{hexBytes(e.rest)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
