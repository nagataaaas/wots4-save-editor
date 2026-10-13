import type { readUtf16Fixed } from './binary'

export type EditOpts = { advanced: boolean }
export const NORMAL_EDIT_OPTS: EditOpts = Object.freeze({ advanced: false })

/** problem は書き込みを止める理由、warnings は編集可能な値への注意。 */
export type ViewStatus = { problem: string | null; warnings: string[] }
export type Field<T> = ViewStatus & { value: T }

export function warningsOf(warning: string | null | undefined): string[] {
  return warning ? [warning] : []
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
