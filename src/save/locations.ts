// 開始地点（現在地）の値。出典：docs/save_format/datatable/place/start-location.csv（生成物 master/dataset/start-location.ts）、
// chunks/date-location（[W-PC] ✅）。位置 0x13 の u8（✅ U-7 解決済み）。
// クラッシュが報告されている値（00, 13, 24, 28, 29, 2C〜C4）は CSV の crash 列。0xC5 以降は未調査で表にない。
// 注意書きの出典：docs/save_format/README.md §6
import { defineLocalized } from './flags/byte-flag'
import { START_LOCATION_TABLE } from './master/dataset/start-location'

export type Location = {
  value: number
  /** 今の言語の名前（読むたびに今の言語で返す） */
  label: string
  /** クラッシュが報告されている値。選択肢に出さない（AGENTS.md） */
  crash?: boolean
  /** 選べるが注意が必要な値（今の言語） */
  warning?: string
}

type Row = (typeof START_LOCATION_TABLE)[keyof typeof START_LOCATION_TABLE]

const LOCATIONS: readonly Location[] = Object.values(START_LOCATION_TABLE).map((r: Row) => {
  const out = { value: r.id_dec } as Location
  if (r.crash === 1) {
    out.crash = true
    return defineLocalized(out, 'label', { ja: 'クラッシュ', en: 'Crash' })
  }
  defineLocalized(out, 'label', { ja: r.name_ja, en: r.name_en })
  if (r.warning_ja !== '') defineLocalized(out, 'warning', { ja: r.warning_ja, en: r.warning_en })
  return out
})

const BY_VALUE = new Map(LOCATIONS.map((l) => [l.value, l]))

/** 表にない値（0xC5 以降、未調査）は undefined */
export function findLocation(value: number): Location | undefined {
  return BY_VALUE.get(value)
}

/** 選択肢に出す値（クラッシュが報告されている値を除く） */
export const selectableLocations: Location[] = LOCATIONS.filter((l) => !l.crash)
