import type { ReactNode } from "react";
import { charmSummary, weaponDisplayName, type NumberKey, type WeaponView } from "@/save/weapon";
import { WeaponImage } from "./weapon-rows";

/** 帯刀の一覧（閉じていても見える部分）の能力値と画像。ゲームの武器の画面に寄せた見た目 */
/** weapon が null ならセーブ未読み込み。同じ枠に「—」を並べる */
export function WeaponPanel({ weapon }: { weapon: WeaponView | null }) {
  // ゲームと同じく桁区切りなし。耐久・質は現在値 / 最大値で並べる。
  const num = (key: NumberKey) => (weapon ? String(weapon.numbers[key].value) : "—");
  const pair = (current: NumberKey, maximum: NumberKey) => (
    <span className="weapon-preview-pair" aria-label={`${num(current)}/${num(maximum)}`}>
      <span>{num(current)}</span><span>/</span><span>{num(maximum)}</span>
    </span>
  );
  const stat = (label: string, value: ReactNode) => (
    <div className="weapon-preview-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
  const charms: string[] = weapon ? charmSummary(weapon.charms.value) : ["—", "—", "—"];
  while (charms.length < 3) charms.push("---");
  return (
    <div className="weapon-preview">
      <div className="weapon-preview-layout">
        <div className="weapon-preview-details">
          <div className="weapon-preview-name">
            {weapon?.title.value != null && weapon.title.label && (
              <span>{weapon.title.label}</span>
            )}
            <span>{weapon ? weaponDisplayName(weapon) : "—"}</span>
          </div>
          <div className="weapon-preview-rule" aria-hidden="true">
            <span />
          </div>
          <dl className="weapon-preview-stats">
            {stat("攻撃力", num("attack"))}
            {stat("耐久度", pair("durability", "durabilityMax"))}
            {stat("斬殺数", num("kills"))}
            {stat("質", pair("quality", "qualityMax"))}
          </dl>
          <ul className="weapon-preview-charms" aria-label="魅力">
            {charms.map((label, slot) => (
              <li key={slot} aria-label={`魅力 ${slot + 1}：${label === "---" ? "なし" : label}`}>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
        {weapon ? (
          <WeaponImage key={weapon.completeByParts} id={weapon.completeByParts} />
        ) : (
          <div className="weapon-preview-image weapon-preview-image-empty">
            <div className="text-wots-label flex size-full items-center justify-center p-2 font-serif text-xs">—</div>
          </div>
        )}
      </div>
    </div>
  );
}
