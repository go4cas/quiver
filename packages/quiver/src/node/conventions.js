// The conventions layer (TECH-SPEC §12.3, S-50…S-66, D37–D44): one scan of an
// app's source folder (pages/, layouts/, middleware/, views/, app.config.js,
// pages/**/_middleware.js and each page's literal meta) and the `quiver:app`
// module the Vite plugin, the Bun plugin and `quiver app` generate from it.
// Node/Bun only, never imported by browser code (C-4).
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { patternIssue, routeSet } from '../match.js'
import { readMeta } from './literal.js'
import { fileToRoutePath, quote, scanPages, toPosix } from './scanner.js'

/**
 * Every file is a POSIX path relative to the source directory (`srcDir`), so one
 * `specifier` maps them all; a pages directory outside `srcDir` gives `../` paths.
 * @typedef {{ to: string, label: string }} NavItem
 * @typedef {Object} AppScanResult
 * @property {{ pattern: string, file: string }[]} routes  sorted by pattern (S-6)
 * @property {string | null} notFound
 * @property {{ name: string, file: string }[]} layouts   sorted by name
 * @property {string[]} middleware                        global middleware, in run order
 * @property {{ pattern: string, file: string }[]} sections  section middleware, outermost first
 * @property {{ loading: string | null, error: string | null }} views
 * @property {string | null} config
 * @property {NavItem[]} nav
 * @property {string[]} warnings                          each prefixed `[quiver] `
 */

const LAYOUT_NAME = /^[A-Za-z0-9][A-Za-z0-9-]*$/
const VIEWS = ['loading.js', 'error.js']
const SECTION_FILE = '_middleware.js'

/** @param {string} name */
const skipped = (name) => name.startsWith('_') || name.startsWith('.')

/** @param {string} a @param {string} b */
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/** @param {unknown} error @returns {boolean} whether it says the path does not exist */
const absent = (error) => /** @type {NodeJS.ErrnoException} */ (error)?.code === 'ENOENT'

/** @param {unknown} error @returns {string} */
const reason = (error) => (error instanceof Error ? error.message : String(error))

/**
 * Read a directory the scan relies on. An absent one is `null` (every convention
 * folder is optional); any other failure is an error, never an empty folder, so
 * an unreadable middleware/ can't drop its guards (S32-01, N211).
 * @param {string} dir absolute
 * @param {string} name how errors name it
 * @param {string[]} errors
 * @returns {Promise<import('node:fs').Dirent[] | null>}
 */
async function readFolder(dir, name, errors) {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (!absent(error)) errors.push(`Cannot read ${name}: ${reason(error)}`)
    return null
  }
}

// Symbolic links (S32-01, N211): the scan never follows one inside pages/,
// layouts/, middleware/ or views/. A linked page or folder is not read, like a
// file of another type; a linked `.js` file in layouts/, middleware/ or views/,
// or a linked _middleware.js, is an error, so a guard is never silently left out.
const LINKED = 'is a symbolic link, which Quiver does not follow; put the file itself there.'

/**
 * The `.js` files directly in a convention folder (S-51, S-52, S-54). Names
 * starting with `_` or `.` are skipped; any other subdirectory is an error,
 * since its files would silently never run (T21). Other file types are ignored,
 * so a layout's CSS can sit beside it.
 * @param {string} srcDir
 * @param {string} folder 'layouts', 'middleware' or 'views'
 * @param {string[]} errors
 * @returns {Promise<string[]>} sorted file names
 */
async function folderFiles(srcDir, folder, errors) {
  const entries = await readFolder(join(srcDir, folder), `${folder}/`, errors)
  if (!entries) return []
  /** @type {string[]} */
  const files = []
  for (const entry of entries) {
    if (skipped(entry.name)) continue
    if (entry.isDirectory()) {
      errors.push(`${folder}/${entry.name}/ is a folder; ${folder}/ is read one level deep. Move its files up, or name it _${entry.name} for helpers.`)
    } else if (entry.isSymbolicLink() && entry.name.endsWith('.js')) {
      errors.push(`${folder}/${entry.name} ${LINKED}`)
    } else if (entry.isFile() && entry.name.endsWith('.js')) files.push(entry.name)
  }
  return files.sort(byCodeUnit)
}

/**
 * Every `_middleware.js` under the pages directory, in folders the scanner reads
 * (S-53), as POSIX paths relative to it, sorted. A folder that can't be read is
 * an error (S32-01).
 * @param {string} pagesDir
 * @param {string[]} errors
 * @param {string} [prefix]
 * @returns {Promise<string[]>}
 */
async function sectionFiles(pagesDir, errors, prefix = '') {
  const entries = await readFolder(join(pagesDir, prefix), `pages/${prefix ? `${prefix}/` : ''}`, errors)
  /** @type {string[]} */
  const files = []
  for (const entry of entries ?? []) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.name === SECTION_FILE && entry.isSymbolicLink()) errors.push(`pages/${rel} ${LINKED}`)
    else if (entry.isFile() && entry.name === SECTION_FILE) files.push(rel)
    else if (entry.isDirectory() && !skipped(entry.name)) files.push(...(await sectionFiles(pagesDir, errors, rel)))
  }
  return files.sort(byCodeUnit)
}

/** @param {string} pattern @returns {number} */
const depth = (pattern) => pattern.split('/').filter(Boolean).length

/**
 * Scan an app's source folder (S-50…S-58). Collects every error, from the pages
 * scan (S-1…S-7) and the rules below, and throws once with one `[quiver] ` line
 * per error. Warnings never throw.
 * @param {string} srcDir absolute source directory
 * @param {{ pagesDir?: string }} [options] absolute pages directory; default `<srcDir>/pages`
 * @returns {Promise<AppScanResult>}
 */
export async function scanApp(srcDir, options = {}) {
  const pagesDir = options.pagesDir ?? join(srcDir, 'pages')
  /** @param {string} file relative to pagesDir */
  const fromPages = (file) => toPosix(relative(srcDir, join(pagesDir, file)))

  /** @type {string[]} lines already prefixed `[quiver] ` */
  const failures = []
  /** @type {string[]} */
  const errors = []
  /** @type {string[]} */
  const warnings = []

  /** @type {import('./scanner.js').ScanResult} */
  let pages = { routes: [], notFound: null }
  try {
    pages = await scanPages(pagesDir)
  } catch (error) {
    failures.push(...(error instanceof Error ? error.message : String(error)).split('\n'))
  }

  // layouts/ (S-51)
  /** @type {AppScanResult['layouts']} */
  const layouts = []
  for (const file of await folderFiles(srcDir, 'layouts', errors)) {
    const name = file.slice(0, -3)
    if (!LAYOUT_NAME.test(name)) {
      errors.push(`layouts/${file}: a layout name uses letters, digits and "-", and starts with a letter or digit.`)
      continue
    }
    layouts.push({ name, file: `layouts/${file}` })
  }
  const hasLayouts = await stat(join(srcDir, 'layouts')).then((s) => s.isDirectory(), () => false)

  // middleware/ (S-52)
  const middleware = (await folderFiles(srcDir, 'middleware', errors)).map((file) => `middleware/${file}`)

  // pages/**/_middleware.js (S-53). Two folders for one section, spelled
  // differently (`café` and a decomposed `café`), or differing only in the
  // parameter name (`[id]`, `[slug]`), would give one key two guard lists, and
  // only one would run: an error naming both (S32-01, N211).
  /** @type {AppScanResult['sections']} */
  const sections = []
  /** @type {ReturnType<typeof routeSet<string>>} */
  const seenSections = routeSet()
  for (const file of await sectionFiles(pagesDir, errors)) {
    const folder = file.slice(0, -SECTION_FILE.length)
    const pattern = fileToRoutePath(`${folder}index.js`)
    const issue = patternIssue(pattern)
    if (issue) {
      errors.push(`Section "${pattern}" from ${file} is not a valid route pattern (${issue.code}).`)
      continue
    }
    const clash = seenSections.add(pattern, file)
    if (clash) {
      errors.push(clash.code === 'same'
        ? `${clash.other} and ${file} are both the section "${pattern}"; keep one folder.`
        : `${clash.other} and ${file} differ only in parameter names ("${fileToRoutePath(`${clash.other.slice(0, -SECTION_FILE.length)}index.js`)}", "${pattern}"), so both guard the same routes; keep one folder.`)
      continue
    }
    sections.push({ pattern, file: fromPages(file) })
  }
  sections.sort((a, b) => depth(a.pattern) - depth(b.pattern) || byCodeUnit(a.pattern, b.pattern))

  // views/ (S-54)
  /** @type {AppScanResult['views']} */
  const views = { loading: null, error: null }
  for (const file of await folderFiles(srcDir, 'views', errors)) {
    if (file === 'loading.js') views.loading = 'views/loading.js'
    else if (file === 'error.js') views.error = 'views/error.js'
    else errors.push(`views/${file}: only ${VIEWS.join(' and ')} are read from views/.`)
  }

  // app.config.js (S-55)
  /** @type {string | null} */
  let config = null
  try {
    if ((await stat(join(srcDir, 'app.config.js'))).isFile()) config = 'app.config.js'
  } catch (error) {
    if (!absent(error)) errors.push(`Cannot read app.config.js: ${reason(error)}`)
  }

  // Literal meta: nav and layout (S-56…S-58)
  /** @type {(NavItem & { order: number })[]} */
  const nav = []
  const layoutNames = new Set(layouts.map((l) => l.name))
  const pageFiles = [...pages.routes.map((r) => ({ ...r, notFound: false }))]
  if (pages.notFound) pageFiles.push({ pattern: '', file: pages.notFound, notFound: true })
  for (const page of pageFiles) {
    const source = await readFile(join(pagesDir, page.file), 'utf8')
    const meta = readMeta(source)
    if (!meta.found) continue
    if (!meta.readable) {
      // R32-05: one warning when the initializer itself names nav or layout.
      if (meta.mentions) {
        warnings.push(`${page.file}: meta is not a plain literal, so its nav and layout are not checked at build time.`)
      }
      continue
    }
    const value = /** @type {Record<string, unknown>} */ (meta.value && typeof meta.value === 'object' ? meta.value : {})

    if (hasLayouts && typeof value.layout === 'string' && !layoutNames.has(value.layout)) {
      warnings.push(`${page.file}: unknown layout "${value.layout}" (layouts: ${[...layoutNames].join(', ') || 'none'}).`)
    }

    if (!Object.hasOwn(value, 'nav') || value.nav === undefined) continue
    const item = /** @type {Record<string, unknown>} */ (value.nav)
    const valid = item !== null && typeof item === 'object' && !Array.isArray(item)
      && typeof item.label === 'string' && item.label !== ''
      && (item.order === undefined || (typeof item.order === 'number' && Number.isFinite(item.order)))
    if (!valid) {
      warnings.push(`${page.file}: meta.nav must be { label: string, order?: number }; the page is left out of nav.`)
    } else if (page.notFound) {
      warnings.push(`${page.file}: meta.nav is ignored on the not-found page.`)
    } else if (page.pattern.split('/').some((s) => s.startsWith(':'))) {
      warnings.push(`${page.file}: meta.nav is ignored on "${page.pattern}", which has a parameter and so no single link.`)
    } else {
      nav.push({ to: page.pattern, label: /** @type {string} */ (item.label), order: /** @type {number | undefined} */ (item.order) ?? Infinity })
    }
  }
  nav.sort((a, b) => (a.order === b.order ? byCodeUnit(a.to, b.to) : a.order < b.order ? -1 : 1))

  const lines = [...failures, ...errors.map((e) => `[quiver] ${e}`)]
  if (lines.length) throw new Error(lines.join('\n'))

  return {
    routes: pages.routes.map(({ pattern, file }) => ({ pattern, file: fromPages(file) })),
    notFound: pages.notFound === null ? null : fromPages(pages.notFound),
    layouts,
    middleware,
    sections,
    views,
    config,
    nav: nav.map(({ to, label }) => ({ to, label })),
    warnings: warnings.map((w) => `[quiver] ${w}`),
  }
}

/**
 * The `quiver:app` module for a scan (S-59). Identical for every front-end
 * except the import specifiers.
 * @param {AppScanResult} scan
 * @param {(file: string) => string} specifier maps a file (relative to srcDir) to an import specifier
 * @returns {string} ES module source
 */
export function generateApp(scan, specifier) {
  /** @param {string} file */
  const from = (file) => quote(specifier(file))
  const lines = ['// Generated by Quiver. Do not edit.']

  if (scan.config) lines.push(`import config from ${from(scan.config)}`)
  scan.layouts.forEach((layout, i) => lines.push(`import layout${i} from ${from(layout.file)}`))
  scan.middleware.forEach((file, i) => lines.push(`import middleware${i} from ${from(file)}`))
  scan.sections.forEach((section, i) => lines.push(`import section${i} from ${from(section.file)}`))
  if (scan.views.loading) lines.push(`import loading from ${from(scan.views.loading)}`)
  if (scan.views.error) lines.push(`import error from ${from(scan.views.error)}`)

  lines.push('export default {')
  if (scan.routes.length) {
    lines.push('  routes: {')
    for (const { pattern, file } of scan.routes) lines.push(`    ${quote(pattern)}: () => import(${from(file)}),`)
    lines.push('  },')
  } else lines.push('  routes: {},')
  lines.push(scan.notFound === null ? '  notFound: undefined,' : `  notFound: () => import(${from(scan.notFound)}),`)

  const layouts = scan.layouts.map((layout, i) => `${quote(layout.name)}: layout${i}`)
  lines.push(layouts.length ? `  layouts: { ${layouts.join(', ')} },` : '  layouts: {},')

  const global = scan.middleware.map((_, i) => `middleware${i}`).join(', ')
  const sections = scan.sections.map((section, i) => `${quote(section.pattern)}: [section${i}]`)
  lines.push(`  middleware: { global: [${global}], sections: {${sections.length ? ` ${sections.join(', ')} ` : ''}} },`)

  const views = [scan.views.loading && 'loading', scan.views.error && 'error'].filter(Boolean)
  lines.push(views.length ? `  views: { ${views.join(', ')} },` : '  views: {},')

  if (scan.nav.length) {
    lines.push('  nav: [')
    for (const item of scan.nav) lines.push(`    { to: ${quote(item.to)}, label: ${quote(item.label)} },`)
    lines.push('  ],')
  } else lines.push('  nav: [],')

  lines.push(scan.config ? '  config,' : '  config: {},')
  lines.push('}')
  return lines.join('\n') + '\n'
}

/**
 * Whether a change to `file` can change the `quiver:app` module's file lists
 * (S-61): a page, a `_middleware.js`, a `.js` file in layouts/, middleware/ or
 * views/, or app.config.js. Used by the dev server and `quiver app --watch`.
 * @param {string} srcDir absolute
 * @param {string} pagesDir absolute
 * @param {string} file absolute
 * @returns {boolean}
 */
export function isAppFile(srcDir, pagesDir, file) {
  if (!file.endsWith('.js')) return false
  const inPages = toPosix(relative(pagesDir, file))
  if (!inPages.startsWith('../') && inPages !== '..' && !/^[A-Za-z]:/.test(inPages) && !inPages.startsWith('/')) {
    const parts = inPages.split('/')
    const name = parts[parts.length - 1]
    if (parts.slice(0, -1).some(skipped)) return false
    return name === SECTION_FILE || !skipped(name)
  }
  const inSrc = toPosix(relative(srcDir, file))
  if (inSrc === 'app.config.js') return true
  const parts = inSrc.split('/')
  return parts.length === 2 && ['layouts', 'middleware', 'views'].includes(parts[0]) && !skipped(parts[1])
}
