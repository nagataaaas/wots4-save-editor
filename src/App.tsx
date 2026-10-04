import { useState, type ComponentType } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SectionPlaceholder } from '@/components/section-placeholder'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { HeroPage } from '@/features/hero/hero-page'
import { sections, type SectionId } from '@/features/sections'
import { SaveProvider } from '@/lib/save-provider'

/** 実装済みの画面。ここにない項目は仮表示になる */
const pages: Partial<Record<SectionId, ComponentType>> = {
  hero: HeroPage,
}

export default function App() {
  const [active, setActive] = useState<SectionId>('hero')
  const section = sections.find((s) => s.id === active) ?? sections[0]
  const Page = pages[section.id]

  return (
    <SaveProvider>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar active={active} onSelect={setActive} />
          <SidebarInset>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <h1 className="font-semibold">{section.label}</h1>
            </header>
            <div className="p-4">
              {Page ? <Page /> : <SectionPlaceholder section={section} />}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </SaveProvider>
  )
}
