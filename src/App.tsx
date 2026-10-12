import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavigationContext } from '@/lib/navigation-context'
import { AppSidebar } from '@/components/app-sidebar'
import { NoSaveNotice } from '@/components/no-save-notice'
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

export default function App() {
  // 開いた時点の URL のハッシュ（#/画面/箱）の画面を開き、その箱を開いてスクロールする
  const [initial] = useState(() => parseHash(window.location.hash))
  const [active, setActive] = useState<SectionId>(initial?.section ?? DEFAULT_SECTION)
  const [target, setTarget] = useState<{ anchor: string | null; seq: number }>({ anchor: initial?.anchor ?? null, seq: 0 })
  const section = sections.find((s) => s.id === active) ?? sections[0]
  const Page = pages[section.id]

  const open = useCallback((route: Route) => {
    setActive(route.section)
    setTarget((t) => ({ anchor: route.anchor, seq: t.seq + 1 }))
  }, [])

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
      go: (id: SectionId, to?: string) => {
        const route = { section: id, anchor: to ?? null }
        const hash = formatHash(route)
        if (window.location.hash !== hash) window.history.pushState(null, '', hash)
        open(route)
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
                  <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                  <h1 className="font-semibold">
                    {section.folder && <span className="text-muted-foreground font-normal">{section.folder} / </span>}
                    {section.label}
                  </h1>
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
