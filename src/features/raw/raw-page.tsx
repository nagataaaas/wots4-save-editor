import { RAW_ANCHORS } from './anchors'
import { memo, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { CollapsibleCard } from '@/components/collapsible-card'
import { FilterSelect } from '@/components/filter-select'
import { InfoTip } from '@/components/info-tip'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { AnchoredCard } from '@/components/anchored-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAdvancedMode } from '@/lib/advanced-mode-context'
import { errorMessage } from '@/lib/error-message'
import { readFileAsBytes } from '@/lib/file-io'
import { formatOffset } from '@/lib/format'
import { tr } from '@/lib/i18n'
import { useSave } from '@/lib/save-context'
import { useWrite } from '@/lib/use-write'
import { WriteResult } from '@/components/write-error'
import {
  RAW_REGIONS,
  RAW_WRITE_MAX,
  applyPatches,
  SEARCH_KINDS,
  buildSearchPattern,
  diffRanges,
  innermostRegion,
  regionIndexTable,
  type RawRegion,
  inspectAt,
  parseHexBytes,
  parseOffset,
  parsePatchScript,
  positionInRegion,
  regionsAt,
  searchBytes,
  utf16Char,
  writeRawBytes,
  type ByteRange,
  type SearchKind,
} from '@/save/raw'

// 生データ：セーブ全体を 16 進で表示する解析用の画面。
// 領域の色分けは docs/save_format/README.md §3 の写し（src/save/raw.ts）。書き換えは上級者モードのときだけ。

const BYTES_PER_ROW = 16
const ROW_HEIGHT = 20
const VISIBLE_ROWS = 24
const OVERSCAN_ROWS = 8
/** 差分・検索の一覧に出す件数の上限 */
const LIST_LIMIT = 500

/** 領域の色（RAW_REGIONS の並び順で順に割り当てる） */
const REGION_TINTS = ['bg-sky-500/15', 'bg-emerald-500/15', 'bg-violet-500/15', 'bg-amber-500/15', 'bg-rose-500/15']

const regionLabel = (region: RawRegion, offset: number) => `${tr(region.label)} ${positionInRegion(region, offset)}`
const previewBytes = (bytes: Uint8Array | readonly number[], offset: number, length: number, limit = 8) =>
  Array.from(bytes.slice(offset, offset + Math.min(length, limit)), hex2).join(' ') + (length > limit ? ' …' : '')

const hex2 = (v: number) => v.toString(16).toUpperCase().padStart(2, '0')

/** 差分の基準。読み込み時のファイル、または比較用に開いた別のファイル */
type DiffBase = 'original' | 'compare'

type CompareFile = { name: string; bytes: Uint8Array }

type HexHandle = { reveal: (offset: number) => void }

export function RawPage() {
  const { save } = useSave()
  // 比較用のファイルと差分の基準は、セーブを読み込み直しても持ち越す（別のセーブと続けて比べられるように）
  const [diffBase, setDiffBase] = useState<DiffBase>('original')
  const [compare, setCompare] = useState<CompareFile | null>(null)

  // 表示するものがすべてバイト列そのものなので、未読み込みのときは共通の案内（NoSaveNotice）だけを出す
  if (!save) return null

  return (
    // 読み込み直したら選択位置を先頭に戻す（前のファイルの範囲外を選んだままにしない）
    <RawEditor
      key={save.loadId}
      original={save.original}
      bytes={save.working}
      diffBase={diffBase}
      onDiffBaseChange={setDiffBase}
      compare={compare}
      onCompareChange={(file) => {
        setCompare(file)
        setDiffBase('compare')
      }}
    />
  )
}

function RawEditor({
  original,
  bytes,
  diffBase,
  onDiffBaseChange,
  compare,
  onCompareChange,
}: {
  original: Uint8Array
  bytes: Uint8Array
  diffBase: DiffBase
  onDiffBaseChange: (base: DiffBase) => void
  compare: CompareFile | null
  onCompareChange: (file: CompareFile) => void
}) {
  const { advanced } = useAdvancedMode()
  const [selected, setSelected] = useState(0)
  const hexRef = useRef<HexHandle>(null)
  const [compareError, setCompareError] = useState<string | null>(null)

  const base = diffBase === 'compare' && compare ? compare.bytes : original
  const diff = useMemo(() => diffRanges(base, bytes, LIST_LIMIT), [bytes, base])

  function goTo(offset: number) {
    setSelected(offset)
    hexRef.current?.reveal(offset)
  }

  async function openCompare(file: File) {
    setCompareError(null)
    try {
      onCompareChange({ name: file.name, bytes: await readFileAsBytes(file) })
    } catch (e) {
      setCompareError(errorMessage(e))
    }
  }

  const sizeMismatch = diffBase === 'compare' && compare && compare.bytes.byteLength !== bytes.byteLength

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[max-content_minmax(16rem,1fr)]">
        <AnchoredCard
          anchor={RAW_ANCHORS.hex}
          className="min-w-0"
          title={tr({ ja: '16進表示', en: 'Hex view' })}
          extra={
            <InfoTip offset={tr({
              ja: `0x0〜0x${(bytes.byteLength - 1).toString(16).toUpperCase()}（${bytes.byteLength.toLocaleString()} B）`,
              en: `0x0–0x${(bytes.byteLength - 1).toString(16).toUpperCase()} (${bytes.byteLength.toLocaleString()} B)`,
            })}>
              {tr({
                ja: '背景色は既知の領域（下の「領域の一覧」）、赤字は差分の基準と違うバイトです。クリックで選択し、矢印キー・PageUp/PageDown で移動できます。',
                en: 'Background colors mark known regions (see "Regions" below); red bytes differ from the comparison base. Click to select, and move with the arrow keys or PageUp/PageDown.',
              })}
            </InfoTip>
          }
          description={tr({
            ja: 'ファイル全体のバイト列です。右の欄は文字として読んだ表示です。',
            en: 'The bytes of the whole file. The right column shows them read as text.',
          })}
        >
          <CardContent className="flex flex-col gap-3">
            <JumpForm size={bytes.byteLength} onJump={goTo} />
            <HexView bytes={bytes} base={base} selected={selected} onSelect={setSelected} ref={hexRef} />
          </CardContent>
        </AnchoredCard>

        <SelectionCard bytes={bytes} offset={selected} advanced={advanced} />
      </div>

      <PatchCard bytes={bytes} advanced={advanced} onJump={goTo} />

      <DiffCard bytes={bytes} base={base} diff={diff} diffBase={diffBase} onDiffBaseChange={onDiffBaseChange}
        compare={compare} compareError={compareError} sizeMismatch={Boolean(sizeMismatch)} openCompare={openCompare} onJump={goTo} />

      <SearchCard bytes={bytes} onJump={goTo} />

      <CollapsibleCard
        anchor={RAW_ANCHORS.regions}
        title={tr({ ja: '領域の一覧', en: 'Regions' })}
        // 終了が分からない領域は色分けしない
        description={tr({
          ja: '分かっている領域の一覧です。行をクリックすると、その位置へ移動します。',
          en: 'Known regions of the file. Click a row to jump to that position.',
        })}
        contentClassName="overflow-x-auto"
      >
        <RegionTable onJump={goTo} />
      </CollapsibleCard>
    </div>
  )
}

function DiffCard({ bytes, base, diff, diffBase, onDiffBaseChange, compare, compareError, sizeMismatch, openCompare, onJump }: {
  bytes: Uint8Array; base: Uint8Array; diff: ReturnType<typeof diffRanges>; diffBase: DiffBase;
  onDiffBaseChange: (base: DiffBase) => void; compare: CompareFile | null; compareError: string | null;
  sizeMismatch: boolean; openCompare: (file: File) => Promise<void>; onJump: (offset: number) => void;
}) {
  return (
    <AnchoredCard
      anchor={RAW_ANCHORS.diff}
      title={tr({ ja: '差分', en: 'Differences' })}
      description={
        <>
          {tr({ ja: '読み込み時から変わった範囲を一覧します。', en: 'Lists the ranges changed since loading.' })}
          <br />
          {tr({
            ja: '比較用のファイルを開くと、別のセーブとの違いも見られます。',
            en: 'Open a comparison file to see differences from another save.',
          })}
          {/* 時間で進む値などは操作と関係なく変わる */}
        </>
      }
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{tr({ ja: '基準', en: 'Base' })}</Label>
            <FilterSelect<DiffBase>
              options={[
                { value: 'original', label: tr({ ja: '読み込み時', en: 'As loaded' }) },
                {
                  value: 'compare',
                  label: compare
                    ? tr({ ja: `比較用：${compare.name}`, en: `Comparison: ${compare.name}` })
                    : tr({ ja: '比較用のファイル（未選択）', en: 'Comparison file (none selected)' }),
                  disabled: !compare,
                },
              ]}
              value={diffBase}
              onChange={onDiffBaseChange}
              className="w-64"
            />
          </div>
          <CompareFileButton onOpen={openCompare} />
        </div>
        {compareError && <p className="text-destructive text-xs">{compareError}</p>}
        {sizeMismatch && compare && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {tr({
              ja: `比較用のファイルのサイズ（${compare.bytes.byteLength.toLocaleString()} B）が今のファイルと違います。短いほうの長さまで比べています。`,
              en: `The comparison file's size (${compare.bytes.byteLength.toLocaleString()} B) differs from the current file. Compared up to the shorter length.`,
            })}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          {tr({
            ja: `違うバイト：${diff.total.toLocaleString()} B（${diff.ranges.length.toLocaleString()}${diff.truncated ? ` 範囲まで表示。${LIST_LIMIT} 範囲を超えた分は省略` : ' 範囲'}）`,
            en: `Differing bytes: ${diff.total.toLocaleString()} B (${diff.ranges.length.toLocaleString()} ${diff.ranges.length === 1 ? 'range' : 'ranges'}${diff.truncated ? ` shown; ranges beyond ${LIST_LIMIT} are omitted` : ''})`,
          })}
        </p>
        <DiffList ranges={diff.ranges} base={base} bytes={bytes} onJump={onJump} />
      </CardContent>
    </AnchoredCard>
  )
}

/** オフセットへの移動 */
function JumpForm({ size, onJump }: { size: number; onJump: (offset: number) => void }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        const r = parseOffset(draft, size)
        if (!r.ok) {
          setError(r.error)
          return
        }
        setError(null)
        onJump(r.value)
      }}
    >
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={tr({ ja: 'オフセット（例：0x36A8）', en: 'Offset (e.g. 0x36A8)' })}
          className="w-56 font-mono"
          aria-label={tr({ ja: '移動先のオフセット', en: 'Offset to jump to' })}
          aria-invalid={error !== null}
        />
        <Button type="submit" variant="outline">
          {tr({ ja: '移動', en: 'Go' })}
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </form>
  )
}

/** 16進ダンプ。表示中の行だけを描く（ファイル全体で約 1.9 万行あるため） */
function HexView({
  bytes,
  base,
  selected,
  onSelect,
  ref: handleRef,
}: {
  bytes: Uint8Array
  base: Uint8Array
  selected: number
  onSelect: (offset: number) => void
  ref: Ref<HexHandle>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const rowCount = Math.ceil(bytes.byteLength / BYTES_PER_ROW)

  /** 選んだ行が見えていなければスクロールする */
  function reveal(offset: number, force: boolean) {
    const el = ref.current
    if (!el) return
    const top = Math.floor(offset / BYTES_PER_ROW) * ROW_HEIGHT
    const visible = top >= el.scrollTop && top + ROW_HEIGHT <= el.scrollTop + VISIBLE_ROWS * ROW_HEIGHT
    if (force || !visible) el.scrollTop = Math.max(0, top - 4 * ROW_HEIGHT)
  }

  useImperativeHandle(handleRef, () => ({ reveal: (offset) => reveal(offset, false) }))
  const regions = useMemo(() => regionIndexTable(bytes.byteLength), [bytes.byteLength])

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -BYTES_PER_ROW,
      ArrowDown: BYTES_PER_ROW,
      PageUp: -BYTES_PER_ROW * VISIBLE_ROWS,
      PageDown: BYTES_PER_ROW * VISIBLE_ROWS,
    }
    let next: number
    if (e.key in step) next = selected + step[e.key]
    else if (e.key === 'Home' && e.ctrlKey) next = 0
    else if (e.key === 'End' && e.ctrlKey) next = bytes.byteLength - 1
    else return
    e.preventDefault()
    next = Math.min(bytes.byteLength - 1, Math.max(0, next))
    onSelect(next)
    reveal(next, false)
  }

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS)
  const last = Math.min(rowCount, Math.ceil((scrollTop + VISIBLE_ROWS * ROW_HEIGHT) / ROW_HEIGHT) + OVERSCAN_ROWS)
  const rows: number[] = []
  for (let r = first; r < last; r++) rows.push(r)

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="grid"
      aria-label={tr({ ja: '16進表示', en: 'Hex view' })}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      onKeyDown={handleKeyDown}
      className="focus-visible:ring-ring/50 overflow-auto rounded-md border font-mono text-xs outline-none focus-visible:ring-[3px]"
      style={{ height: (VISIBLE_ROWS + 1) * ROW_HEIGHT + 2 }}
    >
      <div className="bg-card text-muted-foreground sticky top-0 z-10 flex w-max items-center border-b" style={{ height: ROW_HEIGHT }}>
        <span className="w-16 shrink-0 px-2">offset</span>
        {Array.from({ length: BYTES_PER_ROW }, (_, i) => (
          <span key={i} className={`w-6 shrink-0 text-center ${i === 8 ? 'ml-2' : ''}`}>
            {hex2(i)}
          </span>
        ))}
        <span className="ml-3 w-34 shrink-0 pr-2">UTF-16LE</span>
      </div>
      <div className="relative w-max" style={{ height: rowCount * ROW_HEIGHT }}>
        {rows.map((r) => (
          <HexRow key={r} row={r} bytes={bytes} base={base} regions={regions} selected={selected >= r * BYTES_PER_ROW && selected < (r + 1) * BYTES_PER_ROW ? selected : -1} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

const HexRow = memo(function HexRow({
  row,
  bytes,
  base,
  selected,
  onSelect,
  regions,
}: {
  row: number
  bytes: Uint8Array
  base: Uint8Array
  selected: number
  onSelect: (offset: number) => void
  regions: Int16Array
}) {
  const start = row * BYTES_PER_ROW
  const end = Math.min(bytes.byteLength, start + BYTES_PER_ROW)
  const changed = (i: number) => i < base.byteLength && base[i] !== bytes[i]
  const cells = Array.from({ length: end - start }, (_, col) => {
    const i = start + col
    const v = bytes[i]
    const isSel = i === selected
    const regionIndex = regions[i]
    const region = RAW_REGIONS[regionIndex]
    return (
      <span
        key={i}
        title={`${formatOffset(i)}${region ? `${tr({ ja: '　', en: ' ' })}${regionLabel(region, i)}` : ''}`}
        onClick={() => onSelect(i)}
        className={[
          'w-6 shrink-0 cursor-pointer text-center',
          col === 8 ? 'ml-2' : '',
          isSel ? 'bg-primary text-primary-foreground' : regionIndex >= 0 ? REGION_TINTS[regionIndex % REGION_TINTS.length] : '',
          isSel ? '' : changed(i) ? 'font-bold text-red-600 dark:text-red-400' : v === 0 ? 'text-muted-foreground/60' : '',
        ].join(' ')}
      >
        {hex2(v)}
      </span>
    )
  })
  const chars = Array.from({ length: Math.ceil((end - start) / 2) }, (_, n) => {
    const i = start + n * 2
    const unit = i + 1 < bytes.byteLength ? bytes[i] | (bytes[i + 1] << 8) : bytes[i]
    const isSel = selected === i || selected === i + 1
    return (
      <span
        key={i}
        onClick={() => onSelect(i)}
        className={`inline-block w-4 cursor-pointer text-center ${isSel ? 'bg-primary text-primary-foreground' : changed(i) || changed(i + 1) ? 'text-red-600 dark:text-red-400' : ''}`}
      >
        {utf16Char(unit)}
      </span>
    )
  })
  return (
    <div role="row" className="absolute left-0 flex items-center" style={{ top: row * ROW_HEIGHT, height: ROW_HEIGHT }}>
      <span className="text-muted-foreground w-16 shrink-0 px-2">{start.toString(16).toUpperCase().padStart(5, '0')}</span>
      {cells}
      <span className="ml-3 w-34 shrink-0 pr-2">{chars}</span>
    </div>
  )
})

/** 選択中のバイトの位置・領域・値と、上書きの入力（上級者モードのときだけ） */
function SelectionCard({
  bytes,
  offset,
  advanced,
}: {
  bytes: Uint8Array
  offset: number
  advanced: boolean
}) {
  const regions = regionsAt(offset)
  return (
    <AnchoredCard
      anchor={RAW_ANCHORS.byte}
      searchLabel={tr({ ja: '選んだバイト', en: 'Selected byte' })}
      className="min-w-0"
      title={<span className="font-mono">{formatOffset(offset)}</span>}
      description={
        regions.length === 0
          ? tr({ ja: '既知の領域に入っていない位置です', en: 'This position is not in a known region' })
          : regions.map((r) => (
              <span key={`${r.start}-${r.chunk}-${r.label.ja}`} className="block">
                {regionLabel(r, offset)}
              </span>
            ))
      }
    >
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {inspectAt(bytes, offset).map((v) => (
            <div key={v.label} className="contents">
              <dt className="text-muted-foreground">{v.label}</dt>
              <dd className="font-mono break-all">{v.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-xs">
          {tr({
            ja: '複数バイトの値はリトルエンディアンで、選択中の位置から読んでいます。',
            en: 'Multi-byte values are read little-endian from the selected position.',
          })}
        </p>

        <SelectionForm key={offset} bytes={bytes} offset={offset} advanced={advanced} />
      </CardContent>
    </AnchoredCard>
  )
}

function SelectionForm({ bytes, offset, advanced }: {
  bytes: Uint8Array
  offset: number
  advanced: boolean
}) {
  // 選んだ位置から 1 行分の今の値を、入力の初期値にする
  const [draft, setDraft] = useState(() =>
    previewBytes(bytes, offset, Math.min(bytes.byteLength - offset, 4)),
  )
  const { tryWrite, message, error, setMessage } = useWrite()

  function submit() {
    const r = parseHexBytes(draft)
    if (!r.ok) {
      setMessage({ error: true, text: r.error })
      return
    }
    tryWrite((b) => writeRawBytes(b, offset, r.value), tr({
      ja: `${formatOffset(offset)} から ${r.value.length} B を書き換えました`,
      en: `Wrote ${r.value.length} B from ${formatOffset(offset)}`,
    }))
  }

  return (
    <form
      className="flex flex-col gap-1.5 border-t pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Label htmlFor="raw-write">{tr({ ja: 'ここから上書き', en: 'Overwrite from here' })}</Label>
      <div className="flex gap-2">
        <Input
          id="raw-write"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setMessage(null)
          }}
          disabled={!advanced}
          className="font-mono"
          aria-invalid={error !== null}
        />
        <Button type="submit" variant="outline" disabled={!advanced}>
          {tr({ ja: '書き込む', en: 'Write' })}
        </Button>
      </div>
      {advanced ? (
        <p className="text-muted-foreground text-xs">
          {tr({
            ja: `16進のバイト列（例：01 00 FF）を、選択中の位置から上書きします（最大 ${RAW_WRITE_MAX} B）。値の意味は確かめないので、書いた値によってはゲームで読めなくなることがあります。`,
            en: `Overwrites hex bytes (e.g. 01 00 FF) starting at the selected position (up to ${RAW_WRITE_MAX} B). The values are not checked, so some values may make the save unreadable in the game.`,
          })}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          {tr({
            ja: 'サイドバーの上級者モードをオンにすると、バイト列を直接書き換えられます。',
            en: 'Turn on Advanced Mode in the sidebar to edit bytes directly.',
          })}
        </p>
      )}
      <WriteResult message={message} />
    </form>
  )
}

function CompareFileButton({ onOpen }: { onOpen: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={ref}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onOpen(file)
          // 同じファイルを選び直しても onChange が来るようにする
          e.target.value = ''
        }}
      />
      <Button variant="outline" onClick={() => ref.current?.click()}>
        {tr({ ja: '比較用のファイルを開く', en: 'Open comparison file' })}
      </Button>
    </>
  )
}

function DiffList({
  ranges,
  base,
  bytes,
  onJump,
}: {
  ranges: ByteRange[]
  base: Uint8Array
  bytes: Uint8Array
  onJump: (offset: number) => void
}) {
  if (ranges.length === 0) return <p className="text-muted-foreground text-sm">{tr({ ja: '違いはありません。', en: 'No differences.' })}</p>
  // 長い範囲は先頭の数バイトだけ値を出す（previewBytes）
  return (
    <div className="max-h-80 overflow-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-card text-muted-foreground sticky top-0">
          <tr className="border-b text-left">
            <th className="px-2 py-1 font-normal">{tr({ ja: '位置', en: 'Offset' })}</th>
            <th className="px-2 py-1 font-normal">{tr({ ja: '長さ', en: 'Length' })}</th>
            <th className="px-2 py-1 font-normal">{tr({ ja: '基準', en: 'Base' })}</th>
            <th className="px-2 py-1 font-normal">{tr({ ja: '今', en: 'Now' })}</th>
            <th className="px-2 py-1 font-normal">{tr({ ja: '領域', en: 'Region' })}</th>
          </tr>
        </thead>
        <tbody>
          {ranges.map((r) => {
            const region = innermostRegion(r.start)
            return (
              <tr key={r.start} className="hover:bg-muted/50 cursor-pointer border-b last:border-0" onClick={() => onJump(r.start)}>
                <td className="px-2 py-1 font-mono">{formatOffset(r.start)}</td>
                <td className="px-2 py-1">{r.end - r.start + 1} B</td>
                <td className="px-2 py-1 font-mono">{previewBytes(base, r.start, r.end - r.start + 1)}</td>
                <td className="px-2 py-1 font-mono">{previewBytes(bytes, r.start, r.end - r.start + 1)}</td>
                <td className="px-2 py-1">{region ? regionLabel(region, r.start) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SearchCard({ bytes, onJump }: { bytes: Uint8Array; onJump: (offset: number) => void }) {
  const [kind, setKind] = useState<SearchKind>('hex')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ offsets: number[]; truncated: boolean } | null>(null)
  const placeholderText = SEARCH_KINDS.find((s) => s.kind === kind)?.placeholder
  const placeholder = placeholderText && tr(placeholderText)

  return (
    <AnchoredCard
      anchor={RAW_ANCHORS.search}
      title={tr({ ja: '検索', en: 'Search' })}
      // 今のバイト列（編集を含む）から探す。数値はリトルエンディアンのバイト列として探す
      description={tr({
        ja: 'セーブの中から値や文字列を探せます。編集中の内容も対象です。',
        en: 'Search the save for values or text, including unsaved edits.',
      })}
    >
      <CardContent className="flex flex-col gap-3">
        <form
          className="flex flex-wrap items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const p = buildSearchPattern(kind, draft)
            if (!p.ok) {
              setError(p.error)
              setResult(null)
              return
            }
            setError(null)
            setResult(searchBytes(bytes, p.value, LIST_LIMIT))
          }}
        >
          <FilterSelect
            options={SEARCH_KINDS.map((s) => ({ value: s.kind, label: tr(s.label) }))}
            value={kind}
            onChange={(value) => {
              setKind(value)
              setError(null)
              setResult(null)
            }}
            className="w-44"
            aria-label={tr({ ja: '検索の種類', en: 'Search type' })}
          />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className={`min-w-0 flex-1 basis-56 ${kind === 'utf16' ? '' : 'font-mono'}`}
            aria-label={tr({ ja: '検索する値', en: 'Value to search for' })}
            aria-invalid={error !== null}
          />
          <Button type="submit" variant="outline">
            {tr({ ja: '検索', en: 'Search' })}
          </Button>
        </form>
        {error && <p className="text-destructive text-xs">{error}</p>}
        {result && (
          <>
            <p className="text-muted-foreground text-xs">
              {result.offsets.length === 0
                ? tr({ ja: '見つかりません。', en: 'No matches.' })
                : tr({
                    ja: `${result.offsets.length.toLocaleString()} 件${result.truncated ? `（${LIST_LIMIT} 件で打ち切り）` : ''}`,
                    en: `${result.offsets.length.toLocaleString()} ${result.offsets.length === 1 ? 'match' : 'matches'}${result.truncated ? ` (stopped at ${LIST_LIMIT})` : ''}`,
                  })}
            </p>
            {result.offsets.length > 0 && (
              <div className="flex max-h-48 flex-wrap gap-1 overflow-auto">
                {result.offsets.map((o) => {
                  const region = innermostRegion(o)
                  return (
                    <Button
                      key={o}
                      variant="ghost"
                      size="xs"
                      className="font-mono"
                      title={region ? regionLabel(region, o) : undefined}
                      onClick={() => onJump(o)}
                    >
                      {formatOffset(o)}
                    </Button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </AnchoredCard>
  )
}

function RegionTable({ onJump }: { onJump: (offset: number) => void }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr className="border-b text-left">
          <th className="px-2 py-1 font-normal">{tr({ ja: '開始', en: 'Start' })}</th>
          <th className="px-2 py-1 font-normal">{tr({ ja: '終了', en: 'End' })}</th>
          <th className="px-2 py-1 font-normal">{tr({ ja: '内容', en: 'Contents' })}</th>
        </tr>
      </thead>
      <tbody>
        {RAW_REGIONS.map((r, i) => (
          <tr key={i} className="hover:bg-muted/50 cursor-pointer border-b last:border-0" onClick={() => onJump(r.start)}>
            <td className="px-2 py-1 font-mono">
              <span className={`mr-1.5 inline-block size-2.5 rounded-sm align-middle ${r.end === null ? 'border' : REGION_TINTS[i % REGION_TINTS.length]}`} />
              {formatOffset(r.start)}
            </td>
            <td className="px-2 py-1 font-mono">{r.end === null ? '—' : formatOffset(r.end)}</td>
            <td className="px-2 py-1">
              {tr(r.label)}
              {r.recordSize ? recordsText(r.recordSize, ((r.end ?? r.start) - r.start + 1) / r.recordSize) : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** 領域の1件のバイト数と件数 */
function recordsText(recordSize: number, count: number): string {
  const size = `0x${recordSize.toString(16).toUpperCase()} B`
  return tr({ ja: `（${size} × ${count} 件）`, en: ` (${size} × ${count} ${count === 1 ? 'record' : 'records'})` })
}

/** 行番号つきのエラー・警告 */
const lineMessage = (line: number, message: string) => tr({ ja: `${line} 行目：${message}`, en: `Line ${line}: ${message}` })

/** まとめて書き込む欄の例。言語で変わるので、描くときに作る */
const patchPlaceholder = () => `0x3780 02 ff 00 11
0x3790 01 ff
${tr({ ja: '# コメント（# または // 以降）と空行は無視します', en: '# Comments (after # or //) and blank lines are ignored' })}`

/** 「オフセット バイト列」を複数行まとめて書き込む（上級者モードのときだけ） */
function PatchCard({
  bytes,
  advanced,
  onJump,
}: {
  bytes: Uint8Array
  advanced: boolean
  onJump: (offset: number) => void
}) {
  const [text, setText] = useState('')
  const { tryWrite, message, setMessage } = useWrite()
  const parsed = useMemo(() => (text.trim() === '' ? null : parsePatchScript(text, bytes.byteLength)), [text, bytes.byteLength])
  const canApply = advanced && parsed !== null && parsed.errors.length === 0 && parsed.patches.length > 0

  function apply() {
    if (!parsed || !canApply) return
    const { patches } = parsed
    const total = patches.reduce((n, p) => n + p.values.length, 0)
    tryWrite((b) => applyPatches(b, patches), tr({
      ja: `${patches.length} 行（${total} B）を書き込みました`,
      en: `Wrote ${patches.length} ${patches.length === 1 ? 'line' : 'lines'} (${total} B)`,
    }))
  }

  return (
    <AnchoredCard
      anchor={RAW_ANCHORS.bulkWrite}
      title={tr({ ja: 'まとめて書き込む', en: 'Bulk write' })}
      extra={
        <InfoTip>
          {tr({
            ja: '1行に「オフセット（16進、0x は省略可） バイト列（16進）」を書きます。オフセットの後の「:」とバイト間の空白は省略できます。範囲が重なる行は後の行の値が残ります。',
            en: 'Write "offset (hex, 0x optional) bytes (hex)" on each line. The ":" after the offset and the spaces between bytes are optional. When lines overlap, the later line\'s values are kept.',
          })}
        </InfoTip>
      }
      description={
        <>
          {tr({
            ja: 'オフセットとバイト列の組を貼り付けて、まとめて上書きできます。',
            en: 'Paste pairs of offsets and bytes to overwrite them all at once.',
          })}
          <br />
          {tr({
            ja: '1行でも読めない行があれば、何も書き込みません。',
            en: 'If any line cannot be read, nothing is written.',
          })}
        </>
      }
    >
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setMessage(null)
          }}
          placeholder={patchPlaceholder()}
          rows={6}
          spellCheck={false}
          className="font-mono text-xs"
          aria-label={tr({ ja: 'まとめて書き込むオフセットとバイト列', en: 'Offsets and bytes to bulk write' })}
          aria-invalid={parsed !== null && parsed.errors.length > 0}
        />

        {parsed && parsed.errors.length > 0 && (
          <ul className="text-destructive flex flex-col gap-0.5 text-xs">
            {parsed.errors.map((e, i) => (
              <li key={i}>{e.line > 0 ? lineMessage(e.line, e.message) : e.message}</li>
            ))}
          </ul>
        )}
        {parsed && parsed.warnings.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-xs text-amber-600 dark:text-amber-400">
            {parsed.warnings.map((w, i) => (
              <li key={i}>{lineMessage(w.line, w.message)}</li>
            ))}
          </ul>
        )}

        {parsed && parsed.patches.length > 0 && (
          <div className="max-h-64 overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-card text-muted-foreground sticky top-0">
                <tr className="border-b text-left">
                  <th className="px-2 py-1 font-normal">{tr({ ja: '行', en: 'Line' })}</th>
                  <th className="px-2 py-1 font-normal">{tr({ ja: '位置', en: 'Offset' })}</th>
                  <th className="px-2 py-1 font-normal">{tr({ ja: '長さ', en: 'Length' })}</th>
                  <th className="px-2 py-1 font-normal">{tr({ ja: '今', en: 'Now' })}</th>
                  <th className="px-2 py-1 font-normal">{tr({ ja: '書く値', en: 'New value' })}</th>
                  <th className="px-2 py-1 font-normal">{tr({ ja: '領域', en: 'Region' })}</th>
                </tr>
              </thead>
              <tbody>
                {parsed.patches.map((p) => {
                  const region = innermostRegion(p.offset)
                  const same = p.values.every((v, i) => bytes[p.offset + i] === v)
                  return (
                    <tr key={p.line} className="hover:bg-muted/50 cursor-pointer border-b last:border-0" onClick={() => onJump(p.offset)}>
                      <td className="text-muted-foreground px-2 py-1">{p.line}</td>
                      <td className="px-2 py-1 font-mono">{formatOffset(p.offset)}</td>
                      <td className="px-2 py-1">{p.values.length} B</td>
                      <td className="px-2 py-1 font-mono">{previewBytes(bytes, p.offset, p.values.length)}</td>
                      <td className={`px-2 py-1 font-mono ${same ? 'text-muted-foreground' : 'font-bold'}`}>
                        {previewBytes(p.values, 0, p.values.length)}
                        {same && tr({ ja: '（同じ）', en: ' (same)' })}
                      </td>
                      <td className="px-2 py-1">{region ? regionLabel(region, p.offset) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={apply} disabled={!canApply}>
            {tr({ ja: 'まとめて書き込む', en: 'Bulk write' })}
          </Button>
          {!advanced && (
            <p className="text-muted-foreground text-xs">
              {tr({ ja: 'サイドバーの上級者モードをオンにすると書き込めます。', en: 'Turn on Advanced Mode in the sidebar to write.' })}
            </p>
          )}
          <WriteResult message={message} />
        </div>
        <p className="text-muted-foreground text-xs">
          {tr({
            ja: '値の意味は確かめずにそのまま書きます。書いた値によってはゲームで読めなくなることがあります。ダウンロードするまでファイルは変わりません（サイドバーの「保存」で書き出します）。',
            en: 'Values are written as is, without checking their meaning. Some values may make the save unreadable in the game. The file does not change until you download it (use "Save" in the sidebar).',
          })}
        </p>
      </CardContent>
    </AnchoredCard>
  )
}
