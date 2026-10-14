import { CycleCard } from "./cycle-card";
import { DateCard } from "./date-card";
import { FacilityFlagsCard, GateFlagsCard } from "./amihama-flags";

/**
 * 世界 / 阿弥浜：難易度・治安・周回、段階・日数・時間帯、施設、門・柵（ユーザー判断 2026-10-11）
 * 確度：どれもセーブの差分から推定（docs: difficulty・date-location・gates・facilities）。
 * 難易度、新しい周回を始める書き込み、日数・時間帯、治安は ✅ 書き換えの反映を確認。そのほかは ❓ 要ゲーム内確認
 */
export function AmihamaPage() {
  return (
    <div className="flex flex-col gap-4">
      <CycleCard />
      <DateCard />
      <FacilityFlagsCard />
      <GateFlagsCard />
    </div>
  );
}
