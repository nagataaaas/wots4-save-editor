import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { Tooltip, TooltipContent } from '@/components/ui/tooltip'
import { weaponIdLabel } from '@/save/weapon'
import { weaponImageUrl } from '@/save/master/weapon-images'

/** 完成武器1本分の画像（10:3）と名前。読み込み中はシマー、読み込めないときは文言を出す */
function CompleteWeaponImage({ id, url }: { id: number; url: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const name = weaponIdLabel(id) ?? ''
  return (
    <figure className="flex flex-col gap-1">
      <div className="relative aspect-10/3 w-60">
        {status === 'failed' ? (
          <div className="flex size-full items-center justify-center opacity-70">画像を読み込めません</div>
        ) : (
          <>
            {status === 'loading' && <div className="image-shimmer absolute inset-0 rounded-sm" aria-hidden="true" />}
            <img
              src={url}
              alt={name}
              // キャッシュ済みで load が先に済んでいるときも読み込み済みにする
              ref={(el) => {
                if (el?.complete && el.naturalWidth > 0 && status === 'loading') setStatus('loaded')
              }}
              onLoad={() => setStatus('loaded')}
              onError={() => setStatus('failed')}
              className={`size-full object-contain ${status === 'loading' ? 'opacity-0' : ''}`}
            />
          </>
        )}
      </div>
      <figcaption>{name}</figcaption>
    </figure>
  )
}

/**
 * パーツの左端に置く画像アイコン（一覧の項目と、選択済みの欄で使う）。ホバーで、そのパーツを使う完成武器の画像を出す。
 * 欄のボタンの中にも置くので、ボタンではなく span にする（押すと項目を選ぶ・一覧を開く操作がそのまま伝わる）。
 * 画像のある完成武器がなければ、項目の文字の位置をそろえるため同じ幅の空白にする。
 * Tooltip はホバー中だけ作る（LazyTip と同じく、一覧の数百項目で初期化が重くならないように）
 */
export function PartImageTip({ completeIds }: { completeIds: readonly number[] }) {
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null)
  const [open, setOpen] = useState(false)
  const images = completeIds.flatMap((id) => {
    const url = weaponImageUrl(id)
    return url ? [{ id, url }] : []
  })
  if (images.length === 0) return <span className="size-4 shrink-0" aria-hidden="true" />
  return (
    <>
      <span
        ref={setAnchor}
        role="img"
        aria-label={`このパーツを使う武器の画像：${images.map((i) => weaponIdLabel(i.id)).join('、')}`}
        // 無効の欄（鞘を上書きしていないとき。ボタンは pointer-events: none）でもホバーできるようにする
        className="text-muted-foreground hover:text-foreground pointer-events-auto inline-flex shrink-0"
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
      >
        <ImageIcon className="size-4" />
      </span>
      {open && (
        <Tooltip open>
          {/* 矢印がアイコンに重なると pointerleave で開閉を繰り返すので、ポインターを通す */}
          <TooltipContent
            anchor={anchor}
            side="left"
            className="pointer-events-none flex max-w-none flex-col items-stretch gap-2 p-2"
          >
            {images.map(({ id, url }) => (
              <CompleteWeaponImage key={id} id={id} url={url} />
            ))}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  )
}
