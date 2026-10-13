// 主人公の見た目のレコード（人物・髪の色・タイプ・部品）。sample/ のファイルは読まず、実セーブで観測した値を合成する。
// 部品の番号・モデルの値 🟢、顔・髪型・小物・人物選択の書き込みは ✅ [U] 2026-10-08（U-19）。
// 手（k＝4）・足元の層を外す書き込みは ✅ [U] 2026-10-08。層を別の部品の値にする組み合わせは 🔶（上級者モードだけ）。
// 上半身・下半身・足元の部品の書き込み、髪の色の 3 以外（🔶）は U-19 の判定待ち。
import { describe, expect, it } from 'vitest'
import { readF32, readU32, writeF32, writeU32 } from './binary'
import { TS_SAVE_SIZE } from './hero'
import {
  NONE_ALLOWED,
  isNude,
  partNoneWarning,
  writeNude,
  readAppearanceParts,
  validatePart,
  bodyKindName,
  writeBodyKind,
  writeHairColor,
  writePart,
  writePerson,
  layersCustomized,
  validateLayer,
  writeLayer,
} from './appearance-parts'
import { PARTS, PART_KINDS, PERSONS, findPart, findPerson, partGroup } from './master/appearance-parts'

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
    expect([view.person, view.secondId, view.hairColor, view.bodyKind]).toEqual([238, 0xffff, 3, 0])
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

  it('✅ [U] H1・H2：人物の番号・0x3AAD6（🔶）・タイプ・身長・髪の色・部品をその人物の値で書く', () => {
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

  it('✅ [U] ローラ（タイプ 2）・男の子・女の子（タイプ 3）も通常モードで選べる（ユーザー判断 2026-10-09）', () => {
    const bytes = makeSave()
    writePerson(bytes, 29)
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
      writePerson(bytes, id)
      expect(bytes[0x3aadc]).toBe(kind)
    }
  })

  it('✅ [U] 青年主人公・壮年主人公は、ゲームで選んで保存したセーブと同じ値を書く（組の +2 を除く）', () => {
    const expected = {
      // 人物の番号、0x3AAD6、部品の組（+0 と +4〜+B）。2026-10-08 の実セーブの観測値
      20: { head: '14 00 14 00', parts: [[0, '53 00 FF FF FF FF FF FF'], [-1, 'FF FF FF FF FF FF FF FF'], [0, '01 00 FF FF FF FF FF FF'], [0, '2C 00 FF FF 2C 00 FF FF'], [7, '1A 01 FF FF FF FF FF FF'], [0, '1F 01 38 01 1F 01 FF FF']] },
      0: { head: '00 00 00 00', parts: [[0, '53 00 FF FF FF FF FF FF'], [-1, 'FF FF FF FF FF FF FF FF'], [31, '02 00 29 00 FF FF FF FF'], [38, '2D 00 FF FF 2D 00 FF FF'], [7, '1A 01 FF FF FF FF FF FF'], [0, '1F 01 38 01 1F 01 FF FF']] },
    } as const
    for (const [id, e] of Object.entries(expected)) {
      const bytes = makeSave()
      writePerson(bytes, Number(id))
      expect(bytes.subarray(0x3aad4, 0x3aad8)).toEqual(hex(e.head))
      expect([bytes[0x3aada], bytes[0x3aadc]]).toEqual([3, 0])
      expect(readF32(bytes, 0x3aae0)).toBe(175)
      e.parts.forEach(([partId, models], k) => {
        const view = readAppearanceParts(bytes)!.parts
        const kind = (['upper', 'lower', 'face', 'hair', 'body', 'feet'] as const)[k]
        expect(view[kind].id).toBe(partId)
        expect(bytes.subarray(0x3aae8 + 12 * k, 0x3aaf0 + 12 * k)).toEqual(hex(models))
      })
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

  it('🟢 人物の変更で、実際の倍率に身長の選択肢を揃える（ふつう・高い・低い）', () => {
    for (const [ratio, choice] of [[1, 0], [1.1, 1], [0.9, 2]]) {
      const bytes = makeSave()
      writeF32(bytes, 0x3aae0, 175 * ratio)
      writeU32(bytes, 0x4633c, 255)
      writePerson(bytes, 245)
      expect(readF32(bytes, 0x3aae0)).toBeCloseTo(160 * ratio, 3)
      expect(readU32(bytes, 0x4633c)).toBe(choice)
      const before = bytes.slice()
      writePerson(bytes, 245)
      expect(bytes).toEqual(before)
    }
    const bytes = makeSave()
    writeU32(bytes, 0x4633c, 2)
    writeF32(bytes, 0x3aae0, 150)
    writePerson(bytes, 245)
    expect(readU32(bytes, 0x4633c)).toBe(0)
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

  it('✅ [U] 上裸・下裸は服の層を外した体の層だけを書く（MN・FN の値）', () => {
    const male = makeSave()
    writeNude(male, 'upper')
    writeNude(male, 'lower')
    expect(Array.from(male.subarray(0x3aad4, 0x3aad6))).toEqual([0xff, 0xff])
    expect(male.subarray(0x3aae4, 0x3aae6)).toEqual(hex('75 00'))
    expect(male.subarray(0x3aae8, 0x3aaf0)).toEqual(hex('6E 00 FF FF FF FF FF FF'))
    expect(male.subarray(0x3aaf0, 0x3aaf2)).toEqual(hex('58 00'))
    expect(male.subarray(0x3aaf4, 0x3aafc)).toEqual(hex('C4 00 FF FF FF FF FF FF'))
    const view = readAppearanceParts(male)!
    expect([isNude(view, 'upper'), isNude(view, 'lower')]).toEqual([true, true])
    // 足元は変えない
    expect(male.subarray(0x3ab20, 0x3ab2c)).toEqual(makeSave().subarray(0x3ab20, 0x3ab2c))

    const female = makeSave()
    female[0x3aadc] = 1
    expect(isNude(readAppearanceParts(female)!, 'upper')).toBe(false)
    writeNude(female, 'upper')
    writeNude(female, 'lower')
    expect(female.subarray(0x3aae4, 0x3aae6)).toEqual(hex('62 00'))
    expect(female.subarray(0x3aae8, 0x3aaf0)).toEqual(hex('98 00 FF FF FF FF FF FF'))
    expect(female.subarray(0x3aaf0, 0x3aaf2)).toEqual(hex('1A 00'))
    expect(female.subarray(0x3aaf4, 0x3aafc)).toEqual(hex('E9 00 FF FF FF FF FF FF'))

    const laura = makeSave()
    laura[0x3aadc] = 2
    const before = laura.slice()
    expect(() => writeNude(laura, 'upper')).toThrow(/男・女/)
    expect(laura).toEqual(before)
  })

  it('✅ [U] 2026-10-08 手（k＝4）を J.J の手（3）にした書き込みと同じバイトを書く。上級者モードだけ', () => {
    const before = makeSave()
    const bytes = before.slice()
    expect(() => writePart(bytes, 'body', 3, false)).toThrow(RangeError)
    writePart(bytes, 'body', 3, true)
    expect(Array.from(bytes.subarray(0x3aad4, 0x3aad6))).toEqual([0xff, 0xff])
    expect(Array.from(bytes.subarray(0x3ab14, 0x3ab16))).toEqual([0x03, 0x00])
    expect(Array.from(bytes.subarray(0x3ab18, 0x3ab20))).toEqual(Array.from(hex('1a 01 5f 00 ff ff ff ff')))
    // 組の +2 は書かない
    expect(changed(before, bytes).every(i => i < 0x3aad6 || (i >= 0x3ab14 && i < 0x3ab20 && i !== 0x3ab16 && i !== 0x3ab17))).toBe(true)
  })

  it('✅ [U] 2026-10-08 足元の層2（履物）を外す。その層だけを FFFF にし、部品の番号・ほかの層は変えない（ユーザー判断：層は上級者モードだけ）', () => {
    const bytes = makeSave()
    writePart(bytes, 'feet', 0, true)
    const before = bytes.slice()
    expect(() => writeLayer(bytes, 'feet', 1, -1, false)).toThrow(/上級者モード/)
    writeLayer(bytes, 'feet', 1, -1, true)
    expect(changed(before, bytes)).toEqual([0x3ab26, 0x3ab27])
    expect(readAppearanceParts(bytes)!.parts.feet).toMatchObject({ id: 0, models: [287, -1, 287, -1] })
  })

  it('🟢 層の値は、その部品のその層の形の色違いだけ（✅ [U] 別の形のテクスチャは異形になった）', () => {
    const bytes = makeSave()
    // ✅ [U] 2026-10-08 幕末の志士の足元（33）の層1に青年主人公の足のテクスチャ 287 → ブーツの形に草履のテクスチャ。拒否する
    expect(validateLayer('feet', 33, 0, 287, true)).toMatch(/色違いではありません/)
    // 幕末の志士の足元には層2・層4がない
    expect(validateLayer('feet', 33, 1, -1, true)).toMatch(/層2がありません/)
    expect(validateLayer('feet', 33, 3, -1, true)).not.toBeNull()
    expect(validateLayer('feet', 33, 4, -1, true)).not.toBeNull()
    // 浪人の足元（1）の層1は3色
    writePart(bytes, 'feet', 1, true)
    expect(findPart('feet', 1)!.layers[0]).toEqual({ mesh: '足（浪人）', textures: [299, 300, 301] })
    // 標準は 301・309・301
    writeLayer(bytes, 'feet', 0, 299, true)
    const view = readAppearanceParts(bytes)!
    expect(view.parts.feet.models).toEqual([299, 309, 301, -1])
    expect(layersCustomized('feet', view.parts.feet)).toBe(true)
    expect(layersCustomized('upper', view.parts.upper)).toBe(false)
    // 部品が「なし」のときは選べない（合羽は幕末の志士ではなし）
    expect(() => writeLayer(bytes, 'cape', 0, -1, true)).toThrow(/なし/)
  })

  it('🟢 どの部品も、標準の層の値はその層の色違いに含まれ、層のない所は FFFF', () => {
    for (const kind of PART_KINDS)
      for (const p of PARTS[kind])
        p.layers.forEach((def, i) => {
          if (def) expect(def.textures, `${kind} ${p.id} 層${i + 1}`).toContain(p.models[i])
          else expect(p.models[i], `${kind} ${p.id} 層${i + 1}`).toBe(-1)
        })
  })

  it('「なし」は FFFF とモデルの値 FFFF × 4 を書く', () => {
    const bytes = makeSave()
    writePart(bytes, 'gauntlet', 36)
    writePart(bytes, 'gauntlet', -1)
    expect(bytes.subarray(0x3ab2c, 0x3ab2e)).toEqual(hex('FF FF'))
    expect(bytes.subarray(0x3ab30, 0x3ab38)).toEqual(hex('FF FF FF FF FF FF FF FF'))
  })

  it('通常モードは主人公のタイプに合う名前のある部品だけ。上級者モードでは表にある部品なら許可する（ユーザー判断 2026-10-08）', () => {
    const female = PARTS.face.find(p => p.gender === '女' && p.ja !== '')!
    const male = PARTS.face.find(p => p.gender === '男' && p.ja !== '')!
    const unnamed = PARTS.upper.find(p => p.ja === '')!
    expect(validatePart('face', female.id, 0, false)).not.toBeNull()
    expect(validatePart('face', female.id, 1, false)).toBeNull()
    // ローラ（2）・子供（3）は男用・女用の部品を選べない
    for (const bodyKind of [2, 3]) {
      expect(validatePart('face', female.id, bodyKind, false)).not.toBeNull()
      expect(validatePart('face', male.id, bodyKind, false)).not.toBeNull()
      expect(validatePart('face', female.id, bodyKind, true)).toBeNull()
    }
    // 男・女のときはローラ・子供用の部品（名前なし）を選べない
    expect(validatePart('face', 5, 0, false)).not.toBeNull()
    expect(validatePart('upper', 41, 1, false)).not.toBeNull()
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

  it('通常モードでも、タイプがローラ・子供ならそのタイプ用の部品を選べる（ユーザー判断 2026-10-09。上半身・足元の反映は U-19）', () => {
    const allowed = (bodyKind: number) =>
      Object.fromEntries(
        PART_KINDS.map(k => [k, PARTS[k].filter(p => validatePart(k, p.id, bodyKind, false) === null).map(p => p.id)]),
      )
    // 見た目 ✅ [U] 2026-10-08、層の形がそのタイプのもの 🟢
    expect(allowed(2)).toEqual({
      upper: [6], lower: [], face: [5], hair: [5], body: [], feet: [4],
      gauntlet: [], leggings: [], apron: [], cape: [],
    })
    expect(allowed(3)).toEqual({
      upper: [41, 75, 76, 77], lower: [], face: [27, 36], hair: [27, 28], body: [], feet: [19, 23],
      gauntlet: [], leggings: [], apron: [], cape: [],
    })
    // 4（動物）など表にないタイプは何も選べない
    expect(PART_KINDS.every(k => PARTS[k].every(p => validatePart(k, p.id, 4, false) !== null))).toBe(true)
    // 人物の部品と矛盾しない：ローラ・男の子・女の子を選んだあと、部品をその値のまま書き直せる
    for (const personId of [29, 153, 155]) {
      const bytes = makeSave()
      writePerson(bytes, personId)
      const person = findPerson(personId)!
      for (const kind of ['upper', 'face', 'hair', 'feet'] as const) writePart(bytes, kind, person.parts[kind]!)
      expect(readAppearanceParts(bytes)!.parts.face.id).toBe(person.parts.face)
    }
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

  it('🔶 0＝男・1＝女、🟢 2＝ローラ・3＝子供・4＝動物（U-19）。範囲外は null', () => {
    expect([0, 1, 2, 3, 4, 5].map(bodyKindName)).toEqual(['男', '女', 'ローラ', '子供', '動物', null])
  })

  it('🔶 タイプの単独の書き込みは上級者モードだけ', () => {
    const bytes = makeSave()
    expect(() => writeBodyKind(bytes, 1, false)).toThrow()
    writeBodyKind(bytes, 1, true)
    expect(bytes[0x3aadc]).toBe(1)
    // ✅ [U] 2026-10-08 ローラ・子供は人物として表示を確認
    writeBodyKind(bytes, 3, true)
    expect(readAppearanceParts(bytes)!.bodyKind).toBe(3)
    // ✅ [U] 2026-10-08 タイプ 4（動物）はクラッシュするので上級者モードでも拒否する
    expect(() => writeBodyKind(bytes, 4, true)).toThrow(/クラッシュ/)
    expect(bytes[0x3aadc]).toBe(3)
    expect(bytes[0x3aad4]).toBe(0xee)
  })

  it('✅ [U] 裸はタイプが男・女のときだけ', () => {
    const bytes = makeSave()
    writeBodyKind(bytes, 2, true)
    const before = bytes.slice()
    expect(() => writeNude(bytes, 'upper')).toThrow(/男・女/)
    expect(bytes).toEqual(before)
  })

  it('サイズ違いのファイルには書き込まない', () => {
    const bytes = makeSave().slice(0, -1)
    const before = bytes.slice()
    expect(readAppearanceParts(bytes)!.problem).toMatch(/ファイルサイズ/)
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
    // 同じ名前の色違い（✅ [U] 2026-10-10）
    expect(PARTS.lower.find(p => p.id === 60)).toMatchObject({ ja: 'さらし', alias: '黒色のさらし' })
    expect(PARTS.lower.find(p => p.id === 63)).toMatchObject({ ja: 'コルセット', alias: '紫色のコルセット' })
    // 名前がなければ、見た目が分かっても上級者モードの組のまま
    expect(partGroup('upper', PARTS.upper.find(p => p.id === 6)!)).not.toMatch(/^(男|女|共通)$/)
  })
})
