import { useRef, useState } from 'react'
import { Download, FileUp } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { assertSameSize, backupFileName, downloadBytes, readFileAsBytes } from '@/lib/file-io'

type LoadedSave = {
  name: string
  /** 読み込んだままのバイト列。バックアップの書き出しに使い、変更しない */
  original: Uint8Array
  /** 編集対象のバイト列（original のコピー） */
  working: Uint8Array
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [save, setSave] = useState<LoadedSave | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    try {
      const original = await readFileAsBytes(file)
      setSave({ name: file.name, original, working: original.slice() })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function handleDownload() {
    if (!save) return
    setError(null)
    try {
      assertSameSize(save.original, save.working)
      downloadBytes(save.working, save.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">侍道4 セーブデータエディタ</h1>
        <p className="text-muted-foreground text-sm">
          Steam版 S4-DATA_00〜04 用。ファイルはブラウザ内でのみ処理され、外部には送信されません。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>セーブファイル</CardTitle>
          <CardDescription>編集するファイルを選択してください。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => inputRef.current?.click()}>
              <FileUp />
              ファイルを開く
            </Button>
            <Button variant="outline" disabled={!save} onClick={() => save && downloadBytes(save.original, backupFileName(save.name))}>
              <Download />
              バックアップを保存
            </Button>
            <Button variant="outline" disabled={!save} onClick={handleDownload}>
              <Download />
              編集結果を保存
            </Button>
          </div>
          {save && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono">{save.name}</span>
              <Badge variant="secondary">{save.original.byteLength.toLocaleString()} B</Badge>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>エラー</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertTitle>編集機能は未実装です</AlertTitle>
        <AlertDescription>現在は読み込みと、そのままの書き出しのみ行えます。</AlertDescription>
      </Alert>
    </div>
  )
}
