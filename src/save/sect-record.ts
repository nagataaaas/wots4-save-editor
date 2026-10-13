// 🟢 流派・俺流の先頭8 B（chunks/styles・custom-style）、書の24 B枠（chunks/sect-scrolls）。
import { readI16, writeI16 } from './binary'

export const MASTERY_MAX = 10000
export const RANK_MAX = 5
export const I16_MAX = 0x7fff
export const SECT_VALUE_RELS = { mastery: 2, rank: 4, kills: 6 } as const
export type SectValues = { mastery: number; rank: number; kills: number }
export const sectValueOffset = (base: number, key: keyof SectValues) => base + SECT_VALUE_RELS[key]
export function validateSectValues(v: SectValues): string | null {
  if (!Number.isInteger(v.mastery) || v.mastery < 0 || v.mastery > MASTERY_MAX) return `修練度は 0〜${MASTERY_MAX} です`
  if (!Number.isInteger(v.rank) || v.rank < 0 || v.rank > RANK_MAX) return '段が正しくありません'
  if (!Number.isInteger(v.kills) || v.kills < 0 || v.kills > I16_MAX) return `倒した数は 0〜${I16_MAX} です`
  return null
}
export const sectRecordCodec = {
  read(bytes: Uint8Array, base: number) {
    return { id: readI16(bytes, base), mastery: readI16(bytes, sectValueOffset(base, 'mastery')),
      rank: readI16(bytes, sectValueOffset(base, 'rank')), kills: readI16(bytes, sectValueOffset(base, 'kills')) }
  },
  /** 修練度・段・倒した数を書く。値はここで検証し、範囲外ならどのバイトも書かない */
  writeValues(bytes: Uint8Array, base: number, values: SectValues) {
    const problem = validateSectValues(values)
    if (problem) throw new RangeError(problem)
    for (const key of Object.keys(SECT_VALUE_RELS) as (keyof SectValues)[]) writeI16(bytes, sectValueOffset(base, key), values[key])
  },
}
export const SCROLL_SLOT_BYTES = 24
export const scrollSlotCodec = {
  read(bytes: Uint8Array, offset: number) { return { scrollNo: readI16(bytes, offset), customId: readI16(bytes, offset + 2) } },
  clear(bytes: Uint8Array, offset: number) {
    // 範囲を先に検査してから既存の枠だけを上書きする。
    readI16(bytes, offset + SCROLL_SLOT_BYTES - 2)
    bytes.fill(0, offset, offset + SCROLL_SLOT_BYTES)
    writeI16(bytes, offset, -1)
    writeI16(bytes, offset + 2, -1)
  },
  writeCustom(bytes: Uint8Array, offset: number, id: number) {
    if (!Number.isInteger(id) || id < 0 || id > I16_MAX) throw new RangeError('流派が範囲外です')
    scrollSlotCodec.clear(bytes, offset)
    writeI16(bytes, offset + 2, id)
  },
}
