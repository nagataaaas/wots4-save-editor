// 主人公の見た目のレコード（0x3AAD4〜0x3AB5B）のうち、人物・髪の色・性別・部品。出典：docs/save_format/chunks/appearance「主人公の見た目のレコード」。
//
// - 0x3AAD4 u16 人物の番号 🟢。人物を指している間は、表示は部品・髪の色ともその人物から作られる（✅ [U] 2026-10-08）。
//   部品や髪の色を変えるときは FFFF（個別に設定）にする ✅ [U]
// - 0x3AAD6 u16 人物ごとに決まる値 🔶（U-19）。人物を選ぶときだけ書く
// - 0x3AADA u8 髪の色 ✅位置 [U]。0〜4 ✅ [U]、5〜9 🔶（U-19）
// - 0x3AADC u8 性別（体の種類）0＝男・1＝女 🔶、2〜4 🟢。単独の書き込みは上級者モードだけ（ユーザー判断 2026-10-08）
// - 個別に設定のとき上半身・下半身が FFFF だとゲームでエラーになる ✅ [U]。部品 53 の上半身はクラッシュする ✅ [U]
// - 0x3AAE4 + 12k：部品の組。+0 部品の番号 u16、+2 ❓（書かない）、+4〜+B モデルの値 u16 × 4 🟢
//   顔・髪型・小物4種は書き込みの反映を確認 ✅ [U]。上半身・下半身・足元・k＝4 は要ゲーム内確認（U-19）
// ❓ U-1：固定オフセットを採用（ユーザー判断 2026-10-07）。ファイルサイズを検証する。
import { readU16, readU8, writeF32, writeU16, writeU8, readF32 } from './binary'
import { checkLayout } from './hero'
import { BODY_KINDS, findPart, findPerson, PART_KINDS, PERSONS, type Gender, type PartKind } from './master/appearance-parts'

export const APPEARANCE_PARTS_OFFSETS = {
  person: 0x3aad4,
  secondId: 0x3aad6,
  hairColor: 0x3aada,
  gender: 0x3aadc,
  height: 0x3aae0,
  parts: 0x3aae4,
} as const

/** 部品の組の長さ */
export const PART_RECORD_SIZE = 12

/** 0x3AAD4 の「個別に設定」 */
export const PERSON_CUSTOM = 0xffff

export function partOffset(kind: PartKind): number {
  return APPEARANCE_PARTS_OFFSETS.parts + PART_RECORD_SIZE * PART_KINDS.indexOf(kind)
}

/** 書き込みの反映をゲーム内で確認した部品（✅ [U] 2026-10-08）。ほかは要ゲーム内確認（U-19） */
export const PART_WRITE_CONFIRMED: Readonly<Record<PartKind, boolean>> = {
  upper: false,
  lower: false,
  face: true,
  hair: true,
  body: false,
  feet: false,
  gauntlet: true,
  leggings: true,
  apron: true,
  cape: true,
}

/**
 * 髪の色の名前。値＝主人公設定の一覧の左からの位置（1 起点）。
 * 0＝なし・1＝金髪・2＝茶髪・3＝黒・4＝銀髪 ✅ [U] 2026-10-08、5＝赤 🔶 [U]（「たぶん赤」）。
 * 6〜9 は特典で選べる色の並び（赤の後ろ）からの推定 🔶（U-19）。10 以上は色がつかない ✅ [U]
 */
export const HAIR_COLOR_NAMES: Readonly<Record<number, string>> = {
  0: 'なし',
  1: '金髪',
  2: '茶髪',
  3: '黒',
  4: '銀髪',
  5: '赤',
  6: '黄緑',
  7: 'ピンク',
  8: '藍',
  9: '紫',
}
/** 名前をゲーム内で確認した髪の色 ✅ [U] */
export const HAIR_COLOR_CONFIRMED: ReadonlySet<number> = new Set([0, 1, 2, 3, 4])
/** 通常モードで書ける髪の色の範囲（主人公設定の一覧にある色）。0・10 以上は上級者モードだけ */
export const HAIR_COLOR_MIN = 1
export const HAIR_COLOR_MAX = 9

/** 人物の選択肢を分ける性別 */
export const GENDER_NAMES = ['男', '女'] as const

/**
 * 0x3AADC の値の名前。0＝男・1＝女 🔶（主人公設定の人物）。
 * 2＝ローラ（✅ [U] 2026-10-08 人物として表示を確認）・3＝子供・4＝動物は、その見た目の組の値 🟢
 */
export const BODY_KIND_NAMES = BODY_KINDS

/** 主人公に書くとロードでクラッシュする体の種類 ✅ [U] 2026-10-08（動物 4。人間の部品のままでも、下半身まで外してもクラッシュ）。選択肢に出さない */
export const BODY_KIND_CRASH: readonly number[] = [4]

export type PartValue = {
  offset: number
  /** −1 は FFFF（なし） */
  id: number
  models: [number, number, number, number]
  raw: string
}

export type AppearancePartsView = {
  /** レイアウトの検証に落ちた理由。あれば読み取り専用 */
  problem: string | null
  /** 0xFFFF は個別に設定 */
  person: number
  secondId: number
  hairColor: number
  gender: number
  parts: Record<PartKind, PartValue>
}

const hex = (bytes: Uint8Array, offset: number, length: number) =>
  Array.from(bytes.subarray(offset, offset + length), b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')

const i16 = (u: number) => (u === 0xffff ? -1 : u)

export function readAppearanceParts(bytes: Uint8Array): AppearancePartsView | null {
  const end = APPEARANCE_PARTS_OFFSETS.parts + PART_RECORD_SIZE * PART_KINDS.length
  if (bytes.length < end) return null
  const parts = {} as Record<PartKind, PartValue>
  for (const kind of PART_KINDS) {
    const offset = partOffset(kind)
    parts[kind] = {
      offset,
      id: i16(readU16(bytes, offset)),
      models: [0, 1, 2, 3].map(i => i16(readU16(bytes, offset + 4 + i * 2))) as PartValue['models'],
      raw: hex(bytes, offset, PART_RECORD_SIZE),
    }
  }
  return {
    problem: checkLayout(bytes),
    person: readU16(bytes, APPEARANCE_PARTS_OFFSETS.person),
    secondId: readU16(bytes, APPEARANCE_PARTS_OFFSETS.secondId),
    hairColor: readU8(bytes, APPEARANCE_PARTS_OFFSETS.hairColor),
    gender: readU8(bytes, APPEARANCE_PARTS_OFFSETS.gender),
    parts,
  }
}

function requireWritable(bytes: Uint8Array): AppearancePartsView {
  const view = readAppearanceParts(bytes)
  if (!view) throw new RangeError('ファイルが小さすぎて読めません')
  if (view.problem) throw new RangeError(view.problem)
  return view
}

/** 0x3AADC の値を性別の名前にする。0・1 以外は null */
export function genderName(value: number): Gender | null {
  return value === 0 ? '男' : value === 1 ? '女' : null
}

/**
 * 個別に設定（0x3AAD4＝FFFF）のとき「なし」にするとゲームでエラーになる部品 ✅ [U] 2026-10-08。
 * 人物を選んでいる間は「なし」でも表示できる（青年主人公の下半身など）。
 */
export const NONE_FORBIDDEN_WHEN_CUSTOM: readonly PartKind[] = ['upper', 'lower']

/** 「なし」を選べる部品。通常モードでは人物の部品で「なし」があり得る種類だけ。上半身・下半身はどのモードでも選べない */
export const NONE_ALLOWED: Readonly<Record<PartKind, boolean>> = Object.fromEntries(
  PART_KINDS.map(k => [k, !NONE_FORBIDDEN_WHEN_CUSTOM.includes(k) && PERSONS.some(p => p.parts[k] === null)]),
) as Record<PartKind, boolean>

/**
 * 部品の番号を検証する。−1 はなし。
 * どのモードでも：表にない番号（モデルの値が決まらない）、クラッシュする部品、上半身・下半身の「なし」は拒否する。
 * 通常モード：名前のある部品で、性別の指定がないか主人公の性別と同じもの（ユーザー判断 2026-10-08）。k＝4（❓）は上級者モードだけ。
 */
export function validatePart(kind: PartKind, id: number, heroGender: number, advanced: boolean): string | null {
  if (id === -1) {
    if (NONE_FORBIDDEN_WHEN_CUSTOM.includes(kind)) return '上半身・下半身を「なし」にするとゲームでエラーになります'
    return advanced || NONE_ALLOWED[kind] ? null : '通常モードでは「なし」にできません'
  }
  const part = findPart(kind, id)
  if (!part) return `${id} は部品の表にありません`
  if (part.crash) return 'この部品はロードでクラッシュします'
  if (advanced) return null
  if (kind === 'body') return '通常モードでは変更できません（部品の種類が未確認）'
  if (part.ja === '') return '名前のない部品は上級者モードでだけ選べます'
  const g = genderName(heroGender)
  if (part.gender !== null && part.gender !== g) return '通常モードでは主人公と同じ性別の部品だけ選べます'
  return null
}

function writePartRecord(bytes: Uint8Array, kind: PartKind, id: number): void {
  const offset = partOffset(kind)
  const models = id === -1 ? [-1, -1, -1, -1] : findPart(kind, id)!.models
  writeU16(bytes, offset, id === -1 ? 0xffff : id)
  // +2 は意味が分からないので書かない（❓）
  models.forEach((m, i) => writeU16(bytes, offset + 4 + i * 2, m === -1 ? 0xffff : m))
}

/** 個別に設定にしたとき、上半身・下半身が「なし」だとゲームでエラーになる（✅ [U]）。その部品を先に選ばせる */
function requireCustomizable(view: AppearancePartsView, kind?: PartKind, id?: number): void {
  for (const k of NONE_FORBIDDEN_WHEN_CUSTOM) {
    const next = k === kind ? id : view.parts[k].id
    if (next === -1) {
      throw new RangeError(`${k === 'upper' ? '上半身' : '下半身'}が「なし」のまま個別に設定にするとゲームでエラーになります。先に${k === 'upper' ? '上半身' : '下半身'}を選んでください`)
    }
  }
}

/** 部品1つを書き、人物の番号を「個別に設定」にする（✅ [U] 2026-10-08 の手順） */
export function writePart(bytes: Uint8Array, kind: PartKind, id: number, advanced = false): void {
  const view = requireWritable(bytes)
  const error = validatePart(kind, id, view.gender, advanced)
  if (error) throw new RangeError(error)
  requireCustomizable(view, kind, id)
  writeU16(bytes, APPEARANCE_PARTS_OFFSETS.person, PERSON_CUSTOM)
  writePartRecord(bytes, kind, id)
}

export function validateHairColor(value: number, advanced: boolean): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 255) return '0〜255の整数を入力してください'
  if (!advanced && (value < HAIR_COLOR_MIN || value > HAIR_COLOR_MAX)) return `通常モードでは${HAIR_COLOR_MIN}〜${HAIR_COLOR_MAX}を選んでください`
  return null
}

/** 髪の色を書き、人物の番号を「個別に設定」にする（人物を指している間は人物の色で表示されるため ✅ [U]） */
export function writeHairColor(bytes: Uint8Array, value: number, advanced = false): void {
  const view = requireWritable(bytes)
  const error = validateHairColor(value, advanced)
  if (error) throw new RangeError(error)
  requireCustomizable(view)
  writeU16(bytes, APPEARANCE_PARTS_OFFSETS.person, PERSON_CUSTOM)
  writeU8(bytes, APPEARANCE_PARTS_OFFSETS.hairColor, value)
}

/** 性別だけを書く。上級者モードだけ（ユーザー判断 2026-10-08）。🔶 反対の性別の部品と組み合わさると表示が崩れるおそれがある */
export function writeGender(bytes: Uint8Array, value: number, advanced: boolean): void {
  requireWritable(bytes)
  if (!advanced) throw new RangeError('性別は上級者モードでだけ変更できます。通常は人物を選んでください')
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new RangeError('0〜255の整数を入力してください')
  if (BODY_KIND_CRASH.includes(value)) throw new RangeError('体の種類 4（動物）はロードでクラッシュします')
  writeU8(bytes, APPEARANCE_PARTS_OFFSETS.gender, value)
}

/** 身長の倍率（低い・ふつう・高い ✅ [U]） */
const HEIGHT_RATIOS = [0.9, 1, 1.1]

/**
 * 人物を選ぶ（✅ [U] 2026-10-08 H1・H2）。人物の番号・0x3AAD6・性別・身長・髪の色・全部の部品とモデルの値を、その人物の値で書く。
 * 身長は、今の人物の身長に対する低い・高いの倍率を引き継ぐ（今が個別に設定のときや倍率が分からないときはふつう）。体型・肌色は変えない。
 * 主人公設定に出ない見た目の組（ローラ ✅ [U]、男の子・女の子 🔶）は上級者モードだけ。
 */
export function writePerson(bytes: Uint8Array, personId: number, advanced = false): void {
  const view = requireWritable(bytes)
  const person = findPerson(personId)
  if (!person) throw new RangeError(`${personId} は人物の表にありません`)
  if (!person.selectable && !advanced) throw new RangeError(`${person.ja}は上級者モードでだけ選べます`)
  const current = findPerson(view.person)
  const height = readF32(bytes, APPEARANCE_PARTS_OFFSETS.height)
  const ratio = current ? HEIGHT_RATIOS.find(r => Math.abs(height - current.height * r) < 0.01) ?? 1 : 1
  writeU16(bytes, APPEARANCE_PARTS_OFFSETS.person, person.id)
  writeU16(bytes, APPEARANCE_PARTS_OFFSETS.secondId, person.secondId ?? 0xffff)
  writeU8(bytes, APPEARANCE_PARTS_OFFSETS.hairColor, person.hairColor)
  writeU8(bytes, APPEARANCE_PARTS_OFFSETS.gender, person.bodyKind)
  writeF32(bytes, APPEARANCE_PARTS_OFFSETS.height, person.height * ratio)
  for (const kind of PART_KINDS) writePartRecord(bytes, kind, person.parts[kind] ?? -1)
}
