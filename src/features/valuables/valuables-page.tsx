import { useMemo, useState } from "react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  EMPTY_ID,
  PROBE_CANDIDATES,
  VALUABLES,
  VALUABLE_COUNT_MAX,
  VALUABLE_SLOT_COUNT,
  VALUABLES_OFFSET,
  TS_EDITED_SLOTS,
  fillEmptySlotsWithProbes,
  readValuables,
  slotOffset,
  validateValuableCount,
  writeValuable,
  type ValuableSlot,
  type ValuablesView,
} from "@/save/valuables";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** ID を 16進4桁（0x なし）で表示する */
const hexId = (id: number) => id.toString(16).toUpperCase().padStart(4, "0");

function parseHexId(input: string): number | null {
  const t = input.trim().replace(/^0x/i, "");
  return /^[0-9a-f]{1,4}$/i.test(t) ? parseInt(t, 16) : null;
}

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
              <SlotRow
                // 読み込み直しと ID の変更で、入力途中の値を捨てる
                key={`${k}-${i}-${slot?.id ?? ""}`}
                index={i}
                slot={slot}
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

/** slot が null のときはセーブ未読み込み。入力欄を無効にして表示する */
function SlotRow({
  index,
  slot,
  investigate,
  onChange,
}: {
  index: number;
  slot: ValuableSlot | null;
  investigate: boolean;
  onChange: (id: number, count: number) => void;
}) {
  const [draft, setDraft] = useState(() =>
    slot && slot.id !== EMPTY_ID ? String(slot.count) : "",
  );
  const [idDraft, setIdDraft] = useState(() => (slot ? hexId(slot.id) : ""));
  const [error, setError] = useState<string | null>(null);

  const offset = slotOffset(index);
  const readOnly = slot === null || slot.problem !== null;
  const isEmpty = slot?.id === EMPTY_ID;
  // 現在の ID が不正（U-12・未知）なら、ID の変更だけを許し、個数は変えられない
  const countLocked = slot === null || slot.problem !== null || isEmpty || !slot.idWritable;
  const isKnown = slot !== null && (isEmpty || VALUABLES.some((v) => v.id === slot.id));

  function run(action: () => void) {
    setError(null);
    try {
      action();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function handleSelect(s: string) {
    if (!slot) return;
    const id = Number(s);
    if (id === slot.id) return;
    // なし → 個数 0。空きから入れたとき、または個数 0 のときは 1 にする
    const count = id === EMPTY_ID ? 0 : slot.count >= 1 ? slot.count : 1;
    run(() => onChange(id, count));
  }

  /** ID調査モード：16進で ID を直接入れる */
  function handleId(input: string) {
    if (!slot) return;
    setIdDraft(input);
    const id = parseHexId(input);
    if (id === null) {
      setError("ID は16進4桁まで（例：2F）で入力してください");
      return;
    }
    if (id === slot.id) {
      setError(null);
      return;
    }
    run(() => onChange(id, id === EMPTY_ID ? 0 : slot.count >= 1 ? slot.count : 1));
  }

  function handleCount(input: string) {
    if (!slot) return;
    setDraft(input);
    if (!/^\d+$/.test(input.trim())) {
      setError("1以上の整数を入力してください");
      return;
    }
    const count = Number(input.trim());
    const problem = validateValuableCount(count);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (count !== slot.count) run(() => onChange(slot.id, count));
  }

  return (
    <div className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{index + 1}件目</span>
        <span className="text-muted-foreground font-mono text-xs">{formatOffset(offset)}</span>
        {slot && (
          <span
            className="text-muted-foreground ml-auto font-mono text-xs"
            title="+0x04〜+0x07（用途不明）"
          >
            ❓ {slot.unknown.toString(16).toUpperCase().padStart(8, "0")}
          </span>
        )}
      </div>
      <div
        className={
          investigate
            ? "grid grid-cols-[1fr_5.5rem_5.5rem] gap-2"
            : "grid grid-cols-[1fr_7rem] gap-2"
        }
      >
        <Select
          // '' は Radix Select でプレースホルダー表示になる（undefined だと非制御扱いになる）
          value={slot === null ? "" : String(slot.id)}
          disabled={readOnly}
          onValueChange={handleSelect}
        >
          <SelectTrigger className="w-full" aria-label={`${index + 1}件目の重要品`}>
            <SelectValue placeholder="未読み込み" />
          </SelectTrigger>
          <SelectContent>
            {slot && !isKnown && (
              <SelectItem value={String(slot.id)} disabled>
                {formatHex4(slot.id)} {slot.label ?? "未知の ID"}（現在の値）
              </SelectItem>
            )}
            <SelectItem value={String(EMPTY_ID)}>なし</SelectItem>
            {VALUABLES.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {investigate && (
          <Input
            value={slot === null ? "" : readOnly ? hexId(slot.id) : idDraft}
            disabled={slot === null}
            readOnly={readOnly}
            placeholder="ID"
            className="font-mono"
            aria-label={`${index + 1}件目の ID（16進）`}
            onChange={(e) => handleId(e.target.value)}
            onBlur={() => {
              if (error && slot) {
                setIdDraft(hexId(slot.id));
                setError(null);
              }
            }}
          />
        )}
        <Input
          value={slot === null || isEmpty ? "" : countLocked ? String(slot.count) : draft}
          disabled={slot === null || isEmpty}
          readOnly={countLocked}
          placeholder={slot === null ? "未読み込み" : isEmpty ? "—" : undefined}
          inputMode="numeric"
          aria-label={`${index + 1}件目の個数`}
          aria-invalid={error !== null}
          onChange={(e) => handleCount(e.target.value)}
          onBlur={() => {
            // 不正な入力のまま離れたら、セーブ上の値に戻す
            if (error && slot) {
              setDraft(String(slot.count));
              setError(null);
            }
          }}
        />
      </div>
      {slot?.problem ? (
        <p className="text-muted-foreground text-xs">読み取り専用：{slot.problem}</p>
      ) : error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : (
        slot?.warning && (
          <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {slot.warning}</p>
        )
      )}
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
