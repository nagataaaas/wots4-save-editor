import { Badge } from '@/components/ui/badge'

/** 解析ノートの確度（🟡🔶❓）と判定待ち項目を表示する。確定（✅）の項目には付けない */
export function CertaintyBadge({ mark, text }: { mark: '🟡' | '🔶' | '❓'; text: string }) {
  return (
    <Badge variant="outline" className="font-normal">
      {mark} {text}
    </Badge>
  )
}
