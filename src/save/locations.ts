// 開始地点（現在地）の値。出典：docs/save_format/datatable/place/start-location.csv、chunks/date-location（[W-PC] ✅）。
// 位置 0x13 の u8（✅ U-7 解決済み）。

export type Location = {
  value: number
  label: string
  /** クラッシュが報告されている値。選択肢に出さない（AGENTS.md） */
  crash?: boolean
  /** 選べるが注意が必要な値 */
  warning?: string
}

const named: Location[] = [
  { value: 0x00, label: 'クラッシュ', crash: true },
  { value: 0x01, label: '港（写真家の前）' },
  { value: 0x02, label: '黒船・甲板' },
  { value: 0x03, label: '居留地' },
  { value: 0x04, label: '神社' },
  { value: 0x05, label: '黒船・船内' },
  { value: 0x06, label: '町' },
  { value: 0x07, label: '町・居酒屋' },
  { value: 0x08, label: '町・道場' },
  { value: 0x09, label: '町・語学所' },
  { value: 0x0a, label: '町・賭場' },
  { value: 0x0b, label: '居留地・領事館内' },
  { value: 0x0c, label: '居留地・病院' },
  { value: 0x0d, label: '大通り' },
  { value: 0x0e, label: '大通り・呉服屋' },
  { value: 0x0f, label: '大通り・旅籠' },
  { value: 0x10, label: '街道' },
  { value: 0x11, label: '大通り・釜茹で会場' },
  { value: 0x12, label: '代官所・門の外' },
  { value: 0x13, label: 'クラッシュ', crash: true },
  // 警告の出典：docs/save_format/README.md §6
  { value: 0x14, label: '代官所・牢屋', warning: 'ここでセーブしたデータはラスボス戦の後に落ちる' },
  { value: 0x15, label: '墓場' },
  { value: 0x16, label: '港・寿司屋' },
  { value: 0x17, label: '港・カジノ' },
  { value: 0x18, label: '大通り・レストラン' },
  ...[0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f].map((value) => ({
    value,
    label: '地面のない空間',
    warning: '地図移動で脱出できる',
  })),
  { value: 0x20, label: '港・そば屋' },
  { value: 0x21, label: '町・めし屋' },
  { value: 0x22, label: '代官所・門の中（裏口）' },
  { value: 0x23, label: '代官所内', warning: 'フラグで場所が変わる' },
  { value: 0x24, label: 'クラッシュ', crash: true },
  { value: 0x25, label: '代官所・拷問部屋' },
  { value: 0x26, label: '壊れた黒船・甲板' },
  { value: 0x27, label: '港（騒乱／希望の光用）' },
  { value: 0x28, label: 'クラッシュ', crash: true },
  { value: 0x29, label: 'クラッシュ', crash: true },
  { value: 0x2a, label: '町・旅籠の夜這い部屋' },
  { value: 0x2b, label: '居留地' },
]

/** 0x2C〜0xC4 はクラッシュが報告されている。0xC5 以降は未調査 */
export function findLocation(value: number): Location | undefined {
  const hit = named.find((l) => l.value === value)
  if (hit) return hit
  if (value >= 0x2c && value <= 0xc4) return { value, label: 'クラッシュ', crash: true }
  return undefined
}

/** 選択肢に出す値（クラッシュが報告されている値を除く） */
export const selectableLocations: Location[] = named.filter((l) => !l.crash)
