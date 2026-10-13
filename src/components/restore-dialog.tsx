import { useEffect, useMemo, useState } from 'react'
import { History, Trash2 } from 'lucide-react'
import { LazyTip } from '@/components/lazy-tip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { errorMessage } from '@/lib/error-message'
import { listSnapshots, type SnapshotRecord } from '@/lib/history-db'
import { useSave } from '@/lib/save-context'

const DASH = '—'

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'medium' })
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
      .catch((e: unknown) => alive && setError(`履歴を読めませんでした: ${errorMessage(e)}`))
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
        復元
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>復元</DialogTitle>
          <DialogDescription>
            読み込んだセーブと、それを編集して保存した版です。選んだ版を編集中のデータにします。履歴はこのブラウザの中にだけ残ります。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : records === null ? (
            <p className="text-muted-foreground text-sm">読み込み中…</p>
          ) : groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">まだ履歴はありません</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground bg-popover sticky top-0 text-left">
                <tr>
                  <th className="p-1.5 font-medium">種類</th>
                  <th className="p-1.5 font-medium">ファイル</th>
                  <th className="p-1.5 font-medium">主人公</th>
                  <th className="p-1.5 font-medium">日数</th>
                  <th className="p-1.5 font-medium">直近でクリアしたイベント</th>
                  <th className="p-1.5 font-medium">残した日時</th>
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
                やめる
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
                本当に全て削除する
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" disabled={!records?.length} onClick={() => setConfirmClear(true)}>
              <Trash2 />
              全削除
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
          <Badge variant="secondary">読み込み</Badge>
        ) : r.changedRegions.length > 0 ? (
          <LazyTip
            className="cursor-default"
            aria-label="変わった項目"
            content={
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">変わった項目</span>
                {r.changedRegions.map((name) => (
                  <span key={name}>・{name}</span>
                ))}
              </div>
            }
          >
            <Badge variant="outline">保存（{r.changedRegions.length} 項目）</Badge>
          </LazyTip>
        ) : (
          <Badge variant="outline">保存</Badge>
        )}
      </td>
      <td className="max-w-40 truncate p-1.5 font-mono" title={r.fileName}>
        {r.fileName}
      </td>
      <td className="p-1.5">{r.playerName ?? DASH}</td>
      <td className="p-1.5 whitespace-nowrap">{r.day !== null && r.slot !== null ? `${r.day}日目 ${r.slot}` : DASH}</td>
      <td className="p-1.5">{r.lastClearedEvent ?? DASH}</td>
      <td className="p-1.5 whitespace-nowrap">{formatTime(r.createdAt)}</td>
      <td className="p-1.5 text-right">
        <Button size="xs" variant="outline" onClick={onRestore}>
          復元
        </Button>
      </td>
    </tr>
  )
}
