import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { loadSearchIndex, searchItems, type SearchItem } from '@/features/search-index'
import { useNavigation } from '@/lib/navigation-context'

/** 一覧に出す上限。これより多いときは語を足して絞ってもらう */
const MAX_RESULTS = 100

const itemKey = (item: SearchItem) => `${item.section}\u001e${item.anchor}\u001e${item.field ?? ''}\u001e${item.crumbs.join('\u001f')}`

/** トップバー右の虫眼鏡。箱の見出し・小見出し・欄の名前を部分一致で探し、選ぶとそこへ移動する。Ctrl+K（⌘K）でも開く */
export function SearchDialog() {
  const { go } = useNavigation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState<SearchItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // 初めて開いたときに待たせないよう、手が空いたときに先に読んでおく
  useEffect(() => {
    const preload = () => void loadSearchIndex().catch(() => {})
    // requestIdleCallback がないブラウザ（Safari など）は少し待ってから読む
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload, { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(preload, 1000)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!open || index) return
    let alive = true
    loadSearchIndex().then(
      (items) => alive && setIndex(items),
      (e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)),
    )
    return () => {
      alive = false
    }
  }, [open, index])

  const hits = useMemo(() => (index ? searchItems(index, query) : []), [index, query])

  function select(item: SearchItem) {
    setOpen(false)
    setQuery('')
    go(item.section, item.anchor || undefined, item.field ?? undefined)
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="ml-auto" aria-label="検索" title="検索（Ctrl+K）" onClick={() => setOpen(true)}>
        <Search />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setQuery('')
        }}
        title="検索"
        description="項目の名前で探して移動します"
        className="sm:max-w-2xl"
      >
        <Command shouldFilter={false}>
          <CommandInput autoFocus value={query} onValueChange={setQuery} placeholder="項目の名前で探す（例：主人公名、HP）" />
          <CommandList className="max-h-[60vh]">
            {error ? (
              <p className="text-destructive py-6 text-center text-sm">検索の準備に失敗しました：{error}</p>
            ) : index === null ? (
              <p className="text-muted-foreground py-6 text-center text-sm">読み込み中…</p>
            ) : query.trim() === '' ? (
              <p className="text-muted-foreground py-6 text-center text-sm">箱の見出し・小見出し・欄の名前で探せます。空白で区切ると、すべての語を含むものに絞ります</p>
            ) : (
              <>
                <CommandEmpty>見つかりません</CommandEmpty>
                {hits.slice(0, MAX_RESULTS).map((item) => (
                  <CommandItem key={itemKey(item)} value={itemKey(item)} onSelect={() => select(item)}>
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1">
                      {item.crumbs.map((c, i) => (
                        <Fragment key={i}>
                          {i > 0 && <ChevronRight className="text-muted-foreground size-3" />}
                          <span className={i === item.crumbs.length - 1 ? 'font-medium' : 'text-muted-foreground'}>{c}</span>
                        </Fragment>
                      ))}
                    </span>
                  </CommandItem>
                ))}
                {hits.length > MAX_RESULTS && (
                  <p className="text-muted-foreground px-2 py-1.5 text-xs">
                    ほか {hits.length - MAX_RESULTS} 件。語を足して絞ってください
                  </p>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
