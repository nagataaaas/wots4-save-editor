import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'

/** 画面に出すライセンスの1件 */
export type LicenseEntry = {
  name: string
  version: string
  license: string
  text: string | null
}

const VIRTUAL_ID = 'virtual:third-party-licenses'
const RESOLVED_ID = '\0' + VIRTUAL_ID

type Options = {
  /** package.json の dependencies のうち、バンドルに入らないもの（ビルドにだけ使うもの） */
  buildOnly: string[]
  /** dependencies にないがバンドルに入るもの（CSS だけを取り込むもの）。依存はたどらない */
  extra: string[]
}

type PackageJson = {
  name: string
  version: string
  license?: string | { type: string }
  dependencies?: Record<string, string>
}

function readPackageJson(dir: string): PackageJson {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson
}

/** from のパッケージから見た name のパッケージのディレクトリ（Node の解決と同じく node_modules を上へたどる） */
function resolvePackageDir(name: string, from: string): string {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate)
    if (dirname(dir) === dir) throw new Error(`${name} が ${from} から見つかりません`)
  }
}

function readLicenseText(dir: string): string | null {
  const files = readdirSync(dir).filter((f) => /^(licen[cs]e|copying|notice)([.-].*)?$/i.test(f))
  if (files.length === 0) return null
  return files
    .sort()
    .map((f) => readFileSync(join(dir, f), 'utf8').trim())
    .join('\n\n')
}

function toEntry(dir: string): LicenseEntry {
  const pkg = readPackageJson(dir)
  const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'UNKNOWN')
  return { name: pkg.name, version: pkg.version, license, text: readLicenseText(dir) }
}

/** バンドルに入る依存パッケージ（dependencies から buildOnly を除き、その依存をたどったもの）のライセンス */
export function collectLicenses(root: string, { buildOnly, extra }: Options): LicenseEntry[] {
  const seen = new Map<string, LicenseEntry>()
  const visit = (dir: string, followDeps: boolean) => {
    if (seen.has(dir)) return
    const entry = toEntry(dir)
    seen.set(dir, entry)
    if (!followDeps) return
    for (const dep of Object.keys(readPackageJson(dir).dependencies ?? {})) visit(resolvePackageDir(dep, dir), true)
  }
  const rootDeps = Object.keys(readPackageJson(root).dependencies ?? {}).filter((d) => !buildOnly.includes(d))
  for (const dep of rootDeps) visit(resolvePackageDir(dep, root), true)
  for (const dep of extra) visit(resolvePackageDir(dep, root), false)
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
}

/** `virtual:third-party-licenses` で、バンドルに入る依存パッケージのライセンスの一覧を出す */
export function licensesPlugin(options: Options): Plugin {
  let root = process.cwd()
  return {
    name: 'third-party-licenses',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined
      return `export default ${JSON.stringify(collectLicenses(root, options))}`
    },
  }
}
