// Route discovery (TECH-SPEC §4, S-1…S-8): one scanner behind the Vite plugin,
// the Bun plugin and the `quiver routes` CLI. Node/Bun only, never imported by
// browser code (C-4). Uses only node:fs/promises and node:path, so the Vite
// plugin runs under Node as well as Bun.
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { routeKeys } from '../match.js'

/**
 * @typedef {{ pattern: string, file: string }} ScanRoute  file: POSIX path relative to the pages dir
 * @typedef {{ routes: ScanRoute[], notFound: string | null }} ScanResult
 */

const PARAM_NAME = /^[A-Za-z_$][\w$]*$/

/**
 * Map a page file to its route pattern (2.x semantics, S-2): strip `.js`,
 * `/index` → parent (`index.js` → `/`), `[name]` → `:name`. The pattern is
 * Unicode NFC, the form the router matches (N135), whatever form the file
 * system stores the name in; the import specifier keeps the name on disk.
 * @param {string} file POSIX path relative to the pages dir, e.g. 'users/[id].js'
 * @returns {string} e.g. '/users/:id'
 */
export function fileToRoutePath(file) {
  const path = ('/' + file.replace(/\.js$/, '')).replace(/\/index$/, '') || '/'
  return path.replace(/\[([^\]]+)\]/g, ':$1').normalize('NFC')
}

/**
 * Why a pattern breaks M-2/M-3, or null when it is valid.
 * @param {string} pattern
 * @returns {string | null}
 */
function patternProblem(pattern) {
  if (pattern.length > 1 && pattern.endsWith('/')) return 'ends with "/"'
  if (pattern.includes('//')) return 'has an empty segment ("//")'
  if (/[?#]/.test(pattern)) return 'contains "?" or "#"'
  if (pattern.includes('*')) return 'contains a wildcard ("*")'
  // N135: URLs are matched decoded, so a file name is the decoded text and a "%"
  // in it would be read as an escape. A backslash becomes "/" in a URL.
  if (pattern.includes('%')) return 'contains "%"; name the file with the characters themselves (a space, é), not percent-escapes'
  if (pattern.includes('\\')) return 'contains "\\", which a browser turns into "/"'
  const names = new Set()
  for (const segment of pattern.split('/').filter(Boolean)) {
    if (!segment.startsWith(':')) continue
    const name = segment.slice(1)
    if (!PARAM_NAME.test(name)) return `has an invalid parameter name "${segment}"`
    if (names.has(name)) return `repeats the parameter "${segment}"`
    names.add(name)
  }
  return null
}

/**
 * Every `.js` file under `dir`, recursively, as sorted POSIX paths relative to
 * `dir`. Skips files and directories whose name starts with `.` or `_` (S-1).
 * @param {string} dir
 * @param {string} [prefix]
 * @returns {Promise<string[]>}
 */
async function listPages(dir, prefix = '') {
  const entries = await readdir(join(dir, prefix), { withFileTypes: true })
  /** @type {string[]} */
  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...(await listPages(dir, rel)))
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(rel)
  }
  return files
}

/**
 * Scan a pages directory (S-1…S-7). Collects every error and throws once, one
 * `[quiver] `-prefixed line per error.
 * @param {string} dir absolute pages directory
 * @returns {Promise<ScanResult>}
 */
export async function scanPages(dir) {
  const info = await stat(dir).catch(() => null)
  if (!info?.isDirectory()) throw new Error(`[quiver] Pages directory not found: ${dir}`)

  const files = (await listPages(dir)).sort()
  /** @type {string[]} */
  const errors = []
  /** @type {ScanRoute[]} */
  const routes = []
  /** @type {string | null} */
  let notFound = null
  /** @type {Map<string, string>} canonical route → file */
  const byPattern = new Map()
  /** @type {Map<string, string>} shape (params erased) → file */
  const byShape = new Map()

  for (const file of files) {
    if (file === 'not-found.js') {
      notFound = file
      continue
    }
    if (file.endsWith('/not-found.js')) {
      errors.push(`Nested not-found.js is not supported: ${file}`)
      continue
    }

    const pattern = fileToRoutePath(file)
    const problem = patternProblem(pattern)
    if (problem) {
      errors.push(`Route "${pattern}" from ${file} ${problem}.`)
      continue
    }

    const { route, shape } = routeKeys(pattern)
    const same = byPattern.get(route)
    if (same !== undefined) {
      errors.push(`${same} and ${file} both map to "${pattern}".`)
      continue
    }
    const similar = byShape.get(shape)
    if (similar !== undefined) {
      errors.push(`${similar} and ${file} differ only in parameter names ("${fileToRoutePath(similar)}", "${pattern}"), so one could never match.`)
      continue
    }

    byPattern.set(route, file)
    byShape.set(shape, file)
    routes.push({ pattern, file })
  }

  if (errors.length) throw new Error(errors.map((e) => `[quiver] ${e}`).join('\n'))

  routes.sort((a, b) => (a.pattern < b.pattern ? -1 : a.pattern > b.pattern ? 1 : 0))
  return { routes, notFound }
}

/**
 * A single-quoted JS string literal: JSON.stringify, then re-quoted (S-8).
 * @param {string} value
 * @returns {string}
 */
function quote(value) {
  const inner = JSON.stringify(value)
    .slice(1, -1)
    .replace(/\\(.)|'/g, (match, escaped) => (escaped === undefined ? "\\'" : escaped === '"' ? '"' : match))
  return `'${inner}'`
}

/**
 * The route manifest module for a scan (S-8). Identical for every front-end
 * except the import specifiers.
 * @param {ScanResult} scan
 * @param {(file: string) => string} specifier maps a ScanResult file to an import specifier
 * @returns {string} ES module source
 */
export function generateManifest(scan, specifier) {
  const lines = ['// Generated by Quiver. Do not edit.', 'export default {']
  for (const { pattern, file } of scan.routes) {
    lines.push(`  ${quote(pattern)}: () => import(${quote(specifier(file))}),`)
  }
  lines.push('}')
  lines.push(
    scan.notFound === null
      ? 'export const notFound = undefined'
      : `export const notFound = () => import(${quote(specifier(scan.notFound))})`,
  )
  return lines.join('\n') + '\n'
}

/**
 * A path with forward slashes, whatever the OS (S-6).
 * @param {string} path
 * @returns {string}
 */
export const toPosix = (path) => path.replace(/\\/g, '/')
