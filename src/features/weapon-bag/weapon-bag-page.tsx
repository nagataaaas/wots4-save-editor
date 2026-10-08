import { useMemo } from "react";
import { InfoTip } from "@/components/info-tip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOffset } from "@/lib/format";
import { useSave } from "@/lib/save-context";
import { WEAPON_BAG_COUNT, WEAPON_BAG_OFFSET, readWeaponBag, weaponBagOffset, type WeaponBagView } from "@/save/weapon-bag";
import { CompactWeaponList } from "@/features/belt/compact-weapon-list";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 武器袋の10本。帯刀と同じ欄を、細い一覧で編集する */
export function WeaponBagPage() {
  const { save, update } = useSave();

  const result = useMemo((): { view: WeaponBagView } | { error: string } | null => {
    if (!save) return null;
    try {
      return { view: readWeaponBag(save.working) };
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
  const k = save?.loadId ?? 0;
  const filled = view?.weapons.filter((w) => !w.empty).length ?? 0;

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

      {view && (
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              武器袋
              <span className="text-muted-foreground text-sm font-normal">
                {filled} / {WEAPON_BAG_COUNT} 本
              </span>
              <InfoTip offset={`${formatOffset(WEAPON_BAG_OFFSET)} から 0xA0 B × ${WEAPON_BAG_COUNT}`} />
            </CardTitle>
            <CardDescription>行を押すと編集欄を開きます。</CardDescription>
          </CardHeader>
          <CardContent>
            <CompactWeaponList
              key={k}
              weapons={view.weapons}
              update={(i) => (mutate) => update((b) => mutate(b, weaponBagOffset(i)))}
            />
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-xs">
        各フィールドのバイトだけを書き換えます。用途不明（❓）の領域は変えません。空き枠は編集できません（武器を新しく作る機能はありません）。
        レコードの位置は、完成武器ID の位置を先頭として表示します（🟢。既存エディタ [TS] の位置より 6 B 後ろ）。
      </p>
    </div>
  );
}
