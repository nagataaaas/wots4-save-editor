import { useMemo, useState } from "react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { ItemSlotRow } from "@/components/item-slot-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  // ❓ U-14：一覧にない ID を書ける上級者モード。明示的に有効にしたときだけ使える
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
    <div className="flex max-w-3xl flex-col gap-4">
      {!view && (
        <Alert>
          <AlertTitle>セーブファイルが読み込まれていません</AlertTitle>
          <AlertDescription>
            サイドバーの「ファイルを開く」から読み込むと、下の項目を編集できます。
          </AlertDescription>
        </Alert>
      )}

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

      <Card>
        <CardHeader>
          <CardTitle>重要品</CardTitle>
          <CardDescription>
            {formatOffset(VALUABLES_OFFSET)} から 8 B × {VALUABLE_SLOT_COUNT}
            件。各枠の地金と個数を設定できます。
            チップ・木札は、Steam版で書き込むとゲーム内でセーブできなくなったため選択肢に出しません（❓
            U-12）。
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
                onChange={(id, count) =>
                  update((b) => writeValuable(b, i, id, count, { investigate }))
                }
              />
            );
          })}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        各枠の +0x00〜+0x03（ID・個数）だけを書き換えます。+0x04〜+0x07
        は用途不明（❓）のため変えません。 個数の上限 {VALUABLE_COUNT_MAX} は推測（🔶
        §4）で、ゲーム内の上限は未確認です。
      </p>
    </div>
  );
}

/** ❓ U-14：ID調査モードの切り替えと、空き枠への候補 ID の一括入力 */
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex flex-wrap items-center gap-2">
            ID調査モード
            <CertaintyBadge mark="❓" text="U-14" />
          </CardTitle>
          <Switch checked={enabled} onCheckedChange={onToggle} aria-label="ID調査モード" />
        </div>
        <CardDescription>
          謎の鍵・拷問部屋の鍵・会談の手紙の ID を探すための上級者モードです。一覧にない ID
          を16進で直接書けます。 ID
          が不正だとゲーム内でセーブできなくなることがあるので（U-12）、必ず samples/
          のコピーで試してください。
        </CardDescription>
      </CardHeader>
      {enabled && (
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>開始 ID</Label>
              <Select value={start} onValueChange={setStart} disabled={disabled}>
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
          <p className="text-muted-foreground text-xs">
            「なし」の枠に、開始 ID から順に候補（🔶 0xD7〜0xFF、続いて 0x9F〜0xBF の残り）を個数 1
            で入れます。既に入っている枠は変えません。
            ゲームでロードして重要品の一覧に出た名前を確かめ、ID と名前の対応を教えてください。
          </p>
        </CardContent>
      )}
    </Card>
  );
}
