import { useEffect, useMemo, useState } from 'react'
import { History, Trash2 } from 'lucide-react'
import { LazyTip } from '@/components/lazy-tip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { errorMessage } from '@/lib/error-message'
import { listSnapshots, type SnapshotRecord } from '@/lib/history-db'
import { getLanguage, tr } from '@/lib/i18n'
import { useSave } from '@/lib/save-context'
import { regionDisplayName } from '@/save/snapshot-meta'

const DASH = '—'

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString(getLanguage() === 'en' ? 'en-US' : 'ja-JP', { dateStyle: 'short', timeStyle: 'medium' })
}

/** 組ごと（新しい組が先）に、組の中は古い順に並べる */
function groupBySession(records: SnapshotRecord[]): SnapshotRecord[][] {
  const groups = new Map<number, SnapshotRecord[]>()
  for (const r of records) groups.set(r.sessionId, [...(groups.get(r.sessionId) ?? []), r])
  return [...groups.entries()].sort(([a], [b]) => b - a).map(([, rs]) => rs.sort((a, b) => a.id - b.id))
}

/** 読み込んだセーブと、それを編集して保存した版の一覧。選んだ版を編集中のデータにする */
export function RestoreDialog() {
  const { historyVersion, restore, clearHistory } = useSave()
  const [open, setOpen] = useState(false)
  const [records, setRecords] = useState<SnapshotRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    listSnapshots()
      .then((rs) => alive && (setRecords(rs), setError(null)))
      .catch((e: unknown) => alive && setError(tr({
        ja: `履歴を読めませんでした: ${errorMessage(e)}`,
        en: `Could not read the history: ${errorMessage(e)}`,
      })))
    return () => {
      alive = false
    }
  }, [open, historyVersion])

  const groups = useMemo(() => (records ? groupBySession(records) : []), [records])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setConfirmClear(false)
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <History />
        {tr({ ja: '復元', en: 'Restore' })}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{tr({ ja: '復元', en: 'Restore' })}</DialogTitle>
          <DialogDescription>
            {tr({
              ja: '読み込んだセーブと、それを編集して保存した版です。選んだ版を編集中のデータにします。履歴はこのブラウザの中にだけ残ります。',
              en: 'Saves you loaded, and the versions you edited and saved from them. The selected version becomes the data being edited. The history is kept only in this browser.',
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : records === null ? (
            <p className="text-muted-foreground text-sm">{tr({ ja: '読み込み中…', en: 'Loading…' })}</p>
          ) : groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">{tr({ ja: 'まだ履歴はありません', en: 'No history yet' })}</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground bg-popover sticky top-0 text-left">
                <tr>
                  <th className="p-1.5 font-medium">{tr({ ja: '種類', en: 'Type' })}</th>
                  <th className="p-1.5 font-medium">{tr({ ja: 'ファイル', en: 'File' })}</th>
                  <th className="p-1.5 font-medium">{tr({ ja: '主人公', en: 'Hero' })}</th>
                  <th className="p-1.5 font-medium">{tr({ ja: '日数', en: 'Day' })}</th>
                  <th className="p-1.5 font-medium">{tr({ ja: '直近でクリアしたイベント', en: 'Last cleared event' })}</th>
                  <th className="p-1.5 font-medium">{tr({ ja: '残した日時', en: 'Saved at' })}</th>
                  <th className="p-1.5" />
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group[0].sessionId} className="border-t">
                  {group.map((r) => (
                    <HistoryRow
                      key={r.id}
                      record={r}
                      onRestore={async () => {
                        await restore(r.id)
                        setOpen(false)
                      }}
                    />
                  ))}
                </tbody>
              ))}
            </table>
          )}
        </div>
        <div className="flex justify-end gap-2">
          {confirmClear ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setConfirmClear(false)}>
                {tr({ ja: 'やめる', en: 'Cancel' })}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  await clearHistory()
                  setConfirmClear(false)
                }}
              >
                <Trash2 />
                {tr({ ja: '本当に全て削除する', en: 'Really delete all' })}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" disabled={!records?.length} onClick={() => setConfirmClear(true)}>
              <Trash2 />
              {tr({ ja: '全削除', en: 'Delete all' })}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HistoryRow({ record: r, onRestore }: { record: SnapshotRecord; onRestore: () => void }) {
  return (
    <tr className="hover:bg-muted/50">
      <td className="p-1.5 whitespace-nowrap">
        {r.kind === 'loaded' ? (
          <Badge variant="secondary">{tr({ ja: '読み込み', en: 'Loaded' })}</Badge>
        ) : r.changedRegions.length > 0 ? (
          <LazyTip
            className="cursor-default"
            aria-label={tr({ ja: '変わった項目', en: 'Changed items' })}
            content={
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{tr({ ja: '変わった項目', en: 'Changed items' })}</span>
                {r.changedRegions.map((name) => (
                  <span key={name}>・{regionDisplayName(name)}</span>
                ))}
              </div>
            }
          >
            <Badge variant="outline">
              {tr({
                ja: `保存（${r.changedRegions.length} 項目）`,
                en: `Saved (${r.changedRegions.length} ${r.changedRegions.length === 1 ? 'item' : 'items'})`,
              })}
            </Badge>
          </LazyTip>
        ) : (
          <Badge variant="outline">{tr({ ja: '保存', en: 'Saved' })}</Badge>
        )}
      </td>
      <td className="max-w-40 truncate p-1.5 font-mono" title={r.fileName}>
        {r.fileName}
      </td>
      <td className="p-1.5">{r.playerName ?? DASH}</td>
      <td className="p-1.5 whitespace-nowrap">{r.day !== null && r.slot !== null ? tr({ ja: `${r.day}日目 ${r.slot}`, en: `Day ${r.day} ${r.slot}` }) : DASH}</td>
      <td className="p-1.5">{r.lastClearedEvent ?? DASH}</td>
      <td className="p-1.5 whitespace-nowrap">{formatTime(r.createdAt)}</td>
      <td className="p-1.5 text-right">
        <Button size="xs" variant="outline" onClick={onRestore}>
          {tr({ ja: '復元', en: 'Restore' })}
        </Button>
      </td>
    </tr>
  )
}
