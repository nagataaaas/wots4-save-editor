import { InfoTip } from "@/components/info-tip";
import { CardContent } from "@/components/ui/card";
import { AnchoredCard } from "@/components/anchored-card";
import { WEAPON_LIST_ANCHORS } from "@/features/weapon/anchors";
import { tr } from "@/lib/i18n";
import { useSave } from "@/lib/save-context";
import { useSaveView } from "@/lib/use-save-view";
import { PageBanner } from "@/components/page-banner";
import { WEAPON_BAG_COUNT, WEAPON_BAG_OFFSET, readWeaponBag } from "@/save/weapon-bag";
import { CompactWeaponList } from "@/features/weapon/compact-weapon-list";
import { WeaponIndexFields } from "@/features/weapon/weapon-index-fields";

/** 武器袋の10本。帯刀と同じ欄を、細い一覧で編集する */
export function WeaponBagPage() {
  const { save } = useSave();
  const { view, error: readError, problem } = useSaveView(readWeaponBag);

  const k = save?.loadId ?? 0;
  const filled = view ? view.weapons.filter((w) => !w.empty).length : "—";

  return (
    <div className="flex flex-col gap-4">
      <PageBanner error={readError} problem={problem} />

      {/* 未読み込みのときは枠だけを描き、一覧は「—」にする */}
      <AnchoredCard
        anchor={WEAPON_LIST_ANCHORS.weapons}
        title={tr({ ja: "武器袋", en: "Weapon sack" })}
        extra={
          <>
            <span className="text-muted-foreground text-sm font-normal">
              {tr({ ja: `${filled} / ${WEAPON_BAG_COUNT} 本`, en: `${filled} / ${WEAPON_BAG_COUNT}` })}
            </span>
            <InfoTip offset={WEAPON_BAG_OFFSET} />
          </>
        }
        description={tr({ ja: "行を押すと編集欄を開きます。", en: "Click a row to open its editor." })}
        className="gap-2"
      >
        <CardContent>
          <WeaponIndexFields />
          {view ? (
            <CompactWeaponList key={k} weapons={view.weapons} />
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
        </CardContent>
      </AnchoredCard>

      {/* ❓ 用途不明の領域。🟢 レコードの先頭は完成武器ID（既存エディタ [TS] の位置より 6 B 後ろ） */}
      <p className="text-muted-foreground text-xs">
        {tr({
          ja: "用途が分かっていない領域は変更しません。空き枠は編集できません（武器を新しく作る機能はありません）。",
          en: "Areas whose purpose is not known are left unchanged. Empty slots cannot be edited (there is no feature for creating new weapons).",
        })}
      </p>
    </div>
  );
}
