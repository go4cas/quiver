// Route discovery (TECH-SPEC §4, S-1…S-8): one scanner behind the Vite plugin,
// the Bun plugin and the `quiver routes` CLI. Node/Bun only, never imported by
// browser code (C-4). Uses only node:fs/promises and node:path, so the Vite
// plugin runs under Node as well as Bun.
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { patternIssue, routeSet } from '../match.js'

/**
 * @typedef {{ pattern: string, file: string }} ScanRoute  file: POSIX path relative to the pages dir
 * @typedef {{ routes: ScanRoute[], notFound: string | null }} ScanResult
 */

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

// N135: URLs are matched decoded, so a file name is the decoded text and a "%"
// in it would be read as an escape. A backslash becomes "/" in a URL. These are
// the scanner's own rules, checked after the shared PATTERN_RULES (S-5).
/** @type {import('../match.js').PatternRule[]} */
const FILE_RULES = [
  { code: 'percent', test: (p) => p.includes('%') },
  { code: 'backslash', test: (p) => p.includes('\\') },
]

/** @type {Record<string, (segment: string) => string>} the scanner's wording per rule */
const SCAN_MESSAGES = {
  'leading-slash': () => 'does not start with "/"',
  'trailing-slash': () => 'ends with "/"',
  'empty-segment': () => 'has an empty segment ("//")',
  'query-or-hash': () => 'contains "?" or "#"',
  wildcard: () => 'contains a wildcard ("*")',
  percent: () => 'contains "%"; name the file with the characters themselves (a space, é), not percent-escapes',
  backslash: () => 'contains "\\", which a browser turns into "/"',
  'param-name': (segment) => `has an invalid parameter name "${segment}"`,
  'param-repeat': (segment) => `repeats the parameter "${segment}"`,
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
  /** @type {ReturnType<typeof routeSet<string>>} */
  const seen = routeSet()

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
    const issue = patternIssue(pattern, FILE_RULES)
    if (issue) {
      errors.push(`Route "${pattern}" from ${file} ${SCAN_MESSAGES[issue.code](issue.segment)}.`)
      continue
    }

    const clash = seen.add(pattern, file)
    if (clash?.code === 'same') {
      errors.push(`${clash.other} and ${file} both map to "${pattern}".`)
      continue
    }
    if (clash) {
      errors.push(`${clash.other} and ${file} differ only in parameter names ("${fileToRoutePath(clash.other)}", "${pattern}"), so one could never match.`)
      continue
    }

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
export function quote(value) {
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
