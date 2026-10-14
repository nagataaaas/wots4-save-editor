// 完成武器の画像。docs/save_format/datatable/weapon/complete.csv の image_url から生成した dataset/complete.ts を使う（表を二重に持たない）。
import { COMPLETE_TABLE } from "./dataset/complete";
import { lookup } from "./lookup";

/** 完成武器ID の画像の URL。画像のない完成武器・表にない ID は null */
export function weaponImageUrl(completeId: number): string | null {
  return lookup(COMPLETE_TABLE, completeId)?.image_url || null;
}
