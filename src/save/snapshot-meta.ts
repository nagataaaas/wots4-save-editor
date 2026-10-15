// 履歴（読み込み時・保存時に IndexedDB へ残すセーブの版）の一覧に出す情報。
// 版を残すときに1回だけ計算してメタデータとして持ち、一覧の表示ではセーブを読み直さない（src/lib/history-db.ts）。
// どれもセーブから読めなければ null にし、例外にはしない（サイズ違いのファイルも履歴には残す）。
import { readHero } from './hero'
import { CHART_FRAMES } from './master/event-chart-layout'
import { tr } from '@/lib/i18n'
import { diffRanges, innermostRegion, RAW_REGIONS } from './raw'
import { readDate, TIME_SLOTS } from './scenario-date'
import { EVENT_STATE_VALUES, eventNameOf, readEvents } from './scenario-events'

export type SnapshotMeta = {
  /** 主人公名（0x00DC） */
  playerName: string | null
  /** 日数（0x0BD8＋1） */
  day: number | null
  /** 時間帯（0x0014）の名前 */
  slot: string | null
  /** 直近でクリアしたイベントの名前（lastClearedEvent） */
  lastClearedEvent: string | null
  /** 直前の版から変わった領域の名前（changedRegions。日本語で残す）。読み込み時の版は [] */
  changedRegions: string[]
}

/**
 * どの領域にも入らないバイトと、ゲームの状態ではない領域をまとめる名前。
 * 履歴には言語によらず日本語の名前で残し、表示するときに regionDisplayName で今の言語にする
 */
export const OTHER_REGION = 'その他'

/** 履歴に残した領域の名前（日本語）を、今の言語の名前にする。表にない名前（前の版で残したもの）はそのまま */
export function regionDisplayName(name: string): string {
  if (name === OTHER_REGION) return tr({ ja: OTHER_REGION, en: 'Other' })
  const region = RAW_REGIONS.find((r) => r.label.ja === name)
  return region ? tr(region.label) : name
}

function attempt<T>(read: () => T): T | null {
  try {
    return read()
  } catch {
    return null
  }
}

/**
 * 直近でクリアしたイベント。状態 A（0x36A8＋n）が 04（成功）の枠のうち、イベントチャートでいちばん右の列にある枠のイベント。
 * 同じ列なら通し番号の大きいほう。チャートの列を時間の軸とみなしている（🔶 チャートの左から右へ話が進む並び。
 * 同じ列の枠どうしの前後はセーブからは分からない）。チャートに枠のないイベントは対象にしない
 */
export function lastClearedEvent(bytes: Uint8Array): string | null {
  const view = attempt(() => readEvents(bytes))
  if (!view || view.problem) return null
  let best: { col: number; eventId: number } | null = null
  for (const f of CHART_FRAMES) {
    if (view.entries[f.eventId]?.state !== EVENT_STATE_VALUES.success) continue
    if (!best || f.col > best.col || (f.col === best.col && f.eventId > best.eventId)) best = f
  }
  return best ? eventNameOf(best.eventId) : null
}

/**
 * prev から bytes で変わったバイトの領域の名前を、重複なく位置の順に返す。
 * 領域は生データ画面の色分け（RAW_REGIONS）のいちばん狭いもの。memory-garbage（ゲームの状態ではない値）と、
 * どの領域にも入らないバイトは OTHER_REGION にまとめて最後に置く
 */
export function changedRegions(prev: Uint8Array, bytes: Uint8Array): string[] {
  const names = new Set<string>()
  let other = false
  for (const r of diffRanges(prev, bytes).ranges)
    for (let i = r.start; i <= r.end; i++) {
      const region = innermostRegion(i)
      if (!region) {
        other = true
        continue
      }
      if (region.chunk === 'memory-garbage') other = true
      else names.add(region.label.ja)
      // 同じ領域の残りのバイトは見なくてよい
      i = Math.min(r.end, region.end ?? r.end)
    }
  if (prev.byteLength !== bytes.byteLength) other = true
  return other ? [...names, OTHER_REGION] : [...names]
}

/** 版のメタデータ。prev は直前の版（読み込み時の版なら null） */
export function snapshotMeta(bytes: Uint8Array, prev: Uint8Array | null): SnapshotMeta {
  const hero = attempt(() => readHero(bytes))
  const date = attempt(() => readDate(bytes))
  const dateOk = date && !date.problem
  return {
    playerName: hero && !hero.name.problem ? hero.name.value : null,
    day: dateOk ? date.day : null,
    slot: dateOk ? TIME_SLOTS[date.slot] : null,
    lastClearedEvent: lastClearedEvent(bytes),
    changedRegions: prev ? changedRegions(prev, bytes) : [],
  }
}
