import { useState } from "react";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { SelectRow } from "@/components/select-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSave } from "@/lib/save-context";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { ACCESSORIES } from "@/save/master/accessory-names";
import { ACCESSORY_FLAGS_OFFSET } from "@/save/unlocks";
import {
  ACCESSORY_ATTACHMENT_LABELS,
  ACCESSORY_FLOAT_FIELDS,
  accessoryFloatRange,
  copySheathedAccessoryToDrawn,
  equipAccessory,
  readAccessorySlot,
  resetAccessoryDefaults,
  writeAccessoryField,
  writeCommonAccessoryField,
} from "@/save/accessory-equipment";

const GROUP_LABELS = [
  "現在の装着",
  "俺のおしゃれ1",
  "俺のおしゃれ2",
  "俺のおしゃれ3",
  "俺のおしゃれ4",
  "俺のおしゃれ5",
];
const formatFloat = (value: number) => String(Number(value.toPrecision(7)));
const idOptions = [
  { value: "-1", label: "なし（空き枠）" },
  ...ACCESSORIES.map((a) => ({ value: String(a.id), label: `${a.ja}（ID ${a.id}）` })),
];
const jointOptions = ACCESSORY_ATTACHMENT_LABELS.map((label, i) => ({
  value: String(i),
  label: `${label}（${i}）`,
}));
const MODE_LABELS = { A: "納刀", B: "抜刀", common: "共通" } as const;

function parseFloatInput(input: string, min: number, max: number): ParseResult<number> {
  if (!input.trim()) return { ok: false, error: "数値を入力してください" };
  const value = Number(input);
  if (!Number.isFinite(value) || value < min || value > max)
    return { ok: false, error: `${min}〜${max}の有限の数値を入力してください` };
  return { ok: true, value };
}

function AccessorySlotEditor({ group, slot, onSelectSlot }: { group: number; slot: number; onSelectSlot: (slot: number) => void }) {
  const { save, update } = useSave();
  const { advanced } = useAdvancedMode();
  const [mode, setMode] = useState<keyof typeof MODE_LABELS>("A");
  const [pending, setPending] = useState<"common" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const current = save ? readAccessorySlot(save.working, group, slot, advanced) : null;
  const offset = current?.offset ?? 0x39cc;
  const problem = current?.problem ?? null;
  const selected = ACCESSORIES.find((a) => a.id === current?.id);
  const disabled = !current || Boolean(problem) || !selected;
  const unowned = selected && save?.working[ACCESSORY_FLAGS_OFFSET + selected.id] !== 1;
  const state = mode === "B" ? "B" : "A";

  function confirm() {
    try {
      if (pending === "common") {
        update((b) => copySheathedAccessoryToDrawn(b, group, slot, advanced));
        setMode("common");
      } else if (pending === "reset")
        update((b) => resetAccessoryDefaults(b, group, slot, advanced));
      setRevision((n) => n + 1);
      setPending(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <Card>
        <div className="grid gap-6 sm:grid-cols-[minmax(0,5fr)_minmax(0,2fr)] sm:gap-0">
          <div className="min-w-0 space-y-6">
        <CardHeader>
          <CardTitle>
            {slot + 1}枠目：{selected?.ja ?? (current?.id === -1 ? "空き" : "装飾品")}
          </CardTitle>
          <CardDescription>
            装飾品を変更すると、新しい装飾品の標準部位に取り付け、納刀・抜刀の補正を0へ戻します。所持フラグ・未知のバイトは変更しません。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectRow
              label="装飾品"
              offset={offset + 0x3e}
              value={current?.id === null || !current ? null : String(current.id)}
              currentLabel={`未知のID ${current?.id}`}
              options={idOptions}
              problem={problem}
              warning={
                unowned
                  ? "この装飾品の所持フラグは1ではありません。必要なら所持画面で変更してください。"
                  : null
              }
              onChange={(v) => {
                update((b) => equipAccessory(b, group, slot, Number(v), advanced));
                setRevision((n) => n + 1);
                setMode("A");
              }}
            />
            <SelectRow
              label="取り付け先"
              offset={offset + 0x3c}
              value={current?.joint === null || !current ? null : String(current.joint)}
              options={jointOptions}
              problem={problem}
              disabled={!selected}
              note="🟢 標準の位置・回転からさらに補正して配置します。頭は顔、胸は背中も含みます。"
              onChange={(v) =>
                update((b) => writeAccessoryField(b, group, slot, "joint", Number(v), advanced))
              }
            />
          </div>
          {selected && (
            <div className="text-muted-foreground space-y-1 text-sm">
              <p>標準の取り付け先：{ACCESSORY_ATTACHMENT_LABELS[selected.defaultAttachment]}</p>
              <p>標準位置：({selected.defaultPosition.map(formatFloat).join(", ")})</p>
              <p>
                標準回転：({selected.defaultRotation.map(formatFloat).join(", ")}) 度 ／
                標準サイズ：{formatFloat(selected.defaultSize)}
              </p>
              <p>標準位置・回転は装飾品固有の値です。下の欄で編集するのは標準からの補正です。</p>
            </div>
          )}
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => {
              setError(null);
              setPending("reset");
            }}
          >
            標準設定に戻す
          </Button>
          <p className="text-muted-foreground text-sm">
            「なし」にすると外れます。位置・回転・大きさ・未知のバイトは残します。
          </p>
        </CardContent>
          </div>
          <div className="min-w-0 border-t px-6 pt-6 sm:border-t-0 sm:border-l sm:pt-0">
            <AccessorySlotList group={group} slot={slot} onSelectSlot={onSelectSlot} />
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{MODE_LABELS[mode]}の調整 🟢</CardTitle>
          <CardDescription>
            位置・回転は標準からの補正。大きさは1.0で標準（保存補正0.0）です。共通を選ぶと納刀の調整で抜刀を上書きします。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="調整する構え">
            {(["A", "B", "common"] as const).map((value) => (
              <Button
                key={value}
                variant={mode === value ? "default" : "outline"}
                aria-pressed={mode === value}
                disabled={disabled}
                onClick={() => {
                  if (value === mode) return;
                  if (value === "common") {
                    setError(null);
                    setPending("common");
                  } else setMode(value);
                }}
              >
                {MODE_LABELS[value]}
              </Button>
            ))}
          </div>
          {mode === "common" && (
            <p className="text-muted-foreground text-sm">
              納刀・抜刀を同じ値に調整します。各状態を別々に変えたい場合は「納刀」または「抜刀」を選んでください。
            </p>
          )}
          {advanced && (
            <p className="text-muted-foreground text-sm">
              上級者モード：位置 −100〜100、大きさ 0〜100。
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {ACCESSORY_FLOAT_FIELDS.filter((f) => f.state === state).map((field) => {
              const { min, max } = accessoryFloatRange(field.key, advanced);
              return (
                <FieldRow
                  key={`${revision}-${mode}-${advanced}-${field.key}`}
                  label={field.label}
                  offset={offset + field.relative}
                  value={current?.values[field.key] ?? null}
                  problem={problem ?? (current?.id === -1 ? "装飾品を選択してください" : null)}
                  format={formatFloat}
                  parse={(v) => parseFloatInput(v, min, max)}
                  apply={(v) =>
                    update((b) =>
                      mode === "common"
                        ? writeCommonAccessoryField(b, group, slot, field.key, v, advanced)
                        : writeAccessoryField(b, group, slot, field.key, v, advanced),
                    )
                  }
                  inputMode="decimal"
                  hint={`${min}〜${max}`}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending === "common" ? "抜刀の調整を上書きしますか？" : "標準設定に戻しますか？"}
            </DialogTitle>
            <DialogDescription>
              {pending === "common"
                ? "納刀の位置・回転・大きさを抜刀へコピーします。抜刀側の独自の調整は失われ、その後は両方を同時に調整します。"
                : "取り付け先をこの装飾品の標準部位に戻し、納刀・抜刀の位置・回転・大きさの補正を0にします。"}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPending(null);
                setError(null);
              }}
            >
              キャンセル
            </Button>
            <Button disabled={disabled} onClick={confirm}>
              {pending === "common" ? "上書きして共通で調整" : "標準設定に戻す"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {current && (
        <details className="text-muted-foreground text-xs">
          <summary className="cursor-pointer">
            この枠の生バイト（0x{offset.toString(16).toUpperCase()}、64 B）
          </summary>
          <p className="mt-2 break-all font-mono">{current.raw || "領域を読み取れません"}</p>
          <p className="mt-2">+0x00〜03・+0x3Dの意味は未確認で、編集時も維持します。</p>
        </details>
      )}
    </>
  );
}

function AccessorySlotList({ group, slot, onSelectSlot }: { group: number; slot: number; onSelectSlot: (slot: number) => void }) {
  const { save } = useSave();
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm">編集する枠</legend>
      <div className="grid gap-1">
        {Array.from({ length: 10 }, (_, i) => {
          const entry = save ? readAccessorySlot(save.working, group, i) : null;
          const name = entry?.id === -1 ? "空き" : (ACCESSORIES.find((a) => a.id === entry?.id)?.ja ?? (entry ? `ID ${entry.id ?? "不明"}` : "未読み込み"));
          return (
            <Button
              key={i}
              variant={slot === i ? "default" : "outline"}
              aria-pressed={slot === i}
              className="h-auto min-h-9 w-full justify-start whitespace-normal text-left"
              onClick={() => onSelectSlot(i)}
            >
              {i + 1}枠目：{name}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AccessoryEquipmentPage() {
  const { save } = useSave();
  const [group, setGroup] = useState(0);
  const [slot, setSlot] = useState(0);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          編集する記録
          <select
            className="bg-background rounded-md border p-2"
            value={group}
            onChange={(e) => setGroup(Number(e.target.value))}
          >
            {GROUP_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* 枠・記録・ファイルが変わったら共通モードと確認待ち、入力途中を破棄する。 */}
      <AccessorySlotEditor
        key={`${save?.loadId ?? 0}-${group}-${slot}`}
        group={group}
        slot={slot}
        onSelectSlot={setSlot}
      />
    </div>
  );
}
