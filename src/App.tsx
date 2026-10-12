import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavigationContext } from '@/lib/navigation-context'
import { AppSidebar } from '@/components/app-sidebar'
import { NoSaveNotice } from '@/components/no-save-notice'
import { SearchDialog } from '@/components/search-dialog'
import { SectionPlaceholder } from '@/components/section-placeholder'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { pages } from '@/features/pages'
import { sections, type SectionId } from '@/features/sections'
import { AdvancedModeProvider } from '@/lib/advanced-mode-provider'
import { formatHash, parseHash, type Route } from '@/lib/route'
import { SaveProvider } from '@/lib/save-provider'

const DEFAULT_SECTION: SectionId = 'hero'
/** 欄を囲む箱が開くアニメーション（collapsible-card の duration-200）と画面の切り替えのあとに位置が決まる */
const SEARCH_SCROLL_DELAY_MS = 300
/** 検索から飛んだ欄を目立たせておく時間 */
const SEARCH_HIT_MS = 2000

export default function App() {
  // 開いた時点の URL のハッシュ（#/画面/箱）の画面を開き、その箱を開いてスクロールする
  const [initial] = useState(() => parseHash(window.location.hash))
  const [active, setActive] = useState<SectionId>(initial?.section ?? DEFAULT_SECTION)
  const [target, setTarget] = useState<{ anchor: string | null; field: string | null; seq: number }>({
    anchor: initial?.anchor ?? null,
    field: null,
    seq: 0,
  })
  const section = sections.find((s) => s.id === active) ?? sections[0]
  const Page = pages[section.id]

  const open = useCallback((route: Route, field: string | null = null) => {
    setActive(route.section)
    setTarget((t) => ({ anchor: route.anchor, field, seq: t.seq + 1 }))
  }, [])

  // 検索から欄・小見出しへ飛んだとき、その要素までスクロールして目立たせる。
  // 絞り込みなどで要素が見つからなければ、外側の箱までスクロールする
  useEffect(() => {
    const { anchor, field } = target
    if (field === null) return
    let hit: HTMLElement | undefined
    let clear: number | undefined
    const t = window.setTimeout(() => {
      hit = [...document.querySelectorAll<HTMLElement>('[data-search-key]')].find((e) => e.dataset.searchKey === field)
      if (!hit) {
        if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      hit.scrollIntoView({ behavior: 'smooth', block: 'center' })
      hit.dataset.searchHit = ''
      clear = window.setTimeout(() => delete hit?.dataset.searchHit, SEARCH_HIT_MS)
    }, SEARCH_SCROLL_DELAY_MS)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(clear)
      if (hit) delete hit.dataset.searchHit
    }
  }, [target])

  // ハッシュを書き換えたとき・戻る／進むで、その画面と箱を開く（go が pushState で書いたときは hashchange は起きない）
  useEffect(() => {
    const onHashChange = () => {
      const route = parseHash(window.location.hash)
      if (route) open(route)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [open])

  const navigation = useMemo(
    () => ({
      ...target,
      section: active,
      go: (id: SectionId, to?: string, field?: string) => {
        const route = { section: id, anchor: to || null }
        const hash = formatHash(route)
        if (window.location.hash !== hash) window.history.pushState(null, '', hash)
        open(route, field ?? null)
      },
    }),
    [target, active, open],
  )

  return (
    <NavigationContext.Provider value={navigation}>
      <SaveProvider>
        <AdvancedModeProvider>
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar active={active} onSelect={(id) => navigation.go(id)} />
              <SidebarInset className="min-w-0">
                <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-center" />
                  <h1 className="font-semibold">
                    {section.folder && <span className="text-muted-foreground font-normal">{section.folder} / </span>}
                    {section.label}
                  </h1>
                  <SearchDialog />

                </header>
                <div className={`mx-auto w-full p-4 ${section.wide ? 'min-w-0' : 'max-w-5xl'}`}>
                  <NoSaveNotice />
                  {Page ? <Page /> : <SectionPlaceholder section={section} />}
                </div>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </AdvancedModeProvider>
      </SaveProvider>
    </NavigationContext.Provider>
  )
}
