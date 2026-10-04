// ブラウザのメモリ上でセーブファイルを読み書きするための入出力ヘルパー。
// サーバーへは一切送信しない。読み込みは File → Uint8Array、書き出しは Blob のダウンロード。

/** ユーザーが選択したファイルをメモリに読み込む */
export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}

/**
 * 書き出し前の検査。AGENTS.md「ファイルサイズを変えない」を満たさないものは書き出さない。
 * 違反時は例外を投げる。
 */
export function assertSameSize(original: Uint8Array, edited: Uint8Array): void {
  if (original.byteLength !== edited.byteLength) {
    throw new Error(
      `ファイルサイズが変化しています（元: ${original.byteLength} B / 編集後: ${edited.byteLength} B）。書き出しを中止しました。`,
    )
  }
}

/** バックアップ用のファイル名 `<元の名前>.bak.<ISO日時>` を作る（`:` はファイル名に使えないので `-` に置換） */
export function backupFileName(name: string, now: Date = new Date()): string {
  return `${name}.bak.${now.toISOString().replace(/:/g, '-')}`
}

/** メモリ上のバイト列をファイルとしてダウンロードさせる */
export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  // クリック直後に revoke するとダウンロードが始まらないブラウザがあるため遅らせる
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
