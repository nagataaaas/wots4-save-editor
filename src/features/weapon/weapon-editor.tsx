import { createElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AnchorLink, ToggleChevron } from "@/components/anchor-link";
import { DisclosureContent } from "@/components/disclosure-content";
import { InfoTip } from "@/components/info-tip";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { tr } from "@/lib/i18n";
import { useAnchoredOpen } from "@/lib/navigation-context";
import { SearchScope } from "@/lib/search-context";
import { useSearchBox } from "@/lib/search-hooks";
import type { WeaponView } from "@/save/weapon";
import { WEAPON_EDITOR_ANCHORS } from "./anchors";
import { charmEffects, titleEffect } from "@/save/weapon-effects";
import { charmIcon, titleIcon } from "./effect-icons";
import {
  CompleteWeaponRow,
  WeaponIdRow,
  WeaponNameHiddenRow,
  WeaponNameRow,
  WeaponNumberRow,
  WeaponPartRow,
  WeaponSheathRow,
  WeaponTitleRow,
  WeaponTypeRow,
  type WeaponFieldProps,
} from "./weapon-fields";
import { weaponFieldOffset } from "./weapon-ui";
import { CharmEditor } from "./charm-editor";

// 武器1件分の編集欄（帯刀・武器袋・刀箪笥で共通。開いたときの中身）。

/** 効果の行の先頭に付けるアイコン */
function EffectIcon({ icon }: { icon: LucideIcon | null }) {
  return icon
    ? createElement(icon, { className: "mt-0.5 size-4 shrink-0", "aria-hidden": true })
    : null;
}

/** 銘・魅力の下に出す「今の効果」の枠。効果は [W] 鍛冶屋ページ（p20）の記載で、確定として扱う */
function EffectBox({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/40 flex flex-col gap-1 rounded-md border p-3 text-sm">
      <span className="text-muted-foreground text-xs font-medium">{tr({ ja: "今の効果", en: "Current effect" })}</span>
      {children}
    </div>
  );
}

/** 武器の編集欄の中の、開閉できるひとまとまり。anchor はリンク先にするときの名前（useAnchoredOpen） */
function Section({
  anchor,
  title,
  defaultOpen,
  children,
}: {
  anchor: string;
  title: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const { id, ref, open, setOpen } = useAnchoredOpen(anchor, defaultOpen);
  useSearchBox(id, title);
  return (
    <Collapsible ref={ref} id={id} open={open} onOpenChange={setOpen} className="flex scroll-mt-4 flex-col">
      <div className="text-muted-foreground flex items-center gap-1 border-b pb-1 text-sm font-medium">
        <ToggleChevron open={open} onToggle={() => setOpen(!open)} />
        <AnchorLink id={id} />
        <CollapsibleTrigger className="hover:text-foreground flex-1 text-left">{title}</CollapsibleTrigger>
      </div>
      {/* overflow-hidden で入力欄のフォーカスリングが切れないよう、-mx-1 px-1 で少し広げる */}
      <DisclosureContent id={id} searchLabel={title} className="-mx-1 px-1">
        <div className="flex flex-col gap-4 pt-4 pb-1">{children}</div>
      </DisclosureContent>
    </Collapsible>
  );
}

/** 現在値と最大値のように、2つで1組の数値をまとめる枠 */
function NumberPair({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SearchScope title={title} className="flex flex-col gap-3 rounded-md border p-3">
      <span className="text-sm font-medium">{title}</span>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </SearchScope>
  );
}

/**
 * 武器1件分の編集欄。weapon が null ならセーブ未読み込み。offset はレコードの先頭で、各欄が丸ハテナと書き込みに使う。
 * sectionsOpen は「攻撃力・耐久・質」などのまとまりを最初から開いておくか（武器袋・刀箪笥は閉じる。ユーザー判断 2026-10-09）
 */
export function WeaponEditor({
  weapon,
  offset,
  sectionsOpen = true,
}: {
  weapon: WeaponView | null;
  /** 省くのは位置の決まらない欄（索引用）。丸ハテナに位置を出さない */
  offset?: number;
  sectionsOpen?: boolean;
}) {
  const p: WeaponFieldProps = { weapon, offset };
  const charms = weapon?.charms ?? null;
  const effects = charms ? charmEffects(charms.value) : [];
  const title = titleEffect(weapon?.title.value ?? null);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <WeaponNameRow {...p} />
        <WeaponIdRow {...p} />
        <WeaponTypeRow {...p} />
        <div className="sm:col-span-3"><WeaponNameHiddenRow {...p} /></div>
      </div>

      <CompleteWeaponRow {...p} />

      <div className="grid gap-4 sm:grid-cols-3">
        {/* 鞘は刃に合わせて決まるので、刃のすぐ下に置く */}
        <div className="flex flex-col gap-4">
          <WeaponPartRow {...p} kind="blade" />
          <WeaponSheathRow {...p} />
        </div>
        <WeaponPartRow {...p} kind="guard" />
        <WeaponPartRow {...p} kind="grip" />
      </div>

      <Section
        anchor={WEAPON_EDITOR_ANCHORS.numbers}
        title={tr({ ja: "攻撃力・耐久・質", en: "Strength, durability & degradation" })}
        defaultOpen={sectionsOpen}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><WeaponNumberRow {...p} field="attack" /></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <NumberPair title={tr({ ja: "耐久", en: "Durability" })}>
            <WeaponNumberRow {...p} field="durability" label={tr({ ja: "現在", en: "Current" })} />
            <WeaponNumberRow {...p} field="durabilityMax" label={tr({ ja: "最大", en: "Max" })} />
          </NumberPair>
          <NumberPair title={tr({ ja: "質", en: "Degradation" })}>
            <WeaponNumberRow {...p} field="quality" label={tr({ ja: "現在", en: "Current" })} />
            <WeaponNumberRow {...p} field="qualityMax" label={tr({ ja: "最大", en: "Max" })} />
          </NumberPair>
        </div>
      </Section>

      <Section
        anchor={WEAPON_EDITOR_ANCHORS.titleCharms}
        title={tr({ ja: "銘・魅力", en: "Signature & charms" })}
        defaultOpen={sectionsOpen}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <WeaponTitleRow {...p} />
            {!weapon && (
              <EffectBox>
                <p className="text-muted-foreground">—</p>
              </EffectBox>
            )}
            {weapon && !weapon.title.problem && (
              <EffectBox>
                {title ? (
                  <>
                    <p className="flex gap-2">
                      <EffectIcon icon={titleIcon(weapon.title.value ?? -1)} />
                      {title.effect}
                    </p>
                    {title.note && <p className="text-muted-foreground text-xs">{title.note}</p>}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    {weapon.title.value === null
                      ? tr({ ja: "銘なし", en: "No signature" })
                      : tr({ ja: "効果は不明", en: "Effect unknown" })}
                  </p>
                )}
              </EffectBox>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{tr({ ja: "魅力", en: "Charms" })}</span>
            <InfoTip offset={weaponFieldOffset(offset, "charms")} />
          </div>
          <CharmEditor weapon={weapon} offset={offset} />
          {!weapon && (
            <EffectBox>
              <p className="text-muted-foreground">—</p>
            </EffectBox>
          )}
          {weapon && !charms?.problem && (
            <EffectBox>
              {effects.length === 0 ? (
                <p className="text-muted-foreground">{tr({ ja: "魅力なし", en: "No charms" })}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {effects.map((e) => (
                    <li key={e.id} className="flex gap-2">
                      <EffectIcon icon={charmIcon(e.id)} />
                      <span>
                        <span className="font-medium">
                          {e.label} ×{e.count}
                        </span>
                        {tr({ ja: "：", en: ": " })}
                        {e.summary}
                        {e.amount && (
                          <span className="font-medium">{tr({ ja: `（${e.amount}）`, en: ` (${e.amount})` })}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </EffectBox>
          )}
        </div>
      </Section>

      <Section
        anchor={WEAPON_EDITOR_ANCHORS.kills}
        title={tr({ ja: "斬殺数・つま斬り数", en: "Kills & Spring Harvest kills" })}
        defaultOpen={sectionsOpen}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <WeaponNumberRow {...p} field="kills" />
          <WeaponNumberRow {...p} field="tsumaKills" />
        </div>
      </Section>

      <Section
        anchor={WEAPON_EDITOR_ANCHORS.durability}
        title={tr({ ja: "耐久回復の累積値・手に持っていた時間", en: "Total durability restored & time held" })}
        defaultOpen={sectionsOpen}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <WeaponNumberRow {...p} field="durabilityRecovery" />
          <WeaponNumberRow {...p} field="heldTime" />
        </div>
      </Section>
    </div>
  );
}
