import { createContext, useContext } from 'react'

/**
 * パーツ（刃・鍔・柄）の選択肢の並べ方。reading は読みの五十音順、id は ID 順。どちらも刀・槍に分けたうえで並べる。
 * 切り替えはサイドバー（ユーザー判断 2026-10-05）
 */
export type PartOrder = 'reading' | 'id'

export type PartOrderValue = {
  order: PartOrder
  setOrder: (order: PartOrder) => void
}

export const PartOrderContext = createContext<PartOrderValue | null>(null)

export function usePartOrder(): PartOrderValue {
  const ctx = useContext(PartOrderContext)
  if (!ctx) throw new Error('usePartOrder は PartOrderProvider の内側で使う')
  return ctx
}
