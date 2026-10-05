import {
  Anvil,
  BatteryCharging,
  Clover,
  Coins,
  HandFist,
  HeartCrack,
  Moon,
  Shield,
  ShieldCheck,
  Skull,
  Sun,
  Swords,
  Weight,
  Wind,
  type LucideIcon,
} from 'lucide-react'

/** 魅力ID → 効果を表すアイコン */
const CHARM_ICONS: Record<number, LucideIcon> = {
  0: Clover, // 天運：命が0でも耐える
  1: Moon, // 暗刃：夜に攻撃力アップ
  2: Sun, // 明刃：昼に攻撃力アップ
  3: Coins, // 銭呼：お金袋の獲得金額
  4: BatteryCharging, // 活復：静止で活力回復
  5: Wind, // 疾風：崩されてもステップで抜ける
  6: HeartCrack, // 背水：命が少ないほど強い
  7: HandFist, // 投抜：つかみ（投げ）を無効化
  8: Shield, // 頑健：耐久度が減りにくい
  9: Weight, // 重撃：技の威力アップ
}

export function charmIcon(id: number): LucideIcon | null {
  return CHARM_ICONS[id] ?? null
}

/** 銘の番号 → 系統ごとのアイコン（番号は TITLES と同じ。§5.4） */
export function titleIcon(no: number): LucideIcon | null {
  if (no < 0 || no > 0x13) return null
  if (no <= 0x04) return Skull // 人斬り〜猟奇守：斬殺数で攻撃力アップ
  if (no <= 0x09) return ShieldCheck // 石頭〜不壊：耐久度が減りにくい
  if (no <= 0x0e) return Anvil // 一輝〜悟道：抽出時の鉄ポイント
  return Swords // 剃刀〜散華：つま斬り時の攻撃力
}
