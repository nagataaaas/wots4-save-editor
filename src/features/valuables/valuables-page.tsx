import { useCallback, useMemo, useState } from "react";
import { FilterSelect } from "@/components/filter-select";
import { InfoTip } from "@/components/info-tip";
import { ItemSlotRow } from "@/components/item-slot-row";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { ITEM_ANCHORS } from "@/features/tools/anchors";
import { useAdvancedMode } from "@/lib/advanced-mode-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatHex4, formatOffset } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { useSave } from "@/lib/save-context";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { WriteResult } from "@/components/write-error";
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
  valuableCountMax,
  writeValuable,
} from "@/save/valuables";

const VALUABLE_GROUPS = [{ items: VALUABLES }];
const VALUABLES_END = VALUABLES_OFFSET + VALUABLE_SLOT_BYTES * VALUABLE_SLOT_COUNT - 1;

export function ValuablesPage() {
  const { save } = useSave();
  const { write: update } = useWrite();
  const { advanced } = useAdvancedMode();
  // 一覧にない ID を書ける ID調査モード（U-14 の調査用に作った）。上級者モードで、画面のスイッチを明示的にオンにしたときだけ使える
  const [investigate, setInvestigate] = useState(false);
  const probing = advanced && investigate;
  const opts = useMemo(() => ({ advanced: probing }), [probing]);

  const read = useCallback((bytes: Uint8Array) => readValuables(bytes, opts), [opts]);
  const { view, error: readError, problem, readOnly } = useSaveView(read);

  const k = save?.loadId ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      <ProbeCard key={k} advanced={advanced} enabled={probing} onToggle={setInvestigate} disabled={readOnly} />

      <AnchoredCard
        anchor={ITEM_ANCHORS.items}
        title={tr({ ja: "重要品", en: "Key items" })}
        extra={
          // チップ・木札は ❓ U-12
          <InfoTip offset={`${formatOffset(VALUABLES_OFFSET)}〜${formatOffset(VALUABLES_END)}`}>
            {tr({
              ja: "チップ・木札は、Steam版で書き込むとゲーム内でセーブできなくなったため選択肢に出しません",
              en: "Casino Chips and Wooden Tags are not offered because writing them in the Steam version left the game unable to save",
            })}
          </InfoTip>
        }
        // 拷問部屋の鍵・謎の鍵の ID は 🟢。ゲーム内での表示と使用は未確認（U-14）
        description={tr({
          ja: "各枠の重要品（地金・会談の手紙・鍵）と個数を設定できます。",
          en: "Set the key item (metals, Meeting Invitation, keys) and quantity of each slot.",
        })}
      >
        <CardContent className="flex flex-col divide-y">
          {Array.from({ length: VALUABLE_SLOT_COUNT }, (_, i) => {
            const slot = view?.slots[i] ?? null;
            return (
              <ItemSlotRow
                key={i}
                index={i}
                offset={slotOffset(i)}
                slot={slot}
                groups={VALUABLE_GROUPS}
                noun={tr({ ja: "重要品", en: "Key item" })}
                investigate={probing}
                // 🔶 個数の上限は推測（chunks/items）。既存の検証と同じ上限を右側に表示する。
                countMaxFor={() => valuableCountMax(opts)}
                normalCountMaxFor={() => VALUABLE_COUNT_MAX}
                onChange={(id, count) => update((b) => writeValuable(b, i, id, count, opts))}
              />
            );
          })}
        </CardContent>
      </AnchoredCard>

      {/* 各枠の +0x00〜+0x03（ID・個数）だけを書き換える。❓ +0x04〜+0x07 の用途は不明なので変えない。
          🔶 個数の上限は推測（chunks/items）で、ゲーム内の上限は未確認 */}
      <p className="text-muted-foreground text-xs">
        {tr({
          ja: `個数の上限 ${VALUABLE_COUNT_MAX} はエディタの目安です。`,
          en: `The quantity limit of ${VALUABLE_COUNT_MAX} is a guideline set by this editor.`,
        })}
      </p>
    </div>
  );
}

/** ID調査モードの切り替えと、空き枠への候補 ID の一括入力（U-14 の調査用に作った） */
function ProbeCard({
  advanced,
  enabled,
  onToggle,
  disabled,
}: {
  /** 上級者モード。オフのときはスイッチを出さない */
  advanced: boolean;
  /** 上級者モードかつスイッチがオン */
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled: boolean;
}) {
  const [start, setStart] = useState(String(PROBE_CANDIDATES[0]));
  const { tryWrite, message } = useWrite();

  function fill() {
    const result = tryWrite((b) => {
      const filled = fillEmptySlotsWithProbes(b, Number(start));
      // 何も書かなかったときは失敗として出す
      if (filled.length === 0) {
        throw new Error(tr({ ja: "入れられる空き枠か候補 ID がありません", en: "No empty slots or candidate IDs left" }));
      }
      return filled;
    }, (filled) => tr({
      ja: `入れた ID：${filled.map(formatHex4).join(", ")}`,
      en: `IDs written: ${filled.map(formatHex4).join(", ")}`,
    }));
    if (!result.ok) return;
    const filled = result.value;
    // 次の回は続きから
    const next = PROBE_CANDIDATES[PROBE_CANDIDATES.indexOf(filled[filled.length - 1]) + 1];
    if (next !== undefined) setStart(String(next));
  }

  return (
    <AnchoredCard
      anchor={ITEM_ANCHORS.probe}
      title={tr({ ja: "ID調査モード", en: "ID probe mode" })}
      extra={
        <>
          <Badge variant="outline" className="font-normal">{tr({ ja: "上級者向け", en: "Advanced" })}</Badge>
          {advanced && (
            <Switch
              className="ml-auto"
              checked={enabled}
              onCheckedChange={onToggle}
              aria-label={tr({ ja: "ID調査モード", en: "ID probe mode" })}
            />
          )}
        </>
      }
      // 不正な ID でセーブできなくなる例は U-12
      description={
        <>
          {tr({
            ja: "一覧にない重要品を書き込んで、ゲーム内でどう見えるかを調べる上級者向けの機能です。",
            en: "An advanced feature that writes key items not in the list so you can see how they appear in the game.",
          })}
          <br />
          {tr({
            ja: "ゲーム内でセーブできなくなることがあるので、必ずセーブのコピーで試してください。",
            en: "The game may become unable to save, so always try this on a copy of your save.",
          })}
          {!advanced && (
            <>
              <br />
              {tr({ ja: "上級者モードをオンにすると使えます。", en: "Turn on Advanced mode to use this." })}
            </>
          )}
        </>
      }
    >
      {enabled && (
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>{tr({ ja: "開始 ID", en: "Starting ID" })}</Label>
              <FilterSelect
                options={PROBE_CANDIDATES.map((id) => ({ value: String(id), label: formatHex4(id) }))}
                value={start}
                onChange={setStart}
                disabled={disabled}
                className="w-32 font-mono"
              />
            </div>
            <Button onClick={fill} disabled={disabled}>
              {tr({ ja: "空き枠に候補 ID を入れる", en: "Fill empty slots with candidate IDs" })}
            </Button>
          </div>
          <WriteResult message={message} />
          {/* 🔶 候補の範囲：0xD7〜0xFF、続いて 0x9F〜0xBF の残り */}
          <p className="text-muted-foreground text-xs">
            {tr({
              ja: "「なし」の枠に、開始 ID から順に候補の ID を個数 1 で入れます。既に入っている枠は変えません。 "
                + "ゲームでロードして重要品の一覧に出た名前を確かめ、ID と名前の対応を教えてください。",
              en: 'Fills "None" slots with candidate IDs, starting from the starting ID, with a quantity of 1. Slots that already hold something are not changed. '
                + "Load the game, check the names shown in the key item list, and let us know which ID matches which name.",
            })}
          </p>
        </CardContent>
      )}
    </AnchoredCard>
  );
}
