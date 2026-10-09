// 生データ画面のための、セーブ全体のバイト列に対する操作。
// 領域の一覧は docs/save_format/README.md §3（まとまりの一覧）と §2.1（武器・アイテムの並び）を写したもの。
// 確度は §3 の表のまま持つ（🟢🔶❓ を含む）。終了が ❓ の領域は end を null にし、色分けには使わない。
// 位置は固定オフセット（サイズ 0x48BB0）。
import { readF32 } from './binary'

export type RawRegion = {
  start: number
  /** 終了（含む）。❓ のものは null（開始位置だけ分かっている） */
  end: number | null
  /** docs/save_format/chunks/{chunk} */
  chunk: string
  label: string
  /** §3 の表の確度の欄 */
  certainty: string
  /** 固定長のレコードが並ぶ領域の1件のバイト数。位置を「#n +0xNN」で表すのに使う */
  recordSize?: number
}

export const RAW_REGIONS: readonly RawRegion[] = [
  { start: 0x000000, end: 0x000000, chunk: 'difficulty', label: '難易度', certainty: '✅ 0・3 ／ 🟢 1・2' },
  { start: 0x000008, end: 0x00000f, chunk: 'money', label: '所持金・金庫', certainty: '✅' },
  { start: 0x000010, end: 0x0000db, chunk: 'date-location', label: 'シナリオの段階・時間帯・現在地・治安・踏み倒した店（0x001C〜 は予約）', certainty: '✅位置 ／ 🟢 ／ 一部 🔶❓' },
  { start: 0x0000dc, end: 0x00011b, chunk: 'player-name', label: '主人公名', certainty: '✅' },
  { start: 0x00011c, end: 0x00015b, chunk: 'townsfolk', label: 'なりわいのフラグ', certainty: '🟢 ／ 一部 ✅' },
  { start: 0x00015c, end: 0x000b33, chunk: 'townsfolk', label: '町の人のレコード（死亡のビット）', certainty: '🟢 ／ 一部 ✅', recordSize: 12 },
  { start: 0x000b34, end: 0x000c63, chunk: 'stats', label: '侍評価・プレイ時間・移動距離・斬殺数・経過日数・人物ごとの痛手', certainty: '🟢 ／ 一部 ✅' },
  { start: 0x000c64, end: 0x001c03, chunk: 'kill-counts', label: '技ごとの斬殺数（周回中）', certainty: '🟢', recordSize: 4 },
  { start: 0x001c04, end: 0x002ba3, chunk: 'kill-counts', label: '技ごとの斬殺数（累計）', certainty: '🟢', recordSize: 4 },
  { start: 0x002ba4, end: 0x002fa3, chunk: 'item-uses', label: '道具の使用回数（周回中）', certainty: '🟢', recordSize: 4 },
  { start: 0x002fa4, end: 0x0033a3, chunk: 'item-uses', label: '道具の使用回数（累計）', certainty: '🟢', recordSize: 4 },
  { start: 0x0033a4, end: 0x0035a3, chunk: 'occupation', label: 'なりわいの状態の表', certainty: '✅' },
  { start: 0x0035a4, end: 0x0035b3, chunk: 'vitals', label: 'HP・活力', certainty: '一部 ✅（U-4）' },
  { start: 0x00363c, end: 0x0036a3, chunk: 'memory-garbage', label: 'ゲームの状態ではない値', certainty: '🔶' },
  { start: 0x0036a8, end: 0x00374d, chunk: 'event-chart', label: 'イベントの状態 A（周回中）', certainty: '✅' },
  { start: 0x00374e, end: 0x003837, chunk: 'scenario-flags', label: 'シナリオのフラグ列', certainty: '🟢範囲 ／ 一部 ✅' },
  { start: 0x00374e, end: 0x00375c, chunk: 'characters', label: '重要人物の状態', certainty: '🟢人物 ／ 一部 ✅' },
  { start: 0x00375d, end: 0x00375f, chunk: 'facilities', label: '施設（病院・カジノ・語学所）', certainty: '✅' },
  { start: 0x003764, end: 0x0037fb, chunk: 'gates', label: '門の開閉（飛び飛びの7バイト）', certainty: '✅ ／ 0x37FB 🟢' },
  { start: 0x003780, end: 0x00378c, chunk: 'factions', label: '勢力の友好度・敵対状態・ルート分岐', certainty: '✅' },
  { start: 0x00378d, end: 0x0037aa, chunk: 'best-route', label: '真ルートと、その周りの好感度・職など', certainty: '✅ 0x378E ／ 一部 🟢 ／ ほか ❓' },
  { start: 0x003838, end: 0x0038ff, chunk: 'event-chart', label: 'イベントの記録 B（周回をまたぐ）', certainty: '✅' },
  { start: 0x003900, end: 0x003901, chunk: 'hint', label: '次のイベントのヒント', certainty: '✅位置 ／ 🟢値' },
  { start: 0x003902, end: 0x00399f, chunk: 'accessories', label: '装飾品の所持フラグ', certainty: '✅' },
  { start: 0x0048cc, end: 0x004aab, chunk: 'sect-scrolls', label: '流派の書（持ち歩き）', certainty: '🟢', recordSize: 24 },
  { start: 0x004aac, end: 0x0058bb, chunk: 'sect-scrolls', label: '流派の書（道場の箪笥）', certainty: '🟢', recordSize: 24 },
  { start: 0x0058bc, end: 0x0058bd, chunk: 'sect-scrolls', label: '流派の書（箪笥の件数）', certainty: '🟢' },
  { start: 0x0058c0, end: 0x005b3f, chunk: 'items', label: '箪笥のアイテム', certainty: '✅', recordSize: 8 },
  { start: 0x005b40, end: 0x005b8f, chunk: 'items', label: '手持ちのアイテム', certainty: '✅', recordSize: 8 },
  { start: 0x005b90, end: 0x005bdf, chunk: 'items', label: '貴重品', certainty: '✅', recordSize: 8 },
  { start: 0x005c3c, end: 0x006197, chunk: 'memory-garbage', label: 'アドレス風の値', certainty: '🔶' },
  // 🟢 武器レコードの本当の先頭は [TS] の配置の +0x06
  { start: 0x00a4c8, end: 0x00a6a7, chunk: 'weapon-record', label: '帯刀中の武器', certainty: '✅ ／ 🟢境界', recordSize: 0xa0 },
  { start: 0x00a6a8, end: 0x00a6af, chunk: 'belt-state', label: '帯刀の状態', certainty: '✅読み ／ 🟢読み込み ／ ❓書き込み' },
  { start: 0x00a6b0, end: 0x00acef, chunk: 'weapon-record', label: '武器袋', certainty: '✅ ／ 🟢境界', recordSize: 0xa0 },
  { start: 0x00acf4, end: 0x0129f3, chunk: 'weapon-record', label: '武器箪笥', certainty: '✅ ／ 🟢境界', recordSize: 0xa0 },
  { start: 0x0129f4, end: 0x0129f6, chunk: 'weapon-record', label: '武器箪笥の本数と容量', certainty: '🟢' },
  { start: 0x0137ec, end: 0x013c2f, chunk: 'night-visit', label: '夜這いの記録', certainty: '一部 ✅' },
  { start: 0x014038, end: 0x014063, chunk: 'night-visit', label: '夜の約束の枠', certainty: '一部 ✅' },
  { start: 0x01417c, end: 0x0189fb, chunk: 'skill-states', label: '技の覚え状況', certainty: '🟢 ／ 書き込み ✅' },
  { start: 0x0189fc, end: 0x01920d, chunk: 'styles', label: '習得技数・腕前点・装備・流派の表', certainty: '🟢' },
  { start: 0x01920e, end: 0x01a60f, chunk: 'custom-style', label: '俺流', certainty: '🟢' },
  { start: 0x01a610, end: 0x03aa11, chunk: 'belt-copy', label: '俺流の技の表', certainty: '🟢' },
  { start: 0x03aa12, end: 0x03aad1, chunk: 'skill-kills', label: '技ごとの斬殺数', certainty: '🟢', recordSize: 6 },
  { start: 0x03aad4, end: 0x03ab5b, chunk: 'appearance', label: '主人公の見た目', certainty: '✅肌色・体型・身長 ／ 🟢部品 ／ 一部 ❓' },
  { start: 0x03ab5c, end: 0x03ab7a, chunk: 'appearance', label: '容姿の解放ビット', certainty: '✅位置 ／ 🟢服の対応' },
  { start: 0x043318, end: 0x043381, chunk: 'unlocks', label: '特典解除の状態', certainty: '先頭16件・101 ✅ ／ ほか 🔶 U-17' },
  { start: 0x0433a6, end: 0x0433a7, chunk: 'occupation', label: 'クリアしたなりわいの数', certainty: '🔶' },
  // 🟢 流通の記録。武器は武器レコード 0xA0 B ＋ 持っている町の人の番号 4 B
  { start: 0x0440d8, end: 0x044a73, chunk: 'market-weapons', label: '流通中の武器', certainty: '🟢', recordSize: 0xa4 },
  { start: 0x044a74, end: 0x044aeb, chunk: 'market-weapons', label: '流通中の道具', certainty: '🟢', recordSize: 0x0c },
  { start: 0x044aec, end: 0x0452bb, chunk: 'market-weapons', label: '流通中の刃', certainty: '🟢', recordSize: 0x14 },
  { start: 0x0452bc, end: 0x0458fb, chunk: 'market-weapons', label: '流通中の鍔', certainty: '🟢', recordSize: 0x10 },
  { start: 0x0458fc, end: 0x045f3b, chunk: 'market-weapons', label: '流通中の柄', certainty: '🟢', recordSize: 0x10 },
  { start: 0x045f40, end: 0x045f55, chunk: 'occupation', label: '受注中のなりわい', certainty: '🔶' },
]

/** offset を含む領域（終了の分かっているもの）のうち、いちばん狭いもの。どこにも入らなければ null */
export function innermostRegion(offset: number, regions: readonly RawRegion[] = RAW_REGIONS): RawRegion | null {
  let best: RawRegion | null = null
  for (const r of regions) {
    if (r.end === null || offset < r.start || offset > r.end) continue
    if (!best || r.end - r.start < (best.end as number) - best.start) best = r
  }
  return best
}

/** offset を含む領域（終了の分かっているもの）をすべて、広い順に返す */
export function regionsAt(offset: number, regions: readonly RawRegion[] = RAW_REGIONS): RawRegion[] {
  return regions
    .filter((r) => r.end !== null && offset >= r.start && offset <= r.end)
    .sort((a, b) => (b.end as number) - b.start - ((a.end as number) - a.start))
}

/** 領域の中での位置。レコードの並ぶ領域なら「#n +0xNN」（n は 0 始まり）、ほかは「+0xNN」 */
export function positionInRegion(region: RawRegion, offset: number): string {
  const rel = offset - region.start
  if (region.recordSize) {
    const index = Math.floor(rel / region.recordSize)
    return `#${index} +0x${(rel % region.recordSize).toString(16).toUpperCase().padStart(2, '0')}`
  }
  return `+0x${rel.toString(16).toUpperCase()}`
}

export type ByteRange = { start: number; end: number }

/**
 * a と b で値が違うバイトを、連続する範囲（end は含む）にまとめて返す。長さが違えば短いほうまで比べる。
 * limit 件を超えたら打ち切り、truncated を true にする。total は違うバイトの総数（打ち切っても全体を数える）
 */
export function diffRanges(a: Uint8Array, b: Uint8Array, limit = Infinity): { ranges: ByteRange[]; total: number; truncated: boolean } {
  const n = Math.min(a.byteLength, b.byteLength)
  const ranges: ByteRange[] = []
  let total = 0
  let truncated = false
  let open: ByteRange | null = null
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) continue
    total++
    if (open && open.end === i - 1) {
      open.end = i
      continue
    }
    if (ranges.length >= limit) {
      truncated = true
      open = null
      continue
    }
    open = { start: i, end: i }
    ranges.push(open)
  }
  return { ranges, total, truncated }
}

/** オフセットの入力（16進。0x は付けても付けなくてもよい）を読む */
export function parseOffset(input: string, size: number): { ok: true; value: number } | { ok: false; error: string } {
  const s = input.trim().replace(/^0x/i, '')
  if (!/^[0-9a-f]+$/i.test(s)) return { ok: false, error: '16進数で入力してください（例：0x36A8）' }
  const value = parseInt(s, 16)
  if (value >= size) return { ok: false, error: `ファイルの範囲（0x0〜0x${(size - 1).toString(16).toUpperCase()}）の外です` }
  return { ok: true, value }
}

/** 書き込みで一度に受け付けるバイト数の上限 */
export const RAW_WRITE_MAX = 256

/** 16進のバイト列（「12 34 AB」「1234AB」）を読む */
export function parseHexBytes(input: string): { ok: true; value: number[] } | { ok: false; error: string } {
  const s = input.replace(/\s+/g, '')
  if (s.length === 0) return { ok: false, error: 'バイト列が空です' }
  if (!/^[0-9a-f]+$/i.test(s)) return { ok: false, error: '16進数（0〜9、A〜F）と空白だけで入力してください' }
  if (s.length % 2 !== 0) return { ok: false, error: '桁数が奇数です（1バイトは2桁）' }
  const value: number[] = []
  for (let i = 0; i < s.length; i += 2) value.push(parseInt(s.slice(i, i + 2), 16))
  if (value.length > RAW_WRITE_MAX) return { ok: false, error: `一度に書けるのは ${RAW_WRITE_MAX} B までです（${value.length} B）` }
  return { ok: true, value }
}

export type RawPatch = { line: number; offset: number; values: number[] }

export type PatchScriptResult = {
  patches: RawPatch[]
  /** 読めなかった行（行番号は 1 始まり）。1件でもあれば書き込まない */
  errors: { line: number; message: string }[]
  /** 書き込みはできるが注意がいること（前の行と範囲が重なるなど） */
  warnings: { line: number; message: string }[]
}

/**
 * まとめて書き込むための入力を読む。1行に「オフセット バイト列」を書く。
 *
 *   0x36A8 02 ff 00 11
 *   0x3780: 01ff          （オフセットの後の : と、バイト列の空白は省略できる）
 *   # コメント            （# または // 以降と空行は無視する）
 *
 * オフセットは 16 進（0x は省略可）。範囲が重なる行は、後の行の値が残る（警告を出す）
 */
export function parsePatchScript(text: string, size: number): PatchScriptResult {
  const patches: RawPatch[] = []
  const errors: PatchScriptResult['errors'] = []
  const warnings: PatchScriptResult['warnings'] = []
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1
    const body = raw.replace(/(#|\/\/).*$/, '').trim()
    if (body === '') return
    const m = /^(\S+?)(?::\s*|\s+|$)(.*)$/.exec(body)
    if (!m) {
      errors.push({ line, message: '「オフセット バイト列」の形ではありません' })
      return
    }
    const offset = parseOffset(m[1], size)
    if (!offset.ok) {
      errors.push({ line, message: `オフセット「${m[1]}」：${offset.error}` })
      return
    }
    if (!m[2]) {
      errors.push({ line, message: 'バイト列がありません' })
      return
    }
    const values = parseHexBytes(m[2].replace(/^:\s*/, ''))
    if (!values.ok) {
      errors.push({ line, message: values.error })
      return
    }
    const end = offset.value + values.value.length
    if (end > size) {
      errors.push({ line, message: `ファイルの末尾を越えます（${values.value.length} B）` })
      return
    }
    const overlap = patches.find((p) => offset.value < p.offset + p.values.length && p.offset < end)
    if (overlap) warnings.push({ line, message: `${overlap.line} 行目と範囲が重なります。この行の値が残ります` })
    patches.push({ line, offset: offset.value, values: values.value })
  })
  if (patches.length === 0 && errors.length === 0) errors.push({ line: 0, message: '書き込む行がありません' })
  return { patches, errors, warnings }
}

/** まとめて上書きする。先に全部の範囲を確かめ、1つでも外れていれば何も変えない */
export function applyPatches(bytes: Uint8Array, patches: readonly RawPatch[]): void {
  for (const p of patches) {
    if (p.offset < 0 || p.offset + p.values.length > bytes.byteLength || p.values.some((v) => !Number.isInteger(v) || v < 0 || v > 0xff)) {
      throw new RangeError(`${p.line} 行目：範囲外の書き込みです（0x${p.offset.toString(16).toUpperCase()} から ${p.values.length} B）`)
    }
  }
  for (const p of patches) bytes.set(p.values, p.offset)
}

/**
 * offset から values を上書きする。ファイルの末尾を越える書き込みは拒否する（サイズを変えない。AGENTS.md）。
 * 値の意味は確かめない。呼び出し側で上級者モードのときだけ使う
 */
export function writeRawBytes(bytes: Uint8Array, offset: number, values: readonly number[]): void {
  if (!Number.isInteger(offset) || offset < 0 || offset + values.length > bytes.byteLength) {
    throw new RangeError(`範囲外の書き込みです（0x${offset.toString(16).toUpperCase()} から ${values.length} B）`)
  }
  for (const v of values) {
    if (!Number.isInteger(v) || v < 0 || v > 0xff) throw new RangeError(`バイトの範囲外です: ${v}`)
  }
  bytes.set(values, offset)
}

export type SearchKind = 'hex' | 'u8' | 'u16' | 'u32' | 'utf16'

export const SEARCH_KINDS: readonly { kind: SearchKind; label: string; placeholder: string }[] = [
  { kind: 'hex', label: 'バイト列', placeholder: '例：FF ?? 00 01（?? は任意の1バイト）' },
  { kind: 'u8', label: 'u8', placeholder: '例：255 または 0xFF' },
  { kind: 'u16', label: 'u16 LE', placeholder: '例：1000 または 0x03E8' },
  { kind: 'u32', label: 'u32 LE', placeholder: '例：100000' },
  { kind: 'utf16', label: '文字列（UTF-16LE）', placeholder: '例：主人公の名前' },
]

/** 検索の条件。null は任意の1バイト */
export type SearchPattern = (number | null)[]

function parseUint(input: string, max: number): number | null {
  const s = input.trim()
  const value = /^0x[0-9a-f]+$/i.test(s) ? parseInt(s.slice(2), 16) : /^\d+$/.test(s) ? Number(s) : NaN
  return Number.isInteger(value) && value >= 0 && value <= max ? value : null
}

/** 検索の入力を、バイトの並び（リトルエンディアン）に直す */
export function buildSearchPattern(kind: SearchKind, input: string): { ok: true; value: SearchPattern } | { ok: false; error: string } {
  if (kind === 'hex') {
    const tokens = input.trim().split(/\s+/).filter(Boolean)
    // 空白なしの「1234AB」も受け付ける
    const units = tokens.length === 1 && tokens[0].length > 2 ? (tokens[0].match(/.{1,2}/g) ?? []) : tokens
    if (units.length === 0) return { ok: false, error: 'バイト列が空です' }
    const value: SearchPattern = []
    for (const u of units) {
      if (u === '??') value.push(null)
      else if (/^[0-9a-f]{2}$/i.test(u)) value.push(parseInt(u, 16))
      else return { ok: false, error: `「${u}」は1バイトの16進数（2桁）でも ?? でもありません` }
    }
    if (value.every((v) => v === null)) return { ok: false, error: '?? だけでは検索できません' }
    return { ok: true, value }
  }
  if (kind === 'utf16') {
    if (input.length === 0) return { ok: false, error: '文字列が空です' }
    const value: SearchPattern = []
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i)
      value.push(c & 0xff, c >> 8)
    }
    return { ok: true, value }
  }
  const width = kind === 'u8' ? 1 : kind === 'u16' ? 2 : 4
  const v = parseUint(input, 2 ** (width * 8) - 1)
  if (v === null) return { ok: false, error: `${kind} の範囲（0〜${2 ** (width * 8) - 1}）の整数を入力してください` }
  const value: SearchPattern = []
  for (let i = 0; i < width; i++) value.push(Math.floor(v / 2 ** (i * 8)) & 0xff)
  return { ok: true, value }
}

/** pattern に一致する開始位置を、先頭から limit 件まで返す */
export function searchBytes(bytes: Uint8Array, pattern: SearchPattern, limit = Infinity): { offsets: number[]; truncated: boolean } {
  const offsets: number[] = []
  const last = bytes.byteLength - pattern.length
  outer: for (let i = 0; i <= last; i++) {
    for (let j = 0; j < pattern.length; j++) {
      const p = pattern[j]
      if (p !== null && bytes[i + j] !== p) continue outer
    }
    if (offsets.length >= limit) return { offsets, truncated: true }
    offsets.push(i)
  }
  return { offsets, truncated: false }
}

export type InspectedValue = { label: string; value: string | null }

/** offset から読んだ値を型ごとに並べる（リトルエンディアン）。ファイルの末尾を越える型は null */
export function inspectAt(bytes: Uint8Array, offset: number): InspectedValue[] {
  const has = (n: number) => offset >= 0 && offset + n <= bytes.byteLength
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const hex = (v: number, digits: number) => `0x${v.toString(16).toUpperCase().padStart(digits, '0')}`
  const u16 = has(2) ? dv.getUint16(offset, true) : null
  const u32 = has(4) ? dv.getUint32(offset, true) : null
  const f32 = has(4) ? readF32(bytes, offset) : null
  return [
    { label: 'u8', value: has(1) ? `${bytes[offset]}（${hex(bytes[offset], 2)}）` : null },
    { label: 'i8', value: has(1) ? String(dv.getInt8(offset)) : null },
    { label: '2進', value: has(1) ? bytes[offset].toString(2).padStart(8, '0') : null },
    { label: 'u16', value: u16 === null ? null : `${u16}（${hex(u16, 4)}）` },
    { label: 'i16', value: has(2) ? String(dv.getInt16(offset, true)) : null },
    { label: 'u32', value: u32 === null ? null : `${u32}（${hex(u32, 8)}）` },
    { label: 'i32', value: has(4) ? String(dv.getInt32(offset, true)) : null },
    { label: 'f32', value: f32 === null ? null : formatFloat(f32) },
    { label: 'UTF-16', value: u16 === null ? null : utf16Char(u16) },
  ]
}

function formatFloat(v: number): string {
  if (!Number.isFinite(v)) return String(v)
  // 大きすぎ・小さすぎる値は指数表記にする（でたらめなバイト列を float として読むとよくある）
  const abs = Math.abs(v)
  return abs !== 0 && (abs < 1e-4 || abs >= 1e9) ? v.toExponential(6) : String(Number(v.toPrecision(7)))
}

/** UTF-16 の1単位を表示用の1文字にする。制御文字・サロゲートは「·」 */
export function utf16Char(unit: number): string {
  if (unit < 0x20 || (unit >= 0x7f && unit < 0xa0) || (unit >= 0xd800 && unit <= 0xdfff) || unit === 0xfffe || unit === 0xffff) return '·'
  return String.fromCharCode(unit)
}
