import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FieldRow } from './field-row'

type Props = Parameters<typeof FieldRow<number>>[0]
function render(value: number | null, problem: string | null = null, display?: (value: number) => string, overrides: Partial<Props> = {}) {
  return renderToStaticMarkup(createElement(FieldRow<number>, {
    label: '数値', offset: 8, value, problem, display, format: String,
    parse: (input) => ({ ok: true, value: Number(input) }), apply: () => {},
    ...overrides,
  }))
}

describe('FieldRow の初期表示', () => {
  it('初期表示はセーブの値を出す', () => {
    expect(render(42)).toContain('value="42"')
  })
  it('未読み込みでは空欄を無効にして表示する', () => {
    const html = render(null)
    expect(html).toContain('value=""')
    expect(html).toContain('disabled=""')
    expect(html).toContain('placeholder="未読み込み"')
  })
  it('表示用の書式と読み取り専用の理由を維持する', () => {
    expect(render(42, null, () => '？')).toContain('value="？"')
    const html = render(42, '編集できません')
    expect(html).toContain('readOnly=""')
    expect(html).toContain('読み取り専用：編集できません')
  })
  it('disabled では値と hint を出したまま入力欄を無効にする', () => {
    const html = render(42, null, undefined, { disabled: true, hint: '今は変えられません' })
    expect(html).toContain('value="42"')
    expect(html).toContain('disabled=""')
    expect(html).toContain('今は変えられません')
    expect(html).not.toContain('読み取り専用')
  })
  it('offset を省くと丸ハテナを出さない', () => {
    expect(render(42)).toContain('aria-label="補足"')
    expect(render(42, null, undefined, { offset: undefined })).not.toContain('aria-label="補足"')
  })
})
