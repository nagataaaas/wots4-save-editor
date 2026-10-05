import { useRef } from 'react'
import { Download, FileUp } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { isFolder, sectionGroups, type SectionId } from '@/features/sections'
import { useAdvancedMode } from '@/lib/advanced-mode-context'
import { useSave } from '@/lib/save-context'

type Props = {
  active: SectionId
  onSelect: (id: SectionId) => void
}

export function AppSidebar({ active, onSelect }: Props) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 pt-1 text-base font-bold">侍道4 セーブエディタ</div>
        <FilePanel />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {sectionGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((node) =>
                  isFolder(node) ? (
                    <SidebarMenuItem key={node.label}>
                      <SidebarMenuButton asChild className="pointer-events-none">
                        <div>
                          <node.icon />
                          <span>{node.label}</span>
                        </div>
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {node.sections.map((s) => (
                          <SidebarMenuSubItem key={s.id}>
                            <SidebarMenuSubButton asChild isActive={s.id === active}>
                              <button type="button" className="w-full" onClick={() => onSelect(s.id)}>
                                <span>{s.label}</span>
                              </button>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  ) : (
                    <SidebarMenuItem key={node.id}>
                      <SidebarMenuButton isActive={node.id === active} onClick={() => onSelect(node.id)}>
                        <node.icon />
                        <span>{node.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ),
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}

/** セーブファイルの読み込み・書き出し */
function FilePanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { save, error, changedBytes, unsavedBytes, load, downloadBackup, downloadEdited } = useSave()

  return (
    <div className="flex flex-col gap-2 p-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void load(file)
          e.target.value = ''
        }}
      />
      <Button size="sm" onClick={() => inputRef.current?.click()}>
        <FileUp />
        ファイルを開く
      </Button>
      {save ? (
        <div className="text-muted-foreground flex items-baseline justify-between gap-2 text-xs">
          <span className="truncate font-mono" title={save.name}>
            {save.name}
          </span>
          <span className="shrink-0">{save.original.byteLength.toLocaleString()} B</span>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">S4-DATA_00〜04 を選択。ファイルはブラウザ内でのみ処理されます。</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" disabled={!save} onClick={downloadBackup}>
          <Download />
          バックアップ
        </Button>
        <Button size="sm" variant="outline" disabled={!save} onClick={downloadEdited}>
          <Download />
          保存
        </Button>
      </div>
      {save && (
        <div className="text-muted-foreground flex flex-col text-xs">
          <span className={unsavedBytes > 0 ? 'font-medium text-amber-600 dark:text-amber-400' : undefined}>
            {unsavedBytes > 0 ? `未保存の変更：${unsavedBytes.toLocaleString()} B` : '保存済み'}
          </span>
          <span>読み込み時からの変更：{changedBytes.toLocaleString()} B</span>
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      <AdvancedModeSwitch />
    </div>
  )
}

/** 上級者モードの切り替え。ゲーム上の範囲を超える値を、システム上の範囲まで受け付ける */
function AdvancedModeSwitch() {
  const { advanced, setAdvanced } = useAdvancedMode()
  return (
    <div
      className={`flex flex-col gap-1 rounded-md border p-2 ${advanced ? 'border-amber-500 bg-amber-500/10' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="advanced-mode" className="text-xs">
          上級者モード
        </Label>
        <Switch id="advanced-mode" checked={advanced} onCheckedChange={setAdvanced} />
      </div>
      <p className="text-muted-foreground text-xs">
        {advanced
          ? '🔶 ゲーム上の範囲を超える値も書けます。データ破損のおそれがあるので、バックアップを取ってから試してください'
          : 'オンにすると、ゲーム上の範囲を超える値もシステム上の範囲まで書けます'}
      </p>
    </div>
  )
}
