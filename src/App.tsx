import { useMemo, useState } from 'react'
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
import { SaveProvider } from '@/lib/save-provider'

export default function App() {
  const [active, setActive] = useState<SectionId>('hero')
  const [target, setTarget] = useState<{ anchor: string | null; seq: number }>({ anchor: null, seq: 0 })
  const section = sections.find((s) => s.id === active) ?? sections[0]
  const Page = pages[section.id]
  const navigation = useMemo(
    () => ({
      ...target,
      go: (id: SectionId, to?: string) => {
        setActive(id)
        setTarget((t) => ({ anchor: to ?? null, seq: t.seq + 1 }))
      },
    }),
    [target],
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
