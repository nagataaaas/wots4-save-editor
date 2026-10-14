import type { readUtf16Fixed } from './binary'

export type EditOpts = { advanced: boolean }
export const NORMAL_EDIT_OPTS: EditOpts = Object.freeze({ advanced: false })

/** problem は書き込みを止める理由、warnings は編集可能な値への注意。 */
export type ViewStatus = { problem: string | null; warnings: string[] }
export type Field<T> = ViewStatus & { value: T }

export function warningsOf(warning: string | null | undefined): string[] {
  return warning ? [warning] : []
}

/** 1つの数値の欄に書ける範囲 */
export type RangeSpec = {
  /** 格納できる上限（型の上限など）。上級者モードではここまで書ける */
  systemMax: number
  /** 通常モードの上限。省略すると systemMax */
  normalMax?: number
  /** 下限。省略すると 0 */
  min?: number
  /** 上級者モードの下限。省略すると min */
  systemMin?: number
  /** false なら小数も受ける（f32 の欄）。省略すると整数だけ */
  integer?: boolean
}

/**
 * 整数（integer: false なら有限の数）か、格納できる範囲か、通常モードの範囲か（上級者モードなら格納できる範囲）を検証する。
 * 問題がなければ null。文言は画面に出すので、入力できる範囲だけを書く
 */
export function validateRange(value: number, spec: RangeSpec, opts: EditOpts): string | null {
  const { systemMax, normalMax = systemMax, min = 0, systemMin = min, integer = true } = spec
  const isNumber = integer ? Number.isInteger(value) : Number.isFinite(value)
  const lo = opts.advanced ? systemMin : min
  const hi = opts.advanced ? systemMax : normalMax
  if (isNumber && value >= lo && value <= hi) return null
  if (!integer && !isNumber) return '数値を入力してください'
  const text = `${lo.toLocaleString()}〜${hi.toLocaleString()} の${integer ? '整数' : '数値'}を入力してください`
  const advancedAllows = isNumber && value >= systemMin && value <= systemMax
  return !opts.advanced && advancedAllows ? `${text}（上級者モードでは範囲を超えて書けます）` : text
}

export function hasControlChar(text: string): boolean {
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) < 0x20) return true
  return false
}

export function validateText(text: string, maxChars: number, label = '名前'): string | null {
  if (text.length === 0) return '名前が空です'
  if (text.length > maxChars) return `${label}は${maxChars}文字までです（${text.length}文字）`
  if (hasControlChar(text)) return '制御文字は使えません'
  return null
}

export function fixedStringProblem(value: ReturnType<typeof readUtf16Fixed>, label: string): string | null {
  if (!value.terminated) return `${label}の終わりが見つかりません`
  if (!value.paddingClean) return `${label}の後ろに余計なデータがあります`
  if (hasControlChar(value.text)) return `${label}に制御文字があります`
  return null
}
