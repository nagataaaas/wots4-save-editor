import { useMemo, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import { ItemSlotRow } from "@/components/item-slot-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScopeAnchorLink } from "@/components/anchor-link";
import { AnchoredCard } from "@/components/anchored-card";
import { ITEM_ANCHORS } from "@/features/tools/anchors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatHex4, formatOffset } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import {
  PROBE_CANDIDATES,
  VALUABLES,
  VALUABLE_COUNT_MAX,
  VALUABLE_SLOT_BYTES,
  VALUABLE_SLOT_COUNT,
  VALUABLES_OFFSET,
  fillEmptySlotsWithProbes,
  readValuables,
  slotOffset,
  writeValuable,
  type ValuablesView,
} from "@/save/valuables";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

const VALUABLE_GROUPS = [{ items: VALUABLES }];

export function ValuablesPage() {
  const { save, update } = useSave();
  // 一覧にない ID を書ける上級者モード（U-14 の調査用に作った）。明示的に有効にしたときだけ使える
  const [investigate, setInvestigate] = useState(false);

  const result = useMemo((): { view: ValuablesView } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: readValuables(save.working, { investigate }) };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  }, [save, investigate]);

  if (result && "error" in result) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込めません</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  const view = result?.view ?? null;
  const k = save?.loadId ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {view?.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.layoutProblem}</AlertDescription>
        </Alert>
      )}

      <ProbeCard
        key={k}
        enabled={investigate}
        onToggle={setInvestigate}
        disabled={!view || view.layoutProblem !== null}
        onFill={(start) => {
          let filled: number[] = [];
          update((b) => {
            filled = fillEmptySlotsWithProbes(b, start);
          });
          return filled;
        }}
      />

      <AnchoredCard anchor={ITEM_ANCHORS.items} searchLabel="重要品">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <ScopeAnchorLink />
            重要品
            {/* チップ・木札は ❓ U-12 */}
            <InfoTip offset={`${formatOffset(VALUABLES_OFFSET)}〜${formatOffset(VALUABLES_OFFSET + VALUABLE_SLOT_BYTES * VALUABLE_SLOT_COUNT - 1)}`}>
              チップ・木札は、Steam版で書き込むとゲーム内でセーブできなくなったため選択肢に出しません
            </InfoTip>
          </CardTitle>
          {/* 拷問部屋の鍵・謎の鍵の ID は 🟢。ゲーム内での表示と使用は未確認（U-14） */}
          <CardDescription>
            各枠の重要品（地金・会談の手紙・鍵）と個数を設定できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {Array.from({ length: VALUABLE_SLOT_COUNT }, (_, i) => {
            const slot = view?.slots[i] ?? null;
            return (
              <ItemSlotRow
                // 読み込み直しと ID の変更で、入力途中の値を捨てる
                key={`${k}-${i}-${slot?.id ?? ""}`}
                index={i}
                offset={slotOffset(i)}
                slot={slot}
                groups={VALUABLE_GROUPS}
                noun="重要品"
                investigate={investigate}
                // 🔶 個数の上限は推測（chunks/items）。既存の検証と同じ上限を右側に表示する。
                countMaxFor={() => VALUABLE_COUNT_MAX}
                onChange={(id, count) =>
                  update((b) => writeValuable(b, i, id, count, { investigate }))
                }
              />
            );
          })}
        </CardContent>
      </AnchoredCard>

      {/* 各枠の +0x00〜+0x03（ID・個数）だけを書き換える。❓ +0x04〜+0x07 の用途は不明なので変えない。
          🔶 個数の上限は推測（chunks/items）で、ゲーム内の上限は未確認 */}
      <p className="text-muted-foreground text-xs">
        個数の上限 {VALUABLE_COUNT_MAX} はエディタの目安です。
      </p>
    </div>
  );
}

/** ID調査モードの切り替えと、空き枠への候補 ID の一括入力（U-14 の調査用に作った） */
function ProbeCard({
  enabled,
  onToggle,
  disabled,
  onFill,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled: boolean;
  onFill: (start: number) => number[];
}) {
  const [start, setStart] = useState(String(PROBE_CANDIDATES[0]));
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  function fill() {
    try {
      const filled = onFill(Number(start));
      if (filled.length === 0) {
        setMessage({ error: true, text: "入れられる空き枠か候補 ID がありません" });
        return;
      }
      setMessage({ error: false, text: `入れた ID：${filled.map(formatHex4).join(", ")}` });
      // 次の回は続きから
      const next = PROBE_CANDIDATES[PROBE_CANDIDATES.indexOf(filled[filled.length - 1]) + 1];
      if (next !== undefined) setStart(String(next));
    } catch (e) {
      setMessage({ error: true, text: errorMessage(e) });
    }
  }

  return (
    <AnchoredCard anchor={ITEM_ANCHORS.probe} searchLabel="ID調査モード">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <ScopeAnchorLink />
            ID調査モード
            <Badge variant="outline" className="font-normal">上級者向け</Badge>
          </CardTitle>
          <Switch checked={enabled} onCheckedChange={onToggle} aria-label="ID調査モード" />
        </div>
        {/* 不正な ID でセーブできなくなる例は U-12 */}
        <CardDescription>
          一覧にない重要品を書き込んで、ゲーム内でどう見えるかを調べる上級者向けの機能です。
          <br />
          ゲーム内でセーブできなくなることがあるので、必ずセーブのコピーで試してください。
        </CardDescription>
      </CardHeader>
      {enabled && (
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>開始 ID</Label>
              <Select
                value={start}
                items={PROBE_CANDIDATES.map((id) => ({ value: String(id), label: formatHex4(id) }))}
                onValueChange={(v) => v !== null && setStart(v)}
                disabled={disabled}
              >
                <SelectTrigger className="w-32 font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROBE_CANDIDATES.map((id) => (
                    <SelectItem key={id} value={String(id)} className="font-mono">
                      {formatHex4(id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fill} disabled={disabled}>
              空き枠に候補 ID を入れる
            </Button>
          </div>
          {message && (
            <p
              className={
                message.error ? "text-destructive text-xs" : "text-muted-foreground text-xs"
              }
            >
              {message.text}
            </p>
          )}
          {/* 🔶 候補の範囲：0xD7〜0xFF、続いて 0x9F〜0xBF の残り */}
          <p className="text-muted-foreground text-xs">
            「なし」の枠に、開始 ID から順に候補の ID を個数 1
            で入れます。既に入っている枠は変えません。
            ゲームでロードして重要品の一覧に出た名前を確かめ、ID と名前の対応を教えてください。
          </p>
        </CardContent>
      )}
    </AnchoredCard>
  );
}
