// セーブの版の履歴。読み込み時と「保存」のたびに、その時点のバイト列をブラウザの IndexedDB に残す。
// サーバーへは送らない。
//
// 組（session）：1回の読み込みと、それを編集して保存した版の並び。組の id は読み込みの版の id と同じ。
// store は2つに分ける。一覧ではメタデータ（snapshots）だけを読み、バイト列（snapshotBytes）は復元のときだけ読む。
import { snapshotMeta, type SnapshotMeta } from '@/save/snapshot-meta'
import { sameBytes } from './byte-diff'

const DB_NAME = 'wots4-save-editor'
const DB_VERSION = 1
const META = 'snapshots'
const BYTES = 'snapshotBytes'

export type SnapshotKind = 'loaded' | 'saved'

export type SnapshotRecord = SnapshotMeta & {
  id: number
  sessionId: number
  kind: SnapshotKind
  fileName: string
  /** 残した日時（Date.now()） */
  createdAt: number
  /**
   * バイト列の SHA-256（16進）。同じ読み込みを探すときに、バイト列を読む前にこれで絞る。
   * 足す前に残した版と、crypto.subtle が使えない環境（安全でない接続）で残した版にはない
   */
  sha256?: string
}

/** バイト列の SHA-256（16進）。crypto.subtle が使えない環境では undefined */
export async function sha256Hex(bytes: Uint8Array): Promise<string | undefined> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return undefined
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>))
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 同じファイル名・同じバイト列かもしれない読み込みの版。バイト列はこのあと比べる。
 * ハッシュが両方にあれば一致するものだけ、どちらかにないものは候補に残す（従来どおりバイト列で比べる）
 */
export function loadedCandidates(
  records: readonly SnapshotRecord[],
  fileName: string,
  sha256: string | undefined,
): SnapshotRecord[] {
  return records.filter((r) =>
    r.kind === 'loaded' && r.fileName === fileName
    && (r.sha256 === undefined || sha256 === undefined || r.sha256 === sha256))
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') throw new Error('このブラウザでは履歴を使えません')
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        const meta = db.createObjectStore(META, { keyPath: 'id', autoIncrement: true })
        meta.createIndex('sessionId', 'sessionId')
        db.createObjectStore(BYTES)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    // 開けなかったときは次の呼び出しで開き直す
    dbPromise.catch(() => {
      dbPromise = null
    })
  }
  return dbPromise
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('履歴の書き込みが中断されました'))
  })
}

/** 版を1つ追加し、その id を返す。sessionId が null なら新しい組を作る（組の id は追加した版の id） */
async function add(
  kind: SnapshotKind,
  fileName: string,
  sessionId: number | null,
  bytes: Uint8Array,
  meta: SnapshotMeta,
  sha256: string | undefined,
): Promise<number> {
  const db = await openDb()
  const tx = db.transaction([META, BYTES], 'readwrite')
  const metaStore = tx.objectStore(META)
  const record: Omit<SnapshotRecord, 'id' | 'sessionId'> & { sessionId?: number } = {
    ...meta,
    kind,
    fileName,
    createdAt: Date.now(),
    ...(sha256 === undefined ? {} : { sha256 }),
    ...(sessionId === null ? {} : { sessionId }),
  }
  const copy = bytes.slice()
  let id = 0
  // await を挟むとトランザクションが閉じることがあるので、続きの書き込みは onsuccess の中で出す
  const req = metaStore.add(record)
  req.onsuccess = () => {
    id = Number(req.result)
    if (sessionId === null) metaStore.put({ ...record, id, sessionId: id })
    tx.objectStore(BYTES).put(copy, id)
  }
  await done(tx)
  return id
}

async function sessionRecords(sessionId: number): Promise<SnapshotRecord[]> {
  const db = await openDb()
  const index = db.transaction(META).objectStore(META).index('sessionId')
  const records = (await request(index.getAll(sessionId))) as SnapshotRecord[]
  return records.sort((a, b) => a.id - b.id)
}

export async function listSnapshots(): Promise<SnapshotRecord[]> {
  const db = await openDb()
  return (await request(db.transaction(META).objectStore(META).getAll())) as SnapshotRecord[]
}

export async function getSnapshot(id: number): Promise<SnapshotRecord> {
  const db = await openDb()
  const record = (await request(db.transaction(META).objectStore(META).get(id))) as SnapshotRecord | undefined
  if (!record) throw new Error('履歴の版が見つかりません')
  return record
}

export async function getBytes(id: number): Promise<Uint8Array> {
  const db = await openDb()
  const bytes = (await request(db.transaction(BYTES).objectStore(BYTES).get(id))) as Uint8Array | undefined
  if (!bytes) throw new Error('履歴の版が見つかりません')
  return bytes
}

/**
 * 読み込んだセーブを新しい組として残し、組の id を返す。
 * 同じファイル名・同じバイト列の読み込みが既にあれば、追加せずにその組の id を返す（読み込み直しで一覧が増えないように）。
 * メタデータの SHA-256 で絞ってから、残った版だけバイト列を読んで比べる
 */
export async function addLoaded(fileName: string, bytes: Uint8Array): Promise<number> {
  const sha256 = await sha256Hex(bytes)
  for (const r of loadedCandidates(await listSnapshots(), fileName, sha256))
    if (sameBytes(await getBytes(r.id), bytes)) return r.sessionId
  return add('loaded', fileName, null, bytes, snapshotMeta(bytes, null), sha256)
}

/** 保存した版を組に足す。変わった領域は組の最新の版と比べる。最新の版と同じバイト列なら足さない */
export async function addSaved(sessionId: number, bytes: Uint8Array): Promise<void> {
  const records = await sessionRecords(sessionId)
  const latest = records.at(-1)
  if (!latest) throw new Error('履歴の読み込みの版が見つかりません')
  const prev = await getBytes(latest.id)
  if (sameBytes(prev, bytes)) return
  await add('saved', records[0].fileName, sessionId, bytes, snapshotMeta(bytes, prev), await sha256Hex(bytes))
}

export async function clearAll(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([META, BYTES], 'readwrite')
  tx.objectStore(META).clear()
  tx.objectStore(BYTES).clear()
  await done(tx)
}
