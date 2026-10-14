import { useId, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { WEAPON_LIST_ANCHORS } from "@/features/weapon/anchors";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CompactWeaponList } from "@/features/weapon/compact-weapon-list";
import { WeaponIndexFields } from "@/features/weapon/weapon-index-fields";
import { formatOffset, formatWarnings } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import { useSaveView } from "@/lib/use-save-view";
import { useWrite } from "@/lib/use-write";
import { PageBanner } from "@/components/page-banner";
import { WriteError } from "@/components/write-error";
import {
  CAPACITY_MAX,
  CAPACITY_MIN,
  CAPACITY_UNIT,
  WEAPON_CHEST_CAPACITY,
  WEAPON_CHEST_COUNT,
  WEAPON_CHEST_OFFSET,
  readWeaponChest,
  readWeaponChestWeapons,
  selectableCapacities,
  writeWeaponChestCapacity,
  writeWeaponChestCountToFilled,
} from "@/save/weapon-chest";

const readChest = (bytes: Uint8Array) => ({ view: readWeaponChest(bytes), weapons: readWeaponChestWeapons(bytes) });

/** 武器箪笥（刀箪笥）の本数と容量、個々の武器（帯刀と同じ欄を細い一覧で） */
export function WeaponChestPage() {
  const { save } = useSave();
  const { write: update, tryWrite, error: fixError } = useWrite();
  const [showEmpty, setShowEmpty] = useState(false);
  const showEmptyId = useId();

  const { view: result, error: readError, problem: layoutProblem } = useSaveView(readChest, {
    problem: (v) => v.view.problem,
  });

  const view = result?.view ?? null;
  const weapons = result?.weapons ?? null;
  const problem = view?.problem ?? null;
  // 容量の値が想定外なら、容量の枠は 0 として扱う（武器のある枠はすべて出す）
  const slots = view && !problem ? view.capacity * CAPACITY_UNIT : 0;
  const indices = weapons?.flatMap((w, i) => (!w.empty || (showEmpty && i < slots) ? [i] : []));

  // 容量は 10 本単位。今の武器が収まらない容量は選べない
  const capacityOptions: SelectOption[] = selectableCapacities(view).map((n) => ({
    value: String(n),
    label: `${n * CAPACITY_UNIT} 本`,
  }));

  function fixCount() {
    tryWrite(writeWeaponChestCountToFilled);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={layoutProblem} />

      {/* 箪笥の武器は WEAPON_CHEST_OFFSET から 0xA0 B × 200 枠。その直後に本数（2 B）と容量÷10（1 B）。
          位置・意味は 🟢。🔶 書き換えたときのゲーム内の反映は未確認（要ゲーム内確認）。🟢 ゲームは箪笥の先頭から容量の枠までだけを使う */}
      <AnchoredCard
        anchor={WEAPON_LIST_ANCHORS.capacity}
        title="刀箪笥の本数と容量"
        extra={<InfoTip offset={`${formatOffset(WEAPON_CHEST_COUNT)}〜${formatOffset(WEAPON_CHEST_CAPACITY)}`} />}
        description="刀箪笥に入る本数（容量）を変えられます。本数が容量に達すると、武器を入れられなくなります。"
      >
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <SelectRow
            label="容量"
            offset={WEAPON_CHEST_CAPACITY}
            value={view ? String(view.capacity) : null}
            currentLabel={view ? "想定外" : undefined}
            options={capacityOptions}
            problem={problem}
            hint={`${CAPACITY_MIN * CAPACITY_UNIT}〜${CAPACITY_MAX * CAPACITY_UNIT} 本。新しく始めたときは ${CAPACITY_MIN * CAPACITY_UNIT} 本`}
            note="今入っている武器が収まらない容量は選べません"
            onChange={(v) => update((b) => writeWeaponChestCapacity(b, Number(v)))}
          />
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              本数
              <InfoTip offset={WEAPON_CHEST_COUNT} />
            </span>
            <span className="text-sm">
              {view ? `${view.count} 本（武器が入っている枠：${view.filled.length}）` : "—"}
            </span>
            {view && view.count !== view.filled.length && !problem && (
              <div className="flex flex-col items-start gap-2">
                <p className="text-xs text-amber-600 dark:text-amber-400">{formatWarnings(view.warnings)}</p>
                <Button variant="outline" size="sm" onClick={fixCount}>
                  {/* 🔶 */}
                  本数を枠の数に合わせる
                </Button>
              </div>
            )}
            {!problem && <WriteError error={fixError} />}
          </div>
          {problem && (
            <p className="text-muted-foreground text-xs sm:col-span-2">読み取り専用：{problem}</p>
          )}
        </CardContent>
      </AnchoredCard>

      {/* 未読み込みのときは枠だけを描き、一覧は「—」にする */}
      <AnchoredCard
        anchor={WEAPON_LIST_ANCHORS.weapons}
        title="刀箪笥の武器"
        extra={
          <>
            <span className="text-muted-foreground text-sm font-normal">
              {view ? view.filled.length : "—"} 本
            </span>
            <InfoTip offset={WEAPON_CHEST_OFFSET} />
            <div className="ml-auto flex items-center gap-2 text-sm font-normal">
              <Switch id={showEmptyId} checked={showEmpty} onCheckedChange={setShowEmpty} />
              <Label htmlFor={showEmptyId}>空き枠も表示</Label>
            </div>
          </>
        }
        description={
          <>
            行を押すと編集欄を開きます。
            <br />
            {showEmpty
              ? `容量の枠（${view ? slots : "—"} 枠）と、その外で武器が入っている枠を表示しています。`
              : "武器が入っている枠だけを表示しています。"}
          </>
        }
        className="gap-2"
      >
        <CardContent>
          <WeaponIndexFields />
          {weapons ? (
            <CompactWeaponList
              key={save?.loadId ?? 0}
              weapons={weapons}
              indices={indices}
              badges={(i) =>
                // 🟢 ゲームは先頭から容量の枠までだけを使う
                i >= slots && !weapons[i].empty ? <Badge variant="outline">容量の外</Badge> : null
              }
            />
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
        </CardContent>
      </AnchoredCard>

      <p className="text-muted-foreground text-xs">
        空き枠は編集できず、武器を作る・消す機能はないので、武器の欄を書き換えても本数は変わりません。
        武器を生データで直接増やす・減らすときは、本数を武器が入っている枠の数に合わせてください。
      </p>
    </div>
  );
}
