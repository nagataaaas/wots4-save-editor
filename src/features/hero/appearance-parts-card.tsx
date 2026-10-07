import { useMemo } from 'react'
import { CertaintyBadge } from '@/components/certainty-badge'
import { SearchSelectRow } from '@/components/search-select-row'
import type { SelectOption } from '@/components/select-options'
import { SelectRow } from '@/components/select-row'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdvancedMode } from '@/lib/advanced-mode-context'
import { useSave } from '@/lib/save-context'
import {
  APPEARANCE_PARTS_OFFSETS,
  BODY_KIND_NAMES,
  GENDER_NAMES,
  HAIR_COLOR_CONFIRMED,
  HAIR_COLOR_MAX,
  HAIR_COLOR_MIN,
  HAIR_COLOR_NAMES,
  PART_WRITE_CONFIRMED,
  PERSON_CUSTOM,
  genderName,
  readAppearanceParts,
  validatePart,
  writeGender,
  writeHairColor,
  writePart,
  writePerson,
} from '@/save/appearance-parts'
import {
  PARTS,
  PART_KINDS,
  PART_KIND_LABELS,
  PERSONS,
  findPart,
  findPerson,
  partGroup,
  type PartEntry,
  type PartGroup,
  type PartKind,
} from '@/save/master/appearance-parts'

const GROUP_ORDER: readonly PartGroup[] = ['男', '女', '共通', 'セット用', '未使用']

function partLabel(p: PartEntry): string {
  const tags = [p.dlc !== null ? 'DLC' : null, p.unlockId !== null ? '特典' : null].filter(Boolean)
  const name = p.ja || (p.alias ? `名前なし：${p.alias}` : '名前なし')
  return `${name}（${p.id}）${tags.length ? ` [${tags.join('・')}]` : ''}`
}

/**
 * 通常モード：主人公と同じ性別の名前のある部品。上級者モード：全部を「男・女・共通・セット用・未使用」の順に（ユーザー判断 2026-10-08）。
 * クラッシュする部品と、上半身・下半身の「なし」はどのモードでも出さない（✅ [U] 2026-10-08）
 */
function partOptions(kind: PartKind, heroGender: number, advanced: boolean): SelectOption[] {
  const none: SelectOption[] =
    validatePart(kind, -1, heroGender, advanced) === null ? [{ value: '-1', label: 'なし（FFFF）', group: advanced ? 'なし' : undefined }] : []
  const parts = PARTS[kind].filter(p => validatePart(kind, p.id, heroGender, advanced) === null)
  if (!advanced) return [...none, ...parts.map(p => ({ value: String(p.id), label: partLabel(p), keywords: [String(p.id)] }))]
  const opts = GROUP_ORDER.flatMap(g =>
    parts.filter(p => partGroup(kind, p) === g).map(p => ({ value: String(p.id), label: partLabel(p), group: g, keywords: [String(p.id), g, p.alias] })),
  )
  return [...none, ...opts]
}

const PART_NOTES: Record<PartKind, string> = {
  upper: '🟢 部品の番号とモデルの値（u16 × 4）を書く。書き込みの反映は要ゲーム内確認（U-19）',
  lower: '🟢 部品の番号とモデルの値（u16 × 4）を書く。書き込みの反映は要ゲーム内確認（U-19）',
  face: '🟢 部品の番号とモデルの値を書く。✅ [U] 書き込みの反映を確認',
  hair: '🟢 部品の番号とモデルの値を書く。✅ [U] 書き込みの反映を確認',
  body: '❓ 部品の種類が分からない（名前のない15種）。上級者モードだけ。書き込みの反映は要ゲーム内確認（U-19）',
  feet: '🟢 部品の番号とモデルの値（u16 × 4）を書く。書き込みの反映は要ゲーム内確認（U-19）',
  gauntlet: '✅ [U] 部品の番号と、色違いまで含めたモデルの値を書く',
  leggings: '✅ [U] 部品の番号と、色違いまで含めたモデルの値を書く',
  apron: '✅ [U] 部品の番号と、色違いまで含めたモデルの値を書く',
  cape: '✅ [U] 部品の番号と、色違いまで含めたモデルの値を書く',
}

/** 人物・性別・髪の色・顔・髪型・服（0x3AAD4〜0x3AB5B）。U-19 */
export function AppearancePartsCard() {
  const { save, update } = useSave()
  const { advanced } = useAdvancedMode()
  const view = useMemo(() => (save ? readAppearanceParts(save.working) : null), [save])
  const k = save?.loadId ?? 0
  const problem = view === null ? (save ? 'ファイルが小さすぎて読めません' : null) : view.problem
  const heroGender = view?.gender ?? 0

  const personOptions: SelectOption[] = PERSONS.map(p => ({
    value: String(p.id),
    label: `${p.ja}（${p.id}）${p.dlc !== null ? ' [DLC]' : ''}`,
    group: GENDER_NAMES[p.gender],
    keywords: [String(p.id), p.en],
  })).sort((a, b) => (a.group === b.group ? 0 : a.group === '男' ? -1 : 1))
  const person = view ? findPerson(view.person) : undefined

  const hairMin = advanced ? 0 : HAIR_COLOR_MIN
  const hairMax = advanced ? 15 : HAIR_COLOR_MAX
  const hairLabel = (i: number) =>
    `${HAIR_COLOR_NAMES[i] ?? '色なし'}（${i}）${HAIR_COLOR_CONFIRMED.has(i) || i > HAIR_COLOR_MAX ? '' : ' 🔶'}`
  const hairOptions: SelectOption[] = Array.from({ length: hairMax - hairMin + 1 }, (_, i) => ({
    value: String(hairMin + i),
    label: hairLabel(hairMin + i),
  }))

  const kinds = PART_KINDS.filter(kind => advanced || kind !== 'body')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          人物・顔・髪型・服
          <CertaintyBadge mark="🔶" text="上半身・下半身・足元は要ゲーム内確認（U-19）" />
        </CardTitle>
        <CardDescription>
          人物を選ぶと、性別・身長・髪の色・顔・髪型・服をその人物の値で書きます（体型・肌色は変えません）。
          人物を選んでいる間、ゲームは顔・髪型・服・髪の色を人物の値で表示します。部品や髪の色を変えると「個別に設定」になります。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <SearchSelectRow
          key={`${k}-person`}
          label="人物"
          offset={APPEARANCE_PARTS_OFFSETS.person}
          value={view ? String(view.person) : null}
          currentLabel={view?.person === PERSON_CUSTOM ? '個別に設定（FFFF）' : `不明な人物 ${view?.person}`}
          options={personOptions}
          problem={problem}
          hint={person ? `身長 ${person.height}cm（ふつう）` : view?.person === PERSON_CUSTOM ? '顔・髪型・服を個別に設定しています' : undefined}
          note="🟢 人物の番号。✅ [U] 選び直して見た目が変わることを確認。0x3AAD6 に書く値は 🔶（U-19）。身長は今の低い・高いの倍率を引き継ぐ"
          searchPlaceholder="人物を検索"
          onChange={v => update(b => writePerson(b, Number(v)))}
        />
        <SelectRow
          key={`${k}-gender-${advanced}`}
          label="性別"
          offset={APPEARANCE_PARTS_OFFSETS.gender}
          value={view ? String(view.gender) : null}
          currentLabel={`不明な値 ${view?.gender}`}
          options={BODY_KIND_NAMES.map((g, i) => ({ value: String(i), label: `${g}（${i}）${i >= 2 ? ' ❓' : ''}` }))}
          problem={problem}
          disabled={!advanced}
          hint={advanced ? '上級者モード：性別だけを書き換えます。反対の性別の部品と組み合わさると表示が崩れるおそれがあります' : '人物を選ぶと決まります'}
          note="🔶 0＝男、1＝女。🟢 2＝ローラ・3＝子供・4＝動物の見た目の組の値（主人公に書いたときの動きは ❓）"
          onChange={v => update(b => writeGender(b, Number(v), advanced))}
        />
        <SelectRow
          key={`${k}-hair-color-${advanced}`}
          label="髪の色"
          offset={APPEARANCE_PARTS_OFFSETS.hairColor}
          value={view ? String(view.hairColor) : null}
          currentLabel={hairLabel(view?.hairColor ?? 0)}
          options={hairOptions}
          problem={problem}
          hint={advanced ? '上級者モード：0〜15（0・10 以上は色がつきません）' : `${HAIR_COLOR_MIN}〜${HAIR_COLOR_MAX}`}
          note="値＝主人公設定の一覧の左からの位置。✅ [U] 0＝なし・1＝金髪・2＝茶髪・3＝黒・4＝銀髪。🔶 5＝赤・6〜9（U-19）"
          onChange={v => update(b => writeHairColor(b, Number(v), advanced))}
        />
        {kinds.map(kind => {
          const part = view?.parts[kind]
          const current = part && part.id !== -1 ? findPart(kind, part.id) : undefined
          return (
            <div key={`${k}-${kind}-${advanced}`} className="flex flex-col gap-1">
              <SearchSelectRow
                label={PART_KIND_LABELS[kind]}
                offset={part?.offset ?? 0}
                badges={
                  kind === 'body' ? (
                    <CertaintyBadge mark="❓" text="種類不明" />
                  ) : !PART_WRITE_CONFIRMED[kind] ? (
                    <CertaintyBadge mark="🔶" text="要ゲーム内確認" />
                  ) : undefined
                }
                value={part ? String(part.id) : null}
                currentLabel={part?.id === -1 ? 'なし（FFFF）' : current ? partLabel(current) : `表にない番号 ${part?.id}`}
                options={partOptions(kind, heroGender, advanced)}
                problem={problem}
                hint={advanced ? undefined : `${genderName(heroGender) ?? '不明な性別'}の名前のある部品だけを表示しています`}
                note={PART_NOTES[kind]}
                searchPlaceholder={`${PART_KIND_LABELS[kind]}を検索`}
                onChange={v => update(b => writePart(b, kind, Number(v), advanced))}
              />
              {part && <p className="text-muted-foreground font-mono text-xs">生バイト：{part.raw}</p>}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
