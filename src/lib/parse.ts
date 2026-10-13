import type { ParseResult } from './use-field-draft'

/** 桁・符号・基数を明示して整数を読む。Number の指数表記や丸めを受け付けない。 */
export function integerValue(input: string, { hex = false, signed = false, radix = 10 }: {
  hex?: boolean; signed?: boolean; radix?: 10 | 16
} = {}): number | null {
  const text = input.trim()
  const decimal = signed ? /^-?\d+$/ : /^\d+$/
  const hexadecimal = radix === 16 ? /^(?:0x)?[0-9a-f]+$/i : /^0x[0-9a-f]+$/i
  if (radix === 16 || (hex && hexadecimal.test(text))) {
    if (!hexadecimal.test(text)) return null
    const value = parseInt(text.replace(/^0x/i, ''), 16)
    return Number.isSafeInteger(value) ? value : null
  }
  if (!decimal.test(text)) return null
  const value = Number(text)
  return Number.isSafeInteger(value) ? value : null
}

export function parseInteger(input: string, validate: (value: number) => string | null, options: {
  hex?: boolean; signed?: boolean; error?: string
} = {}): ParseResult<number> {
  const value = integerValue(input, options)
  if (value === null) return { ok: false, error: options.error ?? '整数を入力してください' }
  const error = validate(value)
  return error ? { ok: false, error } : { ok: true, value }
}
