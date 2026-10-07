// 主人公の見た目のレコード（人物・髪の色・性別・部品）。sample/ のファイルは読まず、実セーブで観測した値を合成する。
// 部品の番号・モデルの値 🟢、顔・髪型・小物・人物選択の書き込みは ✅ [U] 2026-10-08（U-19）。
// 上半身・下半身・足元・k＝4 の書き込み、0x3AAD6（🔶）、髪の色の 3 以外（🔶）は U-19 の判定待ち。
import { describe, expect, it } from 'vitest'
import { readF32, writeF32 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  NONE_ALLOWED,
  partNoneWarning,
  readAppearanceParts,
  validatePart,
  writeGender,
  writeHairColor,
  writePart,
  writePerson,
} from './appearance-parts'
import { PARTS, PERSONS, findPerson, partGroup } from './master/appearance-parts'

const hex = (s: string) => Uint8Array.from(s.trim().split(/\s+/), x => parseInt(x, 16))

/** 容姿「幕末の志士」を選んだ実セーブの 0x3AAD4〜0x3AB5B（組の +2 の値も観測のまま） */
const BAKUMATSU_RECORD = hex(`
  EE 00 FF FF 00 00 03 00 00 00 00 00 00 00 2F 43
  46 00 BD 00 BE 00 FF FF FF FF FF FF
  5F 00 00 00 D5 00 17 01 D5 00 FF FF
  2B 00 BE 01 2A 00 FF FF FF FF FF FF
  2A 00 9E 00 52 00 FF FF 3C 00 FF FF
  07 00 00 00 1A 01 FF FF FF FF FF FF
  21 00 00 00 41 01 FF FF 28 01 FF FF
  FF FF 9E 00 FF FF FF FF FF FF FF FF
  FF FF 17 75 FF FF FF FF FF FF FF FF
  FF FF 0A 34 FF FF FF FF FF FF FF FF
  FF FF 00 00 FF FF FF FF FF FF FF FF
`)

function makeSave(): Uint8Array {
  const bytes = new Uint8Array(TS_SAVE_SIZE)
  bytes.set(BAKUMATSU_RECORD, 0x3aad4)
  return bytes
}

const changed = (a: Uint8Array, b: Uint8Array) => Array.from(a.keys()).filter(i => a[i] !== b[i])

describe('主人公の見た目のレコード（U-19）', () => {
  it('🟢 幕末の志士の観測値を読む', () => {
    const view = readAppearanceParts(makeSave())!
    expect(view.problem).toBeNull()
    expect([view.person, view.secondId, view.hairColor, view.gender]).toEqual([238, 0xffff, 3, 0])
    expect(view.parts.upper).toMatchObject({ offset: 0x3aae4, id: 70, models: [190, -1, -1, -1] })
    expect(view.parts.lower).toMatchObject({ id: 95, models: [213, 279, 213, -1] })
    expect(view.parts.face).toMatchObject({ offset: 0x3aafc, id: 43, models: [42, -1, -1, -1] })
    expect(view.parts.hair).toMatchObject({ offset: 0x3ab08, id: 42, models: [82, -1, 60, -1] })
    expect(view.parts.body).toMatchObject({ id: 7, models: [282, -1, -1, -1] })
    expect(view.parts.feet).toMatchObject({ id: 33, models: [321, -1, 296, -1] })
    expect(view.parts.cape).toMatchObject({ offset: 0x3ab50, id: -1 })
  })

  it('🟢 観測した部品のモデルの値が datatable と一致する', () => {
    const view = readAppearanceParts(makeSave())!
    for (const [kind, part] of Object.entries(view.parts) as [keyof typeof view.parts, (typeof view.parts)['upper']][]) {
      if (part.id === -1) continue
      expect(PARTS[kind].find(p => p.id === part.id)!.models).toEqual(part.models)
    }
  })

  it('✅ [U] 人物を選び直すと観測したレコードと全バイト一致する（組の +2 は書かない）', () => {
    const bytes = makeSave()
    const before = bytes.slice()
    writePerson(bytes, 20)
    expect(changed(bytes, before).length).toBeGreaterThan(0)
    writePerson(bytes, 238)
    expect(bytes).toEqual(before)
  })

  it('✅ [U] H1・H2：人物の番号・0x3AAD6（🔶）・性別・身長・髪の色・部品をその人物の値で書く', () => {
    const bytes = makeSave()
    writePerson(bytes, 245)
    expect(Array.from(bytes.subarray(0x3aad4, 0x3aad8))).toEqual([0xf5, 0, 0xf5, 0])
    expect(bytes[0x3aadc]).toBe(1)
    expect(bytes[0x3aada]).toBe(3)
    expect(Array.from(bytes.subarray(0x3aae0, 0x3aae4))).toEqual([0, 0, 0x20, 0x43])
    const sayo = findPerson(245)!
    const view = readAppearanceParts(bytes)!
    for (const kind of Object.keys(sayo.parts) as (keyof typeof sayo.parts)[]) expect(view.parts[kind].id).toBe(sayo.parts[kind] ?? -1)
    writePerson(bytes, 20)
    expect(Array.from(bytes.subarray(0x3aad4, 0x3aad8))).toEqual([0x14, 0, 0x14, 0])
    expect(bytes[0x3aadc]).toBe(0)
    expect(readF32(bytes, 0x3aae0)).toBe(175)
  })

  it('✅ [U] ローラ（体の種類 2）・男の子・女の子（体の種類 3）は上級者モードだけで選べる', () => {
    const bytes = makeSave()
    const before = bytes.slice()
    expect(() => writePerson(bytes, 29)).toThrow(/上級者/)
    expect(bytes).toEqual(before)
    writePerson(bytes, 29, true)
    // ユーザーが貼り付けて表示を確認したバイト列（2026-10-08）
    expect(bytes.subarray(0x3aad4, 0x3aad8)).toEqual(hex('1D 00 1D 00'))
    expect([bytes[0x3aada], bytes[0x3aadc]]).toEqual([0, 2])
    expect(bytes.subarray(0x3aae0, 0x3aae4)).toEqual(hex('00 00 0E 43'))
    expect(bytes.subarray(0x3aae4, 0x3aae6)).toEqual(hex('06 00'))
    expect(bytes.subarray(0x3aae8, 0x3aaf0)).toEqual(hex('5C 00 FF FF FF FF FF FF'))
    expect(bytes.subarray(0x3ab0c, 0x3ab14)).toEqual(hex('34 00 FF FF 34 00 FF FF'))
    expect(bytes.subarray(0x3ab24, 0x3ab2c)).toEqual(hex('23 01 FF FF FF FF FF FF'))
    // 男の子の足元は子供の裸足 19（ユーザー判断 2026-10-08。組の値は草履 23）
    expect(findPerson(153)!.parts.feet).toBe(19)
    for (const [id, kind] of [[153, 3], [155, 3]] as const) {
      expect(findPerson(id)).toMatchObject({ bodyKind: kind, selectable: false })
      writePerson(bytes, id, true)
      expect(bytes[0x3aadc]).toBe(kind)
    }
  })

  it('✅ [U] 人物を選ぶとき、低い・高いの倍率を引き継ぐ', () => {
    const bytes = makeSave()
    writeF32(bytes, 0x3aae0, 192.5)
    writePerson(bytes, 245)
    expect(readF32(bytes, 0x3aae0)).toBeCloseTo(176, 3)
    writeF32(bytes, 0x3aae0, 150)
    writePerson(bytes, 238)
    expect(readF32(bytes, 0x3aae0)).toBe(175)
  })

  it('✅ [U] C：顔・髪型は部品の番号とモデルの値を書き、人物の番号を FFFF にする', () => {
    const bytes = makeSave()
    const before = bytes.slice()
    writePart(bytes, 'face', 0)
    writePart(bytes, 'hair', 13)
    expect(Array.from(bytes.subarray(0x3aad4, 0x3aad6))).toEqual([0xff, 0xff])
    expect(bytes.subarray(0x3aafc, 0x3aafe)).toEqual(hex('00 00'))
    expect(bytes.subarray(0x3ab00, 0x3ab08)).toEqual(hex('01 00 FF FF FF FF FF FF'))
    expect(bytes.subarray(0x3ab08, 0x3ab0a)).toEqual(hex('0D 00'))
    expect(bytes.subarray(0x3ab0c, 0x3ab14)).toEqual(hex('42 00 FF FF 3C 00 FF FF'))
    // 組の +2 と、ほかの組は変えない
    expect(changed(bytes, before).every(i => i < 0x3aad6 || (i >= 0x3aafc && i < 0x3ab14 && i !== 0x3aafe && i !== 0x3aaff && i !== 0x3ab0a && i !== 0x3ab0b))).toBe(true)
  })

  it('✅ [U] G：手甲・脚絆・前掛け・合羽は色違いまで含めたモデルの値を書く', () => {
    const bytes = makeSave()
    writePart(bytes, 'gauntlet', 36)
    writePart(bytes, 'leggings', 5)
    writePart(bytes, 'apron', 3)
    writePart(bytes, 'cape', 34)
    expect(bytes.subarray(0x3ab2c, 0x3ab2e)).toEqual(hex('24 00'))
    expect(bytes.subarray(0x3ab30, 0x3ab38)).toEqual(hex('46 01 FF FF FF FF FF FF'))
    expect(bytes.subarray(0x3ab38, 0x3ab3a)).toEqual(hex('05 00'))
    expect(bytes.subarray(0x3ab3c, 0x3ab44)).toEqual(hex('0E 01 FF FF FF FF FF FF'))
    expect(bytes.subarray(0x3ab44, 0x3ab46)).toEqual(hex('03 00'))
    expect(bytes.subarray(0x3ab48, 0x3ab50)).toEqual(hex('4B 01 FF FF FF FF FF FF'))
    expect(bytes.subarray(0x3ab50, 0x3ab52)).toEqual(hex('22 00'))
    expect(bytes.subarray(0x3ab54, 0x3ab5c)).toEqual(hex('43 01 FF FF FF FF FF FF'))
  })

  it('「なし」は FFFF とモデルの値 FFFF × 4 を書く', () => {
    const bytes = makeSave()
    writePart(bytes, 'gauntlet', 36)
    writePart(bytes, 'gauntlet', -1)
    expect(bytes.subarray(0x3ab2c, 0x3ab2e)).toEqual(hex('FF FF'))
    expect(bytes.subarray(0x3ab30, 0x3ab38)).toEqual(hex('FF FF FF FF FF FF FF FF'))
  })

  it('通常モードは主人公と同じ性別の名前のある部品だけ。上級者モードでは表にある部品なら許可する（ユーザー判断 2026-10-08）', () => {
    const female = PARTS.face.find(p => p.gender === '女' && p.ja !== '')!
    const unnamed = PARTS.upper.find(p => p.ja === '')!
    expect(validatePart('face', female.id, 0, false)).not.toBeNull()
    expect(validatePart('face', female.id, 1, false)).toBeNull()
    expect(validatePart('upper', unnamed.id, 0, false)).not.toBeNull()
    expect(validatePart('body', 7, 0, false)).not.toBeNull()
    expect(validatePart('face', 999, 0, true)).not.toBeNull()
    expect(NONE_ALLOWED.face).toBe(false)
    expect(validatePart('face', -1, 0, false)).not.toBeNull()
    for (const [kind, id] of [['face', female.id], ['upper', unnamed.id], ['body', 7], ['face', -1]] as const) {
      expect(validatePart(kind, id, 0, true)).toBeNull()
    }
    const bytes = makeSave()
    const before = bytes.slice()
    expect(() => writePart(bytes, 'face', female.id)).toThrow()
    expect(bytes).toEqual(before)
    writePart(bytes, 'face', female.id, true)
    expect(bytes[0x3aafc]).toBe(female.id)
  })

  it('✅ [U] 髪の色は 0x3AADA に書き、人物の番号を FFFF にする。通常モードは一覧にある 1〜9（5〜9 の名前は 🔶）', () => {
    const bytes = makeSave()
    writeHairColor(bytes, 5)
    expect(bytes[0x3aada]).toBe(5)
    expect(Array.from(bytes.subarray(0x3aad4, 0x3aad6))).toEqual([0xff, 0xff])
    expect(() => writeHairColor(bytes, 10)).toThrow()
    expect(() => writeHairColor(bytes, 0)).toThrow()
    writeHairColor(bytes, 10, true)
    expect(bytes[0x3aada]).toBe(10)
    writeHairColor(bytes, 0, true)
    expect(bytes[0x3aada]).toBe(0)
  })

  it('✅ [U] クラッシュする上半身 53 はどのモードでも拒否する', () => {
    for (const advanced of [false, true]) expect(validatePart('upper', 53, 0, advanced)).toMatch(/クラッシュ/)
  })

  it('❓ 上半身・下半身の「なし」は止めずに、その項目に警告する（ユーザー判断 2026-10-08）', () => {
    expect(validatePart('upper', -1, 0, true)).toBeNull()
    expect(validatePart('lower', -1, 0, true)).toBeNull()
    expect(NONE_ALLOWED.lower).toBe(true) // 青年主人公などの下半身がなし
    expect(partNoneWarning('lower', -1)).toMatch(/組み合わせによっては読み込めない/)
    expect(partNoneWarning('upper', -1)).toMatch(/組み合わせ/)
    expect(partNoneWarning('lower', 88)).toBeNull()
    expect(partNoneWarning('feet', -1)).toBeNull()
    const bytes = makeSave()
    writePerson(bytes, 20) // 青年主人公は下半身なし
    writePart(bytes, 'face', 43)
    writeHairColor(bytes, 1)
    expect(readAppearanceParts(bytes)!.person).toBe(0xffff)
    writePart(bytes, 'lower', -1, true)
    expect(readAppearanceParts(bytes)!.parts.lower.id).toBe(-1)
  })

  it('🔶 性別の単独の書き込みは上級者モードだけ', () => {
    const bytes = makeSave()
    expect(() => writeGender(bytes, 1, false)).toThrow()
    writeGender(bytes, 1, true)
    expect(bytes[0x3aadc]).toBe(1)
    // ✅ [U] 2026-10-08 体の種類 4（動物）はクラッシュするので上級者モードでも拒否する
    expect(() => writeGender(bytes, 4, true)).toThrow(/クラッシュ/)
    expect(bytes[0x3aadc]).toBe(1)
    expect(bytes[0x3aad4]).toBe(0xee)
  })

  it('❓ U-1 サイズ違いのファイルには書き込まない', () => {
    const bytes = makeSave().slice(0, -1)
    const before = bytes.slice()
    expect(readAppearanceParts(bytes)!.problem).toMatch(/U-1/)
    expect(() => writePart(bytes, 'face', 0)).toThrow()
    expect(() => writePerson(bytes, 20)).toThrow()
    expect(() => writeHairColor(bytes, 3)).toThrow()
    expect(bytes).toEqual(before)
    expect(readAppearanceParts(new Uint8Array(16))).toBeNull()
  })
})

describe('見た目の部品と人物の datatable（🟢）', () => {
  it('人物「幕末の志士」の部品', () => {
    const p = findPerson(238)!
    expect(p).toMatchObject({ ja: '幕末の志士', height: 175, bodyKind: 0, secondId: null, hairColor: 3, selectable: true })
    expect(p.parts).toMatchObject({ upper: 70, lower: 95, face: 43, hair: 42, body: 7, feet: 33, gauntlet: null, cape: null })
  })

  it('人物の部品はすべて部品の表にある', () => {
    for (const person of PERSONS) {
      for (const [kind, id] of Object.entries(person.parts) as [keyof typeof PARTS, number | null][]) {
        if (id !== null) expect(PARTS[kind].some(p => p.id === id), `${person.ja} ${kind} ${id}`).toBe(true)
      }
    }
  })

  it('部品の組（ユーザー判断 2026-10-08）', () => {
    expect(partGroup('face', PARTS.face.find(p => p.id === 0)!)).toBe('男')
    expect(partGroup('hair', PARTS.hair.find(p => p.ja === '千佳の髪型')!)).toBe('女')
    expect(partGroup('body', PARTS.body.find(p => p.id === 7)!)).toBe('セット用')
    expect(PARTS.upper.some(p => partGroup('upper', p) === '未使用')).toBe(true)
    expect(PARTS.gauntlet.map(p => p.id)).toContain(36)
    expect(PARTS.cape.map(p => p.id)).toEqual([0, 34, 35])
  })

  it('名前のない部品の見た目（✅ [U] 2026-10-08）と、クラッシュする部品', () => {
    expect(PARTS.upper.find(p => p.id === 6)).toMatchObject({ ja: '', alias: 'ローラ', crash: false })
    expect(PARTS.face.find(p => p.id === 27)!.alias).toBe('男の子')
    expect(PARTS.upper.find(p => p.id === 53)!.crash).toBe(true)
    // 名前がなければ、見た目が分かっても上級者モードの組のまま
    expect(partGroup('upper', PARTS.upper.find(p => p.id === 6)!)).not.toMatch(/^(男|女|共通)$/)
  })
})
