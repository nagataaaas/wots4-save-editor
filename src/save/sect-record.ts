// 🟢 流派・俺流の先頭8 B（chunks/styles・custom-style）、書の24 B枠（chunks/sect-scrolls）。
import { tr } from '@/lib/i18n'
import { NUM_TYPE_RANGE, readI16, recordCodec, writeU16 } from './binary'

export const MASTERY_MAX = 10000
export const RANK_MAX = 5
export const I16_MAX = NUM_TYPE_RANGE.i16.max
export type SectValues = { mastery: number; rank: number; kills: number }

/** 🟢 流派・俺流のレコードの先頭8 B：+0 流派 ID、+2 修練度、+4 段、+6 倒した数（すべて i16） */
const sectRecordFields = recordCodec({
  id: { rel: 0, type: 'i16' },
  mastery: { rel: 2, type: 'i16' },
  rank: { rel: 4, type: 'i16' },
  kills: { rel: 6, type: 'i16' },
})
const SECT_VALUE_KEYS = ['mastery', 'rank', 'kills'] as const satisfies readonly (keyof SectValues)[]

export const sectValueOffset = (base: number, key: keyof SectValues) => sectRecordFields.offset(base, key)

export function validateSectValues(v: SectValues): string | null {
  if (!Number.isInteger(v.mastery) || v.mastery < 0 || v.mastery > MASTERY_MAX)
    return tr({ ja: `修練度は 0〜${MASTERY_MAX} です`, en: `Mastery must be 0–${MASTERY_MAX}` })
  if (!Number.isInteger(v.rank) || v.rank < 0 || v.rank > RANK_MAX) return tr({ ja: '段が正しくありません', en: 'Invalid rank' })
  if (!Number.isInteger(v.kills) || v.kills < 0 || v.kills > I16_MAX)
    return tr({ ja: `倒した数は 0〜${I16_MAX} です`, en: `Kills must be 0–${I16_MAX}` })
  return null
}

export const sectRecordCodec = {
  read(bytes: Uint8Array, base: number) {
    return sectRecordFields.read(bytes, base)
  },
  /** 修練度・段・倒した数を書く。値はここで検証し、範囲外ならどのバイトも書かない */
  writeValues(bytes: Uint8Array, base: number, values: SectValues) {
    const problem = validateSectValues(values)
    if (problem) throw new RangeError(problem)
    for (const key of SECT_VALUE_KEYS) sectRecordFields.writeField(bytes, base, key, values[key])
  },
}

export const SCROLL_SLOT_BYTES = 24
/** 🟢 書の枠：+0 流派の書の番号、+2 俺流の流派 ID（どちらも i16、−1 はなし） */
const scrollSlotFields = recordCodec({
  scrollNo: { rel: 0, type: 'i16' },
  customId: { rel: 2, type: 'i16' },
})
/** 🟢 書の枠の +0x04〜+0x17 にある俺流の名前の写し（10 文字。終端の NUL はない） */
const SCROLL_NAME_REL = 4
const SCROLL_NAME_CHARS = 10

export const scrollSlotCodec = {
  read(bytes: Uint8Array, offset: number) {
    return scrollSlotFields.read(bytes, offset)
  },
  clear(bytes: Uint8Array, offset: number) {
    // 範囲を先に検査してから既存の枠だけを上書きする（枠の最後の 2 B が読めれば枠全体がファイルに収まる）。
    readI16(bytes, offset + SCROLL_SLOT_BYTES - 2)
    bytes.fill(0, offset, offset + SCROLL_SLOT_BYTES)
    scrollSlotFields.writeField(bytes, offset, 'scrollNo', -1)
    scrollSlotFields.writeField(bytes, offset, 'customId', -1)
  },
  writeCustom(bytes: Uint8Array, offset: number, id: number) {
    if (!Number.isInteger(id) || id < 0 || id > I16_MAX) throw new RangeError(tr({ ja: '流派が範囲外です', en: 'Style is out of range' }))
    scrollSlotCodec.clear(bytes, offset)
    scrollSlotFields.writeField(bytes, offset, 'customId', id)
  },
  /**
   * 名前の写しを書く（先頭 10 文字。残りは 0）。10 文字ちょうどのときは終端の NUL を置かないので、
   * 終端を残す writeUtf16Fixed は使えない
   */
  writeNameCopy(bytes: Uint8Array, offset: number, name: string) {
    for (let i = 0; i < SCROLL_NAME_CHARS; i++) {
      writeU16(bytes, offset + SCROLL_NAME_REL + 2 * i, i < name.length ? name.charCodeAt(i) : 0)
    }
  },
}
