import { useRef, useState } from 'react'
import { ChevronRight, Download, FileUp, Save } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { ChangelogDialog } from '@/components/changelog-dialog'
import { DeveloperContact, RepositoryLink } from '@/components/developer-contact'
import { LicensesDialog } from '@/components/licenses-dialog'
import { RestoreDialog } from '@/components/restore-dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { isFolder, sectionGroups, type SectionFolder, type SectionId } from '@/features/sections'
import { useAdvancedMode } from '@/lib/advanced-mode-context'
import { canWriteToFile } from '@/lib/file-io'
import { tr } from '@/lib/i18n'
import { useSave } from '@/lib/save-context'

type Props = {
  active: SectionId
  onSelect: (id: SectionId) => void
}

export function AppSidebar({ active, onSelect }: Props) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 pt-1 text-base font-bold">{tr({ ja: '侍道4 セーブエディタ', en: 'Way of the Samurai 4 Save Editor' })}</div>
        <FilePanel />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {sectionGroups.map((group) => (
          <SidebarGroup key={group.label.ja}>
            <SidebarGroupLabel>{tr(group.label)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((node) =>
                  isFolder(node) ? (
                    <FolderItem key={node.label.ja} folder={node} active={active} onSelect={onSelect} />
                  ) : (
                    <SidebarMenuItem key={node.id}>
                      <SidebarMenuButton isActive={node.id === active} onClick={() => onSelect(node.id)}>
                        <node.icon />
                        <span>{tr(node.label)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ),
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <DeveloperContact />
        <div className="flex items-center">
          <ChangelogDialog />
          <LicensesDialog />
          <RepositoryLink />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

/**
 * 子項目をまとめる親項目。開閉でき、最初は閉じている。閉じている間は、開いている画面を含むなら親項目を選択中の表示にする。
 * 検索やリンクで中の画面に移ったときは開く
 */
function FolderItem({ folder, active, onSelect }: { folder: SectionFolder } & Props) {
  const [open, setOpen] = useState(false)
  const containsActive = folder.sections.some((s) => s.id === active)
  // 最初に開いている画面では開かない（最初は閉じておく）
  const [openedFor, setOpenedFor] = useState<SectionId | null>(containsActive ? active : null)
  if (containsActive && openedFor !== active) {
    setOpenedFor(active)
    setOpen(true)
  }
  return (
    <Collapsible open={open} onOpenChange={setOpen} render={<SidebarMenuItem />}>
      <CollapsibleTrigger render={<SidebarMenuButton isActive={!open && containsActive} />}>
        <folder.icon />
        <span>{tr(folder.label)}</span>
        <ChevronRight className={`ml-auto transition-transform ${open ? 'rotate-90' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {folder.sections.map((s) => (
            <SidebarMenuSubItem key={s.id}>
              <SidebarMenuSubButton
                render={<button type="button" className="w-full" onClick={() => onSelect(s.id)} />}
                isActive={s.id === active}
              >
                <span>{tr(s.label)}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** セーブファイルの読み込み・書き出し */
function FilePanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { save, error, changedBytes, unsavedBytes, load, openFile, saveEdited } = useSave()
  const dirty = save !== null && unsavedBytes > 0
  // 選んだファイルへ直接書けるブラウザでは、開いたファイルに上書きする。
  // 上書き先がない版（別の名前の版を復元したときなど）は「保存」で保存先を選ばせる
  const writable = canWriteToFile()
  const overwrite = save ? save.handle !== null : writable

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
      <Button size="sm" onClick={() => (writable ? void openFile() : inputRef.current?.click())}>
        <FileUp />
        {tr({ ja: 'ファイルを開く', en: 'Open File' })}
      </Button>
      {save ? (
        <div className="text-muted-foreground flex items-baseline justify-between gap-2 text-xs">
          <span className="truncate font-mono" title={save.name}>
            {save.name}
          </span>
          <span className="shrink-0">{save.original.byteLength.toLocaleString()} B</span>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          {tr({
            ja: 'S4-DATA_00〜04 を選択。ファイルはブラウザ内でのみ処理されます。',
            en: 'Choose S4-DATA_00 to 04. Files are processed only inside your browser. ',
          })}
          {writable && tr({ ja: '「上書き」で、開いたファイルに直接書き込みます。', en: '"Overwrite" writes directly to the opened file.' })}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <RestoreDialog />
        {/* 未保存の変更があるときは、下の「未保存の変更」と同じ色で目立たせる */}
        <Button
          size="sm"
          variant={dirty ? 'default' : 'outline'}
          disabled={!save}
          onClick={() => void saveEdited()}
          className={
            dirty
              ? 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400'
              : undefined
          }
        >
          {overwrite ? <Save /> : <Download />}
          {overwrite ? tr({ ja: '上書き', en: 'Overwrite' }) : tr({ ja: '保存', en: 'Save' })}
        </Button>
      </div>
      {save && (
        <div className="text-muted-foreground flex flex-col text-xs">
          <span className={unsavedBytes > 0 ? 'font-medium text-amber-600 dark:text-amber-400' : undefined}>
            {unsavedBytes > 0
              ? tr({ ja: `未保存の変更：${unsavedBytes.toLocaleString()} B`, en: `Unsaved changes: ${unsavedBytes.toLocaleString()} B` })
              : tr({ ja: '保存済み', en: 'Saved' })}
          </span>
          <span>{tr({ ja: `読み込み時からの変更：${changedBytes.toLocaleString()} B`, en: `Changed since loading: ${changedBytes.toLocaleString()} B` })}</span>
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
          {tr({ ja: '上級者モード', en: 'Advanced Mode' })}
        </Label>
        <Switch id="advanced-mode" checked={advanced} onCheckedChange={setAdvanced} />
      </div>
      <p className="text-muted-foreground text-xs">
        {advanced
          ? tr({
              ja: 'ゲーム上の範囲を超える値も書けます。データ破損のおそれがあるので、バックアップを取ってから試してください',
              en: 'Values beyond the in-game range can be written. This may corrupt your save, so make a backup before trying.',
            })
          : tr({
              ja: 'オンにすると、ゲーム上の範囲を超える値もシステム上の範囲まで書けます',
              en: 'When on, values beyond the in-game range can be written, up to what the file format allows.',
            })}
      </p>
    </div>
  )
}
