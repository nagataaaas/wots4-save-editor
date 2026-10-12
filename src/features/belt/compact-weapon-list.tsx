import { type ReactNode } from "react";
import { InfoTip } from "@/components/info-tip";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AnchorScope, useAnchoredOpen } from "@/lib/navigation-context";
import { charmLabel, type WeaponView } from "@/save/weapon";
import { WEAPON_ANCHORS } from "./anchors";
import { WeaponEditor } from "./weapon-editor";
import { Chevron, WeaponImage } from "./weapon-rows";
import { COLLAPSIBLE_ANIMATION, isOnButton, type WeaponUpdate } from "./weapon-ui";

// 武器袋・刀箪笥のように件数の多い武器の一覧。1枠＝1行の細い表示で、開くと帯刀と同じ編集欄を出す。

/** 桁数ぶんの幅を取った数値（右寄せ）。武器ごとに列がずれないようにする。桁があふれたらはみ出して見せる */
function Num({ value, digits }: { value: number; digits: number }) {
  return (
    <span className="inline-block text-right whitespace-nowrap" style={{ minWidth: `${digits}ch` }}>
      {value}
    </span>
  );
}

/** 閉じた行に出す能力値（ゲームと同じく桁区切りなし）。攻撃力・斬殺数は4桁、耐久は4桁/4桁、質は2桁/2桁の幅 */
function Stats({ weapon }: { weapon: WeaponView }) {
  const n = (key: keyof WeaponView["numbers"]) => weapon.numbers[key].value;
  const charms = weapon.charms.value.filter((c): c is number => c !== null).map((c) => charmLabel(c) ?? "不明");
  return (
    <span className="text-muted-foreground hidden shrink-0 items-center gap-3 font-mono text-xs tabular-nums sm:flex">
      <span>攻 <Num value={n("attack")} digits={4} /></span>
      <span>耐 <Num value={n("durability")} digits={4} />/<Num value={n("durabilityMax")} digits={4} /></span>
      <span>質 <Num value={n("quality")} digits={2} />/<Num value={n("qualityMax")} digits={2} /></span>
      <span className="hidden md:inline">斬 <Num value={n("kills")} digits={4} /></span>
      <span className="hidden w-36 truncate font-sans lg:inline">{charms.length ? charms.join("・") : "---"}</span>
    </span>
  );
}

function CompactWeaponRow({
  index,
  weapon,
  update,
  badges,
}: {
  index: number;
  weapon: WeaponView;
  update: WeaponUpdate;
  badges?: ReactNode;
}) {
  const { id, open, setOpen } = useAnchoredOpen(WEAPON_ANCHORS.weapon(index));
  const no = <span className="text-muted-foreground w-7 shrink-0 text-right text-xs tabular-nums">{index + 1}</span>;
  const offsetTip = <InfoTip offset={weapon.offset} />;

  if (weapon.empty) {
    return (
      <li id={id} className="text-muted-foreground flex scroll-mt-4 items-center gap-2 border-b px-2 py-1 text-xs last:border-b-0">
        <span className="size-4 shrink-0" aria-hidden />
        {no}
        <span>空き</span>
        {badges}
        {offsetTip}
      </li>
    );
  }

  const name = weapon.nameHidden.value ? "*****" : weapon.name.value || "（名前なし）";
  return (
    <Collapsible open={open} onOpenChange={setOpen} render={<li id={id} className="scroll-mt-4 border-b last:border-b-0" />}>
      <div
        className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 px-2 py-1"
        onClick={(e) => {
          if (!isOnButton(e)) setOpen(!open);
        }}
      >
        <CollapsibleTrigger className="group flex shrink-0 items-center gap-2" aria-label={`${index + 1}：${name} を編集`}>
          <Chevron />
          {no}
        </CollapsibleTrigger>
        <WeaponImage key={weapon.completeByParts} id={weapon.completeByParts} small />
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5 text-sm">
          {weapon.title.value !== null && weapon.title.label && (
            <span className="text-muted-foreground shrink-0 text-xs">{weapon.title.label}</span>
          )}
          <span className="truncate font-medium">{name}</span>
          {/* バッジは名前の側に置き、右の能力値の列が武器ごとにずれないようにする */}
          {weapon.nameHidden.value && <Badge variant="outline">名前を隠す</Badge>}
          {badges}
        </span>
        <Stats weapon={weapon} />
        {offsetTip}
      </div>
      {weapon.problem && <p className="text-destructive px-2 pb-1 pl-17 text-xs">読み取り専用：{weapon.problem}</p>}
      {/* 閉じているあいだは中身を描画しない（Base UI の Panel の既定）ので、200枠でも重くならない */}
      <CollapsibleContent className={COLLAPSIBLE_ANIMATION}>
        <div className="px-2 pt-4 pb-6 sm:pl-17">
          <AnchorScope.Provider value={id}>
            <WeaponEditor weapon={weapon} base={weapon.offset} update={update} sectionsOpen={false} />
          </AnchorScope.Provider>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * 武器の細い一覧。indices の枠だけを並べる（省略時はすべて）。
 * update(i) は i 枠目のレコードの先頭を渡して書き込む関数。badges(i) は行の末尾に足すバッジ
 */
export function CompactWeaponList({
  weapons,
  indices,
  update,
  badges,
}: {
  weapons: readonly WeaponView[];
  indices?: readonly number[];
  update: (index: number) => WeaponUpdate;
  badges?: (index: number) => ReactNode;
}) {
  const list = indices ?? weapons.map((_, i) => i);
  if (list.length === 0) return <p className="text-muted-foreground px-2 py-1 text-sm">武器はありません。</p>;
  return (
    <ul className="flex flex-col">
      {list.map((i) => (
        <CompactWeaponRow key={i} index={i} weapon={weapons[i]} update={update(i)} badges={badges?.(i)} />
      ))}
    </ul>
  );
}
