import { FactionExitCard, CharactersCard, PeopleCard, NpcFlagsCard } from "./npc-cards";

/**
 * 世界 / NPC：勢力の退場、人物の状態、町の人の生死、NPCイベントフラグ（ユーザー判断 2026-10-11）
 * 確度：どれもセーブの差分から推定（docs: factions・characters・townsfolk・best-route）。
 * 勢力の退場は ✅ 書き換えの反映を確認。そのほかは ❓ 要ゲーム内確認
 */
export function NpcPage() {
  return (
    <div className="flex flex-col gap-4">
      <FactionExitCard />
      <CharactersCard />
      <PeopleCard />
      <NpcFlagsCard />
    </div>
  );
}
