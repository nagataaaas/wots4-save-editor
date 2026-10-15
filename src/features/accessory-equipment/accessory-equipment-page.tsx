import { useCallback, useState } from "react";
import { useSaveView } from "@/lib/use-save-view";
import { PageBanner } from "@/components/page-banner";
import { FieldRow, type ParseResult } from "@/components/field-row";
import { SelectRow } from "@/components/select-row";
import { Button } from "@/components/ui/button";
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
import { tr, type Localized } from "@/lib/i18n";
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

const GROUP_LABELS: readonly Localized[] = [
  { ja: "現在の装着", en: "Currently worn" },
  { ja: "俺のおしゃれ1", en: "My Ensemble 1" },
  { ja: "俺のおしゃれ2", en: "My Ensemble 2" },
  { ja: "俺のおしゃれ3", en: "My Ensemble 3" },
  { ja: "俺のおしゃれ4", en: "My Ensemble 4" },
  { ja: "俺のおしゃれ5", en: "My Ensemble 5" },
];
const formatFloat = (value: number) => String(Number(value.toPrecision(7)));
const accessoryName = (a: (typeof ACCESSORIES)[number]) => tr({ ja: a.ja, en: a.en });
const idOptions = () => [
  { value: "-1", label: tr({ ja: "なし（空き枠）", en: "None (empty slot)" }) },
  ...ACCESSORIES.map((a) => ({ value: String(a.id), label: accessoryName(a) })),
];
const jointOptions = () =>
  ACCESSORY_ATTACHMENT_LABELS.map((label, i) => ({
    value: String(i),
    label: tr(label),
  }));
const MODE_LABELS: Record<"A" | "B" | "common", Localized> = {
  A: { ja: "納刀", en: "Sheathed" },
  B: { ja: "抜刀", en: "Drawn" },
  common: { ja: "共通", en: "Both" },
};
const emptySlotLabel = () => tr({ ja: "空き", en: "Empty" });
/** 「n枠目：名前」 */
const slotTitle = (slot: number, name: string) => tr({ ja: `${slot + 1}枠目：${name}`, en: `Slot ${slot + 1}: ${name}` });

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
          {pending === "common"
            ? tr({ ja: "抜刀の調整を上書きしますか？", en: "Overwrite the Drawn adjustments?" })
            : tr({ ja: "標準設定に戻しますか？", en: "Restore the defaults?" })}
        </DialogTitle>
        <DialogDescription>
          {pending === "common"
            ? tr({
                ja: "納刀の位置・回転・大きさを抜刀へコピーします。抜刀側の独自の調整は失われ、その後は両方を同時に調整します。",
                en: "Copies the Sheathed position, rotation and size to Drawn. Any separate Drawn adjustments are lost, and both are adjusted together from then on.",
              })
            : tr({
                ja: "取り付け先をこの装飾品の標準部位に戻し、納刀・抜刀の位置・回転・大きさの補正を0にします。",
                en: "Resets the attachment point to this accessory's default body part and sets the Sheathed and Drawn position, rotation and size adjustments to 0.",
              })}
        </DialogDescription>
      </DialogHeader>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {tr({ ja: "キャンセル", en: "Cancel" })}
        </Button>
        <Button disabled={disabled} onClick={() => attempt(onConfirm)}>
          {pending === "common"
            ? tr({ ja: "上書きして共通で調整", en: "Overwrite and adjust both" })
            : tr({ ja: "標準設定に戻す", en: "Restore defaults" })}
        </Button>
      </DialogFooter>
    </>
  );
}

function parseFloatInput(input: string, min: number, max: number): ParseResult<number> {
  if (!input.trim()) return { ok: false, error: tr({ ja: "数値を入力してください", en: "Enter a number" }) };
  const value = Number(input);
  if (!Number.isFinite(value) || value < min || value > max)
    return { ok: false, error: tr({ ja: `${min}〜${max}の有限の数値を入力してください`, en: `Enter a finite number from ${min} to ${max}` }) };
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
              {slotTitle(
                slot,
                !current
                  ? "—"
                  : selected
                    ? accessoryName(selected)
                    : current.id === -1
                      ? emptySlotLabel()
                      : tr({ ja: "装飾品", en: "Accessory" }),
              )}
            </h3>
            <p className="text-muted-foreground text-sm">
              {tr({
                ja: "装飾品を変更すると、新しい装飾品の標準部位に取り付け、納刀・抜刀の補正を0へ戻します。所持の状態は変更しません。",
                en: "Changing the accessory attaches the new one at its default body part and resets the Sheathed and Drawn adjustments to 0. Ownership is not changed.",
              })}
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectRow
                label={tr({ ja: "装飾品", en: "Accessory" })}
                offset={offset + ACCESSORY_FIELDS.id.relative}
                value={current ? String(current.id) : null}
                currentLabel={tr({ ja: "不明な装飾品", en: "Unknown accessory" })}
                options={idOptions()}
                problem={problem}
                warning={
                  unowned
                    ? tr({
                        ja: "この装飾品は未所持です。必要なら所持画面で変更してください。",
                        en: "You do not own this accessory. Change it on the Accessories screen if needed.",
                      })
                    : null
                }
                onChange={(v) => {
                  update((b) => equipAccessory(b, group, slot, Number(v), { advanced }));
                  setMode("A");
                }}
              />
              <SelectRow
                label={tr({ ja: "取り付け先", en: "Body part" })}
                offset={offset + ACCESSORY_FIELDS.joint.relative}
                value={current ? String(current.joint) : null}
                options={jointOptions()}
                problem={problem}
                disabled={!selected}
                // 🟢
                note={tr({
                  ja: "標準の位置・回転からさらに補正して配置します。頭は顔、胸は背中も含みます。",
                  en: "The accessory is placed with adjustments on top of its default position and rotation. Head includes the face, and Chest includes the back.",
                })}
                onChange={(v) =>
                  update((b) => writeAccessoryField(b, group, slot, "joint", Number(v), { advanced }))
                }
              />
            </div>
            {selected && (
              <div className="text-muted-foreground space-y-1 text-sm">
                <p>
                  {tr({
                    ja: `標準の取り付け先：${ACCESSORY_ATTACHMENT_LABELS[selected.defaultAttachment].ja}`,
                    en: `Default body part: ${ACCESSORY_ATTACHMENT_LABELS[selected.defaultAttachment].en}`,
                  })}
                </p>
                <p>
                  {tr({
                    ja: `標準位置：(${selected.defaultPosition.map(formatFloat).join(", ")})`,
                    en: `Default position: (${selected.defaultPosition.map(formatFloat).join(", ")})`,
                  })}
                </p>
                <p>
                  {tr({
                    ja: `標準回転：(${selected.defaultRotation.map(formatFloat).join(", ")}) 度 ／ 標準サイズ：${formatFloat(selected.defaultSize)}`,
                    en: `Default rotation: (${selected.defaultRotation.map(formatFloat).join(", ")}) deg / Default size: ${formatFloat(selected.defaultSize)}`,
                  })}
                </p>
                <p>
                  {tr({
                    ja: "標準位置・回転は装飾品固有の値です。下の欄で編集するのは標準からの補正です。",
                    en: "The default position and rotation are fixed for each accessory. The fields below edit the adjustments from the default.",
                  })}
                </p>
              </div>
            )}
            <p className="text-muted-foreground text-sm">
              {tr({
                ja: "「なし」にすると外れます。位置・回転・大きさは残します。",
                en: "Choosing \"None\" removes it. The position, rotation and size are kept.",
              })}
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
          <h3 className="text-sm font-semibold">
            {tr({ ja: `${MODE_LABELS[mode].ja}の調整`, en: `${MODE_LABELS[mode].en} adjustments` })}
          </h3>
          <p className="text-muted-foreground text-sm">
            {tr({
              ja: "位置・回転は標準からの補正。大きさは1.0が標準です。共通を選ぶと納刀の調整で抜刀を上書きします。",
              en: "Position and rotation are adjustments from the default. A size of 1.0 is the default. Choosing Both overwrites Drawn with the Sheathed adjustments.",
            })}
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label={tr({ ja: "調整する構え", en: "State to adjust" })}>
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
                {tr(MODE_LABELS[value])}
              </Button>
            ))}
          </div>
          {mode === "common" && (
            <p className="text-muted-foreground text-sm">
              {tr({
                ja: "納刀・抜刀を同じ値に調整します。各状態を別々に変えたい場合は「納刀」または「抜刀」を選んでください。",
                en: "Adjusts Sheathed and Drawn to the same values. To change them separately, choose Sheathed or Drawn.",
              })}
            </p>
          )}
          {advanced && (
            <p className="text-muted-foreground text-sm">
              {tr({ ja: "上級者モード：位置 −100〜100、大きさ 0〜100。", en: "Advanced mode: position −100 to 100, size 0 to 100." })}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {ACCESSORY_FLOAT_FIELDS.filter((f) => f.state === state).map((field) => {
              const { min, max } = accessoryFloatRange(field.key, { advanced });
              // 空き枠は書き込めないので、値を見せたまま欄を無効にする
              const empty = current?.id === -1 && !problem;
              return (
                <FieldRow
                  key={field.key}
                  label={tr(field.label)}
                  offset={offset + field.relative}
                  value={current?.values[field.key] ?? null}
                  problem={problem}
                  disabled={empty}
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
                  hint={
                    empty
                      ? tr({ ja: "装飾品を選ぶと調整できます", en: "Choose an accessory to adjust" })
                      : tr({ ja: `${min}〜${max}`, en: `${min} to ${max}` })
                  }
                />
              );
            })}
          </div>
        </div>
      </section>
      <div className="border-t pt-6">
        <Button variant="outline" disabled={disabled} onClick={() => setPending("reset")}>
          {tr({ ja: "標準設定に戻す", en: "Restore defaults" })}
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
      <legend className="text-sm">{tr({ ja: "編集する枠", en: "Slot to edit" })}</legend>
      <div className="grid gap-1">
        {Array.from({ length: ACCESSORY_SLOT_COUNT }, (_, i) => {
          const entry = entries?.[i] ?? null;
          const found = ACCESSORIES.find((a) => a.id === entry?.id);
          const name =
            entry?.id === -1
              ? emptySlotLabel()
              : found
                ? accessoryName(found)
                : entry
                  ? tr({ ja: "不明", en: "Unknown" })
                  : "—";
          return (
            <Button
              key={i}
              variant={slot === i ? "default" : "outline"}
              aria-pressed={slot === i}
              className="h-auto min-h-9 w-full justify-start whitespace-normal text-left"
              onClick={() => onSelectSlot(i)}
            >
              {slotTitle(i, name)}
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
          <span>{tr({ ja: "編集する記録", en: "Set to edit" })}</span>
          <FilterSelect aria-label={tr({ ja: "編集する記録", en: "Set to edit" })} value={String(group)} onChange={(v) => setGroup(Number(v))}
            options={GROUP_LABELS.map((label, i) => ({ value: String(i), label: tr(label) }))} />
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
