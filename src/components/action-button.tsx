import { useContext, useState, type ComponentProps, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { WriteError } from '@/components/write-error'
import { SaveContext } from '@/lib/save-context'
import { useWrite } from '@/lib/use-write'

/**
 * 書き込みのボタンと、その操作エラーをボタンの近くに出す。
 * confirm を渡すと、1回目は確認に進み、2回目で実行する。repeat はフォーカスを外すと、inline は「やめる」で確認を解除する。
 * 読み込み直したら確認を解除する。
 */
export function ActionButton({ label, confirm, confirmLabel = 'もう一度押すと書き込みます', onAction, className, ...props }: Omit<ComponentProps<typeof Button>, 'onClick' | 'children' | 'className'> & {
  className?: string; label: ReactNode; confirm?: 'repeat' | 'inline'; confirmLabel?: ReactNode; onAction: () => void
}) {
  const loadId = useContext(SaveContext)?.save?.loadId
  const [state, setState] = useState({ loadId, armed: false })
  const armed = state.loadId === loadId && state.armed && !props.disabled
  const { error, attempt } = useWrite()
  const arm = (armed: boolean) => setState({ loadId, armed })
  const execute = () => { arm(false); attempt(onAction) }
  return <div className={className}>
    <div className="flex flex-wrap gap-2">
      <Button {...props} variant={armed ? 'destructive' : props.variant ?? 'outline'}
        onBlur={confirm === 'repeat' ? () => arm(false) : props.onBlur}
        onClick={() => confirm === undefined || armed ? execute() : arm(true)}>
        {armed ? confirmLabel : label}
      </Button>
      {armed && confirm === 'inline' && <Button variant="ghost" onClick={() => arm(false)}>やめる</Button>}
    </div>
    <WriteError error={error} />
  </div>
}
