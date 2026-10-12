import { RAW_ANCHORS } from './anchors'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CollapsibleCard } from '@/components/collapsible-card'
import { InfoTip } from '@/components/info-tip'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScopeAnchorLink } from '@/components/anchor-link'
import { AnchoredCard } from '@/components/anchored-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdvancedMode } from '@/lib/advanced-mode-context'
import { readFileAsBytes } from '@/lib/file-io'
import { formatOffset } from '@/lib/format'
import { useSave } from '@/lib/save-context'
import {
  RAW_REGIONS,
  RAW_WRITE_MAX,
  applyPatches,
  SEARCH_KINDS,
  buildSearchPattern,
  diffRanges,
  innermostRegion,
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
  type RawPatch,
  type SearchKind,
} from '@/save/raw'

// 生データ：セーブ全体を 16 進で表示する解析用の画面。
// 領域の色分けは docs/save_format/README.md §3 の写し（src/save/raw.ts）。書き換えは上級者モードのときだけ。

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

const BYTES_PER_ROW = 16
const ROW_HEIGHT = 20
const VISIBLE_ROWS = 24
const OVERSCAN_ROWS = 8
/** 差分・検索の一覧に出す件数の上限 */
const LIST_LIMIT = 500

/** 領域の色（RAW_REGIONS の並び順で順に割り当てる） */
const REGION_TINTS = ['bg-sky-500/15', 'bg-emerald-500/15', 'bg-violet-500/15', 'bg-amber-500/15', 'bg-rose-500/15']

const regionTint = (offset: number) => {
  const r = innermostRegion(offset)
  return r ? REGION_TINTS[RAW_REGIONS.indexOf(r) % REGION_TINTS.length] : ''
}

const hex2 = (v: number) => v.toString(16).toUpperCase().padStart(2, '0')

/** 差分の基準。読み込み時のファイル、または比較用に開いた別のファイル */
type DiffBase = 'original' | 'compare'

type CompareFile = { name: string; bytes: Uint8Array }

/** 一覧からの移動の指示。同じ位置へ続けて移動できるよう、毎回新しいオブジェクトにする */
type Jump = { offset: number }

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
  const { update } = useSave()
  const { advanced } = useAdvancedMode()
  const [selected, setSelected] = useState(0)
  const [jump, setJump] = useState<Jump | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)

  const base = diffBase === 'compare' && compare ? compare.bytes : original
  const diff = useMemo(() => diffRanges(base, bytes, LIST_LIMIT), [bytes, base])

  function goTo(offset: number) {
    setSelected(offset)
    setJump({ offset })
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
        <AnchoredCard anchor={RAW_ANCHORS.hex} searchLabel="16進表示" className="min-w-0">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <ScopeAnchorLink />
              16進表示
              <InfoTip offset={`0x0〜0x${(bytes.byteLength - 1).toString(16).toUpperCase()}（${bytes.byteLength.toLocaleString()} B）`}>
                背景色は既知の領域（下の「領域の一覧」）、赤字は差分の基準と違うバイトです。クリックで選択し、矢印キー・PageUp/PageDown で移動できます。
              </InfoTip>
            </CardTitle>
            <CardDescription>ファイル全体のバイト列です。右の欄は文字として読んだ表示です。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <JumpForm size={bytes.byteLength} onJump={goTo} />
            <HexView bytes={bytes} base={base} selected={selected} onSelect={setSelected} jump={jump} />
          </CardContent>
        </AnchoredCard>

        <SelectionCard
          key={selected}
          bytes={bytes}
          offset={selected}
          advanced={advanced}
          onWrite={(values) => update((b) => writeRawBytes(b, selected, values))}
        />
      </div>

      <PatchCard bytes={bytes} advanced={advanced} onApply={(patches) => update((b) => applyPatches(b, patches))} onJump={goTo} />

      <AnchoredCard anchor={RAW_ANCHORS.diff} searchLabel="差分">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2"><ScopeAnchorLink />差分</CardTitle>
          <CardDescription>
            読み込み時から変わった範囲を一覧します。
            <br />
            比較用のファイルを開くと、別のセーブとの違いも見られます。
            {/* 時間で進む値などは操作と関係なく変わる */}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>基準</Label>
              <Select
                value={diffBase}
                items={[
                  { value: 'original', label: '読み込み時' },
                  { value: 'compare', label: compare ? `比較用：${compare.name}` : '比較用のファイル（未選択）' },
                ]}
                onValueChange={(v) => v !== null && onDiffBaseChange(v as DiffBase)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">読み込み時</SelectItem>
                  <SelectItem value="compare" disabled={!compare}>
                    {compare ? `比較用：${compare.name}` : '比較用のファイル（未選択）'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CompareFileButton onOpen={openCompare} />
          </div>
          {compareError && <p className="text-destructive text-xs">{compareError}</p>}
          {sizeMismatch && compare && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              比較用のファイルのサイズ（{compare.bytes.byteLength.toLocaleString()} B）が今のファイルと違います。短いほうの長さまで比べています。
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            違うバイト：{diff.total.toLocaleString()} B（{diff.ranges.length.toLocaleString()}
            {diff.truncated ? ` 範囲まで表示。${LIST_LIMIT} 範囲を超えた分は省略` : ' 範囲'}）
          </p>
          <DiffList ranges={diff.ranges} base={base} bytes={bytes} onJump={goTo} />
        </CardContent>
      </AnchoredCard>

      <SearchCard bytes={bytes} onJump={goTo} />

      <CollapsibleCard
        anchor={RAW_ANCHORS.regions}
        title="領域の一覧"
        // 終了が分からない領域は色分けしない
        description="分かっている領域の一覧です。行をクリックすると、その位置へ移動します。"
        contentClassName="overflow-x-auto"
      >
        <RegionTable onJump={goTo} />
      </CollapsibleCard>
    </div>
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
          placeholder="オフセット（例：0x36A8）"
          className="w-56 font-mono"
          aria-label="移動先のオフセット"
          aria-invalid={error !== null}
        />
        <Button type="submit" variant="outline">
          移動
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
  jump,
}: {
  bytes: Uint8Array
  base: Uint8Array
  selected: number
  onSelect: (offset: number) => void
  jump: Jump | null
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

  useEffect(() => {
    if (jump) reveal(jump.offset, false)
  }, [jump])

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
      aria-label="16進表示"
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
          <HexRow key={r} row={r} bytes={bytes} base={base} selected={selected} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function HexRow({
  row,
  bytes,
  base,
  selected,
  onSelect,
}: {
  row: number
  bytes: Uint8Array
  base: Uint8Array
  selected: number
  onSelect: (offset: number) => void
}) {
  const start = row * BYTES_PER_ROW
  const end = Math.min(bytes.byteLength, start + BYTES_PER_ROW)
  const changed = (i: number) => i < base.byteLength && base[i] !== bytes[i]
  const cells = Array.from({ length: end - start }, (_, col) => {
    const i = start + col
    const v = bytes[i]
    const isSel = i === selected
    const region = innermostRegion(i)
    return (
      <span
        key={i}
        title={`${formatOffset(i)}${region ? `　${region.label} ${positionInRegion(region, i)}` : ''}`}
        onClick={() => onSelect(i)}
        className={[
          'w-6 shrink-0 cursor-pointer text-center',
          col === 8 ? 'ml-2' : '',
          isSel ? 'bg-primary text-primary-foreground' : regionTint(i),
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
}

/** 選択中のバイトの位置・領域・値と、上書きの入力（上級者モードのときだけ） */
function SelectionCard({
  bytes,
  offset,
  advanced,
  onWrite,
}: {
  bytes: Uint8Array
  offset: number
  advanced: boolean
  onWrite: (values: number[]) => void
}) {
  const regions = regionsAt(offset)
  // 選んだ位置から 1 行分の今の値を、入力の初期値にする
  const [draft, setDraft] = useState(() =>
    Array.from(bytes.subarray(offset, Math.min(bytes.byteLength, offset + 4)), hex2).join(' '),
  )
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function submit() {
    setDone(null)
    const r = parseHexBytes(draft)
    if (!r.ok) {
      setError(r.error)
      return
    }
    try {
      onWrite(r.value)
      setError(null)
      setDone(`${formatOffset(offset)} から ${r.value.length} B を書き換えました`)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <AnchoredCard anchor={RAW_ANCHORS.byte} searchLabel="選んだバイト" className="min-w-0">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 font-mono"><ScopeAnchorLink />{formatOffset(offset)}</CardTitle>
        <CardDescription>
          {regions.length === 0
            ? '既知の領域に入っていない位置です'
            : regions.map((r) => (
                <span key={`${r.start}-${r.chunk}-${r.label}`} className="block">
                  {r.label} {positionInRegion(r, offset)}
                </span>
              ))}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {inspectAt(bytes, offset).map((v) => (
            <div key={v.label} className="contents">
              <dt className="text-muted-foreground">{v.label}</dt>
              <dd className="font-mono break-all">{v.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-xs">複数バイトの値はリトルエンディアンで、選択中の位置から読んでいます。</p>

        <form
          className="flex flex-col gap-1.5 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Label htmlFor="raw-write">ここから上書き</Label>
          <div className="flex gap-2">
            <Input
              id="raw-write"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setError(null)
                setDone(null)
              }}
              disabled={!advanced}
              className="font-mono"
              aria-invalid={error !== null}
            />
            <Button type="submit" variant="outline" disabled={!advanced}>
              書き込む
            </Button>
          </div>
          {advanced ? (
            <p className="text-muted-foreground text-xs">
              16進のバイト列（例：01 00 FF）を、選択中の位置から上書きします（最大 {RAW_WRITE_MAX} B）。値の意味は確かめないので、書いた値によってはゲームで読めなくなることがあります。
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">サイドバーの上級者モードをオンにすると、バイト列を直接書き換えられます。</p>
          )}
          {error && <p className="text-destructive text-xs">{error}</p>}
          {done && <p className="text-xs text-emerald-600 dark:text-emerald-400">{done}</p>}
        </form>
      </CardContent>
    </AnchoredCard>
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
        比較用のファイルを開く
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
  if (ranges.length === 0) return <p className="text-muted-foreground text-sm">違いはありません。</p>
  // 長い範囲は先頭の数バイトだけ値を出す
  const preview = (b: Uint8Array, r: ByteRange) => {
    const n = Math.min(r.end - r.start + 1, 8)
    return Array.from(b.subarray(r.start, r.start + n), hex2).join(' ') + (r.end - r.start + 1 > n ? ' …' : '')
  }
  return (
    <div className="max-h-80 overflow-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-card text-muted-foreground sticky top-0">
          <tr className="border-b text-left">
            <th className="px-2 py-1 font-normal">位置</th>
            <th className="px-2 py-1 font-normal">長さ</th>
            <th className="px-2 py-1 font-normal">基準</th>
            <th className="px-2 py-1 font-normal">今</th>
            <th className="px-2 py-1 font-normal">領域</th>
          </tr>
        </thead>
        <tbody>
          {ranges.map((r) => {
            const region = innermostRegion(r.start)
            return (
              <tr key={r.start} className="hover:bg-muted/50 cursor-pointer border-b last:border-0" onClick={() => onJump(r.start)}>
                <td className="px-2 py-1 font-mono">{formatOffset(r.start)}</td>
                <td className="px-2 py-1">{r.end - r.start + 1} B</td>
                <td className="px-2 py-1 font-mono">{preview(base, r)}</td>
                <td className="px-2 py-1 font-mono">{preview(bytes, r)}</td>
                <td className="px-2 py-1">{region ? `${region.label} ${positionInRegion(region, r.start)}` : '—'}</td>
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
  const placeholder = SEARCH_KINDS.find((s) => s.kind === kind)?.placeholder

  return (
    <AnchoredCard anchor={RAW_ANCHORS.search} searchLabel="検索">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2"><ScopeAnchorLink />検索</CardTitle>
        {/* 今のバイト列（編集を含む）から探す。数値はリトルエンディアンのバイト列として探す */}
        <CardDescription>セーブの中から値や文字列を探せます。編集中の内容も対象です。</CardDescription>
      </CardHeader>
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
          <Select
            value={kind}
            items={SEARCH_KINDS.map((s) => ({ value: s.kind, label: s.label }))}
            onValueChange={(v) => {
              if (v === null) return
              setKind(v as SearchKind)
              setError(null)
              setResult(null)
            }}
          >
            <SelectTrigger className="w-44" aria-label="検索の種類">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_KINDS.map((s) => (
                <SelectItem key={s.kind} value={s.kind}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className={`min-w-0 flex-1 basis-56 ${kind === 'utf16' ? '' : 'font-mono'}`}
            aria-label="検索する値"
            aria-invalid={error !== null}
          />
          <Button type="submit" variant="outline">
            検索
          </Button>
        </form>
        {error && <p className="text-destructive text-xs">{error}</p>}
        {result && (
          <>
            <p className="text-muted-foreground text-xs">
              {result.offsets.length === 0
                ? '見つかりません。'
                : `${result.offsets.length.toLocaleString()} 件${result.truncated ? `（${LIST_LIMIT} 件で打ち切り）` : ''}`}
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
                      title={region ? `${region.label} ${positionInRegion(region, o)}` : undefined}
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
          <th className="px-2 py-1 font-normal">開始</th>
          <th className="px-2 py-1 font-normal">終了</th>
          <th className="px-2 py-1 font-normal">内容</th>
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
              {r.label}
              {r.recordSize ? `（${r.recordSize === 0xa0 ? '0xA0' : r.recordSize} B × ${((r.end ?? r.start) - r.start + 1) / r.recordSize} 件）` : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const PATCH_PLACEHOLDER = `0x3780 02 ff 00 11
0x3790 01 ff
# コメント（# または // 以降）と空行は無視します`

/** 「オフセット バイト列」を複数行まとめて書き込む（上級者モードのときだけ） */
function PatchCard({
  bytes,
  advanced,
  onApply,
  onJump,
}: {
  bytes: Uint8Array
  advanced: boolean
  onApply: (patches: RawPatch[]) => void
  onJump: (offset: number) => void
}) {
  const [text, setText] = useState('')
  const [applyError, setApplyError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const parsed = useMemo(() => (text.trim() === '' ? null : parsePatchScript(text, bytes.byteLength)), [text, bytes.byteLength])
  const canApply = advanced && parsed !== null && parsed.errors.length === 0 && parsed.patches.length > 0
  const preview = (b: Uint8Array, p: RawPatch) => {
    const n = Math.min(p.values.length, 8)
    return Array.from(b.subarray(p.offset, p.offset + n), hex2).join(' ') + (p.values.length > n ? ' …' : '')
  }

  function apply() {
    if (!parsed || !canApply) return
    try {
      onApply(parsed.patches)
      setApplyError(null)
      const total = parsed.patches.reduce((n, p) => n + p.values.length, 0)
      setDone(`${parsed.patches.length} 行（${total} B）を書き込みました`)
    } catch (e) {
      setApplyError(errorMessage(e))
      setDone(null)
    }
  }

  return (
    <AnchoredCard anchor={RAW_ANCHORS.bulkWrite} searchLabel="まとめて書き込む">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <ScopeAnchorLink />
          まとめて書き込む
          <InfoTip>
            1行に「オフセット（16進、0x は省略可） バイト列（16進）」を書きます。オフセットの後の「:」とバイト間の空白は省略できます。範囲が重なる行は後の行の値が残ります。
          </InfoTip>
        </CardTitle>
        <CardDescription>
          オフセットとバイト列の組を貼り付けて、まとめて上書きできます。
          <br />
          1行でも読めない行があれば、何も書き込みません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setApplyError(null)
            setDone(null)
          }}
          placeholder={PATCH_PLACEHOLDER}
          rows={6}
          spellCheck={false}
          className="font-mono text-xs"
          aria-label="まとめて書き込むオフセットとバイト列"
          aria-invalid={parsed !== null && parsed.errors.length > 0}
        />

        {parsed && parsed.errors.length > 0 && (
          <ul className="text-destructive flex flex-col gap-0.5 text-xs">
            {parsed.errors.map((e, i) => (
              <li key={i}>{e.line > 0 ? `${e.line} 行目：${e.message}` : e.message}</li>
            ))}
          </ul>
        )}
        {parsed && parsed.warnings.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-xs text-amber-600 dark:text-amber-400">
            {parsed.warnings.map((w, i) => (
              <li key={i}>
                {w.line} 行目：{w.message}
              </li>
            ))}
          </ul>
        )}

        {parsed && parsed.patches.length > 0 && (
          <div className="max-h-64 overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-card text-muted-foreground sticky top-0">
                <tr className="border-b text-left">
                  <th className="px-2 py-1 font-normal">行</th>
                  <th className="px-2 py-1 font-normal">位置</th>
                  <th className="px-2 py-1 font-normal">長さ</th>
                  <th className="px-2 py-1 font-normal">今</th>
                  <th className="px-2 py-1 font-normal">書く値</th>
                  <th className="px-2 py-1 font-normal">領域</th>
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
                      <td className="px-2 py-1 font-mono">{preview(bytes, p)}</td>
                      <td className={`px-2 py-1 font-mono ${same ? 'text-muted-foreground' : 'font-bold'}`}>
                        {Array.from(p.values.slice(0, 8), hex2).join(' ') + (p.values.length > 8 ? ' …' : '')}
                        {same && '（同じ）'}
                      </td>
                      <td className="px-2 py-1">{region ? `${region.label} ${positionInRegion(region, p.offset)}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={apply} disabled={!canApply}>
            まとめて書き込む
          </Button>
          {!advanced && <p className="text-muted-foreground text-xs">サイドバーの上級者モードをオンにすると書き込めます。</p>}
          {done && <p className="text-xs text-emerald-600 dark:text-emerald-400">{done}</p>}
          {applyError && <p className="text-destructive text-xs">{applyError}</p>}
        </div>
        <p className="text-muted-foreground text-xs">
          値の意味は確かめずにそのまま書きます。書いた値によってはゲームで読めなくなることがあります。ダウンロードするまでファイルは変わりません（サイドバーの「保存」で書き出します）。
        </p>
      </CardContent>
    </AnchoredCard>
  )
}
