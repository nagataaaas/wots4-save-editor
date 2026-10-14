import { useCallback, useState } from "react";
import { useSaveView } from "@/lib/use-save-view";
import { PageBanner } from "@/components/page-banner";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { FieldShell } from "@/components/field-shell";
import { SelectRow } from "@/components/select-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSave } from "@/lib/save-context";
import { useWrite } from "@/lib/use-write";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { ACCESSORIES } from "@/save/master/accessory-names";
import { FilterSelect } from "@/components/filter-select";
import {
  ACCESSORY_ATTACHMENT_LABELS,
  ACCESSORY_FLOAT_FIELDS,
  ACCESSORY_FIELDS,
  ACCESSORY_SLOT_COUNT,
  accessoryFloatRange,
  accessorySlotOffset,
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
  ...ACCESSORIES.map((a) => ({ value: String(a.id), label: a.ja })),
];
const jointOptions = ACCESSORY_ATTACHMENT_LABELS.map((label, i) => ({
  value: String(i),
  label,
}));
const MODE_LABELS = { A: "納刀", B: "抜刀", common: "共通" } as const;

type Pending = "common" | "reset";

/** 共通にする・標準設定に戻すの確認。書き込みに失敗したら、その理由をこの中に出す */
function PendingConfirm({ pending, disabled, onCancel, onConfirm }: {
  pending: Pending; disabled: boolean; onCancel: () => void; onConfirm: () => void
}) {
  const { attempt, error } = useWrite();
  return (
    <>
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
        <Button variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button disabled={disabled} onClick={() => attempt(onConfirm)}>
          {pending === "common" ? "上書きして共通で調整" : "標準設定に戻す"}
        </Button>
      </DialogFooter>
    </>
  );
}

function parseFloatInput(input: string, min: number, max: number): ParseResult<number> {
  if (!input.trim()) return { ok: false, error: "数値を入力してください" };
  const value = Number(input);
  if (!Number.isFinite(value) || value < min || value > max)
    return { ok: false, error: `${min}〜${max}の有限の数値を入力してください` };
  return { ok: true, value };
}

function AccessorySlotEditor({ group, slot, onSelectSlot }: { group: number; slot: number; onSelectSlot: (slot: number) => void }) {
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  const [mode, setMode] = useState<keyof typeof MODE_LABELS>("A");
  const [pending, setPending] = useState<Pending | null>(null);
  const read = useCallback((bytes: Uint8Array) => readAccessorySlot(bytes, group, slot), [group, slot]);
  const { view: current, error: readError } = useSaveView(read);
  const offset = current?.offset ?? accessorySlotOffset(group, slot);
  const problem = readError ?? current?.problem ?? null;
  const selected = ACCESSORIES.find((a) => a.id === current?.id);
  const disabled = !current || Boolean(problem) || !selected;
  const unowned = selected && current && !current.owned;
  const state = mode === "B" ? "B" : "A";

  /** 確認した操作を書き込む。失敗したら例外のまま投げ、確認の中身（PendingConfirm）が出す */
  function confirm() {
    if (pending === "common") {
      update((b) => copySheathedAccessoryToDrawn(b, group, slot, { advanced }));
      setMode("common");
    } else if (pending === "reset")
      update((b) => resetAccessoryDefaults(b, group, slot));
    setPending(null);
  }

  return (
    <>
      <PageBanner error={readError} problem={current?.problem ?? null} />
      {current?.warnings.map((warning) => <p key={warning} className="text-xs text-amber-600 dark:text-amber-400">⚠ {warning}</p>)}
      <div className="grid gap-6 sm:grid-cols-[minmax(0,5fr)_minmax(0,2fr)] sm:gap-0">
        <section className="min-w-0 space-y-4 sm:pr-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              {slot + 1}枠目：{!current ? "—" : (selected?.ja ?? (current.id === -1 ? "空き" : "装飾品"))}
            </h3>
            <p className="text-muted-foreground text-sm">
              装飾品を変更すると、新しい装飾品の標準部位に取り付け、納刀・抜刀の補正を0へ戻します。所持の状態は変更しません。
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectRow
                label="装飾品"
                offset={offset + ACCESSORY_FIELDS.id.relative}
                value={current ? String(current.id) : null}
                currentLabel="不明な装飾品"
                options={idOptions}
                problem={problem}
                warning={
                  unowned
                    ? "この装飾品は未所持です。必要なら所持画面で変更してください。"
                    : null
                }
                onChange={(v) => {
                  update((b) => equipAccessory(b, group, slot, Number(v), { advanced }));
                  setMode("A");
                }}
              />
              <SelectRow
                label="取り付け先"
                offset={offset + ACCESSORY_FIELDS.joint.relative}
                value={current ? String(current.joint) : null}
                options={jointOptions}
                problem={problem}
                disabled={!selected}
                // 🟢
                note="標準の位置・回転からさらに補正して配置します。頭は顔、胸は背中も含みます。"
                onChange={(v) =>
                  update((b) => writeAccessoryField(b, group, slot, "joint", Number(v), { advanced }))
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
            <p className="text-muted-foreground text-sm">
              「なし」にすると外れます。位置・回転・大きさは残します。
            </p>
          </div>
        </section>
        <div className="min-w-0 border-t pt-6 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
          <AccessorySlotList group={group} slot={slot} onSelectSlot={onSelectSlot} />
        </div>
      </div>
      <section className="space-y-4 border-t pt-6">
        <div className="space-y-2">
          {/* 🟢 */}
          <h3 className="text-sm font-semibold">{MODE_LABELS[mode]}の調整</h3>
          <p className="text-muted-foreground text-sm">
            位置・回転は標準からの補正。大きさは1.0が標準です。共通を選ぶと納刀の調整で抜刀を上書きします。
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="調整する構え">
            {(["A", "B", "common"] as const).map((value) => (
              <Button
                key={value}
                variant={mode === value ? "default" : "outline"}
                aria-pressed={mode === value}
                // 納刀・抜刀は表示の切り替えだけなので、未読み込みのときも押せる。共通は書き込みの確認を開くので止める
                disabled={(value === "common" || current !== null) && disabled}
                onClick={() => {
                  if (value === mode) return;
                  if (value === "common") setPending("common");
                  else setMode(value);
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
              const { min, max } = accessoryFloatRange(field.key, { advanced });
              // 空き枠は書き込めないので、値を見せたまま欄を無効にする
              if (current?.id === -1 && !problem)
                return (
                  <FieldShell
                    key={field.key}
                    label={field.label}
                    offset={offset + field.relative}
                    problem={null}
                    hint="装飾品を選ぶと調整できます"
                  >
                    <Input value={formatFloat(current.values[field.key])} disabled readOnly />
                  </FieldShell>
                );
              return (
                <FieldRow
                  key={field.key}
                  label={field.label}
                  offset={offset + field.relative}
                  value={current?.values[field.key] ?? null}
                  problem={problem}
                  format={formatFloat}
                  parse={(v) => parseFloatInput(v, min, max)}
                  apply={(v) =>
                    update((b) =>
                      mode === "common"
                        ? writeCommonAccessoryField(b, group, slot, field.key, v, { advanced })
                        : writeAccessoryField(b, group, slot, field.key, v, { advanced }),
                    )
                  }
                  inputMode="decimal"
                  hint={`${min}〜${max}`}
                />
              );
            })}
          </div>
        </div>
      </section>
      <div className="border-t pt-6">
        <Button variant="outline" disabled={disabled} onClick={() => setPending("reset")}>
          標準設定に戻す
        </Button>
      </div>
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          {/* DialogContent は閉じると外れるので、確認の中身の書き込みエラーも閉じれば消える */}
          <PendingConfirm
            pending={pending ?? "reset"}
            disabled={disabled}
            onCancel={() => setPending(null)}
            onConfirm={confirm}
          />
        </DialogContent>
      </Dialog>
      {/* 生バイトの表示（枠の 64 B）は画面から外した。❓ +0x00〜03・+0x3D の意味は未確認で、編集時も元の値を維持する */}
    </>
  );
}

function AccessorySlotList({ group, slot, onSelectSlot }: { group: number; slot: number; onSelectSlot: (slot: number) => void }) {
  const read = useCallback((bytes: Uint8Array) => Array.from({ length: ACCESSORY_SLOT_COUNT }, (_, i) => readAccessorySlot(bytes, group, i)), [group]);
  // 読めないときのエラーは、同じ枠を読む AccessorySlotEditor が出す
  const { view: entries } = useSaveView(read);
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm">編集する枠</legend>
      <div className="grid gap-1">
        {Array.from({ length: ACCESSORY_SLOT_COUNT }, (_, i) => {
          const entry = entries?.[i] ?? null;
          const name = entry?.id === -1 ? "空き" : (ACCESSORIES.find((a) => a.id === entry?.id)?.ja ?? (entry ? "不明" : "—"));
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

export function AccessoryEquipmentEditor() {
  const { save } = useSave();
  const [group, setGroup] = useState(0);
  const [slot, setSlot] = useState(0);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 text-sm">
          <span>編集する記録</span>
          <FilterSelect aria-label="編集する記録" value={String(group)} onChange={(v) => setGroup(Number(v))}
            options={GROUP_LABELS.map((label, i) => ({ value: String(i), label }))} />
        </div>
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
