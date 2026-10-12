import { useMemo } from "react";
import { InfoTip } from "@/components/info-tip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScopeAnchorLink } from "@/components/anchor-link";
import { AnchoredCard } from "@/components/anchored-card";
import { WEAPON_LIST_ANCHORS } from "@/features/belt/anchors";
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
  const filled = view ? view.weapons.filter((w) => !w.empty).length : "—";

  return (
    <div className="flex flex-col gap-4">
      {view?.layoutProblem && (
        <Alert variant="destructive">
          <AlertTitle>読み取り専用</AlertTitle>
          <AlertDescription>{view.layoutProblem}</AlertDescription>
        </Alert>
      )}

      {/* 未読み込みのときは枠だけを描き、一覧は「—」にする */}
      <AnchoredCard anchor={WEAPON_LIST_ANCHORS.weapons} searchLabel="武器袋" className="gap-2">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <ScopeAnchorLink />
            武器袋
            <span className="text-muted-foreground text-sm font-normal">
              {filled} / {WEAPON_BAG_COUNT} 本
            </span>
            <InfoTip offset={WEAPON_BAG_OFFSET} />
          </CardTitle>
          <CardDescription>行を押すと編集欄を開きます。</CardDescription>
        </CardHeader>
        <CardContent>
          {view ? (
            <CompactWeaponList
              key={k}
              weapons={view.weapons}
              update={(i) => (mutate) => update((b) => mutate(b, weaponBagOffset(i)))}
            />
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
        </CardContent>
      </AnchoredCard>

      {/* ❓ 用途不明の領域。🟢 レコードの先頭は完成武器ID（既存エディタ [TS] の位置より 6 B 後ろ） */}
      <p className="text-muted-foreground text-xs">
        用途が分かっていない領域は変更しません。空き枠は編集できません（武器を新しく作る機能はありません）。
      </p>
    </div>
  );
}
