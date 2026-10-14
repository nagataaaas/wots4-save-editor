import { AnchorScope, useAnchor } from '@/lib/navigation-context'
import { useIndexing } from '@/lib/search-collector'
import { WEAPON_ANCHORS } from './anchors'
import { WeaponEditor } from './weapon-editor'

/** セーブだけで決まる一覧の編集欄は、先頭枠の共通フォームを索引に載せる。
 * 空き・絞り込みで欄が描かれない場合、移動先は一覧の箱になる。 */
export function WeaponIndexFields() {
  const indexing = useIndexing()
  const { id } = useAnchor(WEAPON_ANCHORS.weapon(0))
  if (!indexing) return null
  return <AnchorScope.Provider value={id}><WeaponEditor weapon={null} offset={0} /></AnchorScope.Provider>
}
