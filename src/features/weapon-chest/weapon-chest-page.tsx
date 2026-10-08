import { useMemo, useState } from "react";
import { CertaintyBadge } from "@/components/certainty-badge";
import { InfoTip } from "@/components/info-tip";
import type { SelectOption } from "@/components/select-options";
import { SelectRow } from "@/components/select-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOffset } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import {
  CAPACITY_MAX,
  CAPACITY_MIN,
  CAPACITY_UNIT,
  WEAPON_CHEST_CAPACITY,
  WEAPON_CHEST_COUNT,
  WEAPON_CHEST_OFFSET,
  readWeaponChest,
  validateWeaponChestCapacity,
  writeWeaponChestCapacity,
  writeWeaponChestCountToFilled,
  type WeaponChestView,
} from "@/save/weapon-chest";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 武器箪笥（刀箪笥）の本数と容量。個々の武器の編集はまだない */
export function WeaponChestPage() {
  const { save, update } = useSave();
  const [error, setError] = useState<string | null>(null);

  const result = useMemo((): { view: WeaponChestView } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: readWeaponChest(save.working) };
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
  const problem = view?.problem ?? null;

  // 容量は 10 本単位。今の武器が収まらない容量は選べない
  const capacityOptions: SelectOption[] = [];
  for (let n = CAPACITY_MIN; n <= CAPACITY_MAX; n++) {
    if (view && validateWeaponChestCapacity(view, n) && n !== view.capacity) continue;
    capacityOptions.push({ value: String(n), label: `${n * CAPACITY_UNIT} 本` });
  }

  function fixCount() {
    setError(null);
    try {
      update((b) => writeWeaponChestCountToFilled(b));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            刀箪笥の本数と容量
            <InfoTip offset={`${formatOffset(WEAPON_CHEST_COUNT)}〜${formatOffset(WEAPON_CHEST_CAPACITY)}`}>
              箪笥の武器は {formatOffset(WEAPON_CHEST_OFFSET)} から 0xA0 B × 200 枠。その直後に本数（2 B）と容量÷10（1 B）があります。
            </InfoTip>
            {/* 位置・意味は 🟢。書き込みの反映は未確認 */}
            <CertaintyBadge mark="🔶" text="書き込み未検証" />
          </CardTitle>
          <CardDescription>
            ゲームは箪笥の先頭から容量の枠までだけを使い、本数が容量に達すると武器を入れられません。書き換えたときのゲーム内の反映は要ゲーム内確認です。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <SelectRow
            label="容量"
            offset={WEAPON_CHEST_CAPACITY}
            value={view ? String(view.capacity) : null}
            currentLabel={view ? `想定外（${view.capacity}）` : undefined}
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
            {view?.countWarning && !problem && (
              <div className="flex flex-col items-start gap-2">
                <p className="text-xs text-amber-600 dark:text-amber-400">{view.countWarning}</p>
                <Button variant="outline" size="sm" onClick={fixCount}>
                  本数を枠の数に合わせる（🔶）
                </Button>
              </div>
            )}
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>
          {problem && (
            <p className="text-muted-foreground text-xs sm:col-span-2">読み取り専用：{problem}</p>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        刀箪笥の個々の武器の編集はまだありません。武器を直接書き換えるときは、本数を武器が入っている枠の数に合わせてください。
      </p>
    </div>
  );
}
