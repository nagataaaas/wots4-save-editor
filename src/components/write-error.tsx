import type { WriteMessage } from '@/lib/use-write'
import { cn } from '@/lib/utils'

/** 書き込みに失敗したとき、操作した欄・ボタンのすぐ下に出す */
export function WriteError({ error, className }: { error: string | null; className?: string }) {
  return error && <p className={cn('text-destructive text-xs', className)}>{error}</p>
}

/** useWrite の attempt・tryWrite の結果（成功文かエラー）を、操作したボタンの近くに出す */
export function WriteResult({ message, className }: { message: WriteMessage; className?: string }) {
  return message && <p className={cn(message.error ? 'text-destructive text-xs' : 'text-muted-foreground text-xs', className)}>{message.text}</p>
}
