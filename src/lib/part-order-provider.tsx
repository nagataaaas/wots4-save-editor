import { useState, type ReactNode } from 'react'
import { PartOrderContext, type PartOrder } from '@/lib/part-order-context'

const STORAGE_KEY = 'part-order'

function loadOrder(): PartOrder {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'id' ? 'id' : 'reading'
  } catch {
    return 'reading'
  }
}

/** パーツの並べ方を画面全体に共有する。ブラウザに覚えさせ、開き直しても保つ（使えないときは読み順） */
export function PartOrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrderState] = useState<PartOrder>(loadOrder)
  const setOrder = (next: PartOrder) => {
    setOrderState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 保存できなくても、今の画面では切り替わる
    }
  }
  return <PartOrderContext.Provider value={{ order, setOrder }}>{children}</PartOrderContext.Provider>
}
