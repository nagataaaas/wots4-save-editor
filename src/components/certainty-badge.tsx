import { Badge } from '@/components/ui/badge'

/** 解析ノートの確度（✅🟡🔶❓）と判定待ち項目を表示する */
export function CertaintyBadge({ mark, text }: { mark: '✅' | '🟡' | '🔶' | '❓'; text: string }) {
  return (
    <Badge variant={mark === '✅' ? 'secondary' : 'outline'} className="font-normal">
      {mark} {text}
    </Badge>
  )
}
