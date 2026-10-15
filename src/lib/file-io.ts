// ブラウザのメモリ上でセーブファイルを読み書きするための入出力ヘルパー。
// サーバーへは一切送信しない。読み込みは File → Uint8Array。
// 書き出しは、File System Access API があるブラウザ（Chromium 系）では選んだファイルへの上書き、ないブラウザでは Blob のダウンロード。
import { tr } from './i18n'

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
    throw new Error(tr({
      ja: `ファイルサイズが変化しています（元: ${original.byteLength} B / 編集後: ${edited.byteLength} B）。書き出しを中止しました。`,
      en: `The file size has changed (original: ${original.byteLength} B / edited: ${edited.byteLength} B). Saving was cancelled.`,
    }))
  }
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

// File System Access API のうち使うもの。TypeScript の DOM の型には picker がないので、ここで宣言する
type FilePickerWindow = {
  showOpenFilePicker: (options?: { multiple?: false }) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker: (options?: { suggestedName?: string }) => Promise<FileSystemFileHandle>
}

function pickerWindow(): FilePickerWindow | null {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window && 'showSaveFilePicker' in window
    ? (window as unknown as FilePickerWindow)
    : null
}

/** 選んだファイルへ直接上書きできるブラウザか */
export function canWriteToFile(): boolean {
  return pickerWindow() !== null
}

/** ファイル選択を取り消したときの例外か。取り消しはエラーとして出さない */
export function isPickerAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}

/** 開くファイルを選ばせる。あとで上書きできるようにハンドルも返す。取り消したら null */
export async function pickFileToOpen(): Promise<{ file: File; handle: FileSystemFileHandle } | null> {
  const picker = pickerWindow()
  if (!picker) throw new Error(tr({ ja: 'このブラウザではファイルを直接開けません', en: 'This browser cannot open files directly' }))
  try {
    const [handle] = await picker.showOpenFilePicker({ multiple: false })
    return { file: await handle.getFile(), handle }
  } catch (e) {
    if (isPickerAbort(e)) return null
    throw e
  }
}

/** 保存先を選ばせる。取り消したら null */
export async function pickFileToSave(suggestedName: string): Promise<FileSystemFileHandle | null> {
  const picker = pickerWindow()
  if (!picker) throw new Error(tr({ ja: 'このブラウザでは保存先を選べません', en: 'This browser cannot choose where to save' }))
  try {
    return await picker.showSaveFilePicker({ suggestedName })
  } catch (e) {
    if (isPickerAbort(e)) return null
    throw e
  }
}

/** ハンドルのファイルをバイト列で丸ごと上書きする。書き込みの許可はブラウザが確認する */
export async function writeBytesToFile(handle: FileSystemFileHandle, bytes: Uint8Array): Promise<void> {
  const writable = await handle.createWritable()
  try {
    await writable.write(bytes as Uint8Array<ArrayBuffer>)
    await writable.close()
  } catch (e) {
    // close しなければ元のファイルは変わらない
    await writable.abort().catch(() => {})
    throw e
  }
}
