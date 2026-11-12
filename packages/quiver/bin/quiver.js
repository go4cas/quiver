#!/usr/bin/env node
// `quiver routes` (TECH-SPEC §4.5, S-30…S-34) writes the route manifest for a
// pages directory, and `quiver app` (§12.3, S-63) the app manifest for a source
// directory, to a file, for builds without the Vite or Bun plugin.
// Node ≥ 22.12 or Bun; no Bun-only API.
import { watch } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { generateManifest, scanPages, toPosix } from '../src/node/scanner.js'
import { generateApp, isAppFile, scanApp } from '../src/node/conventions.js'

const USAGE = `Usage: quiver routes [--dir <pages dir>] [--out <file>] [--watch]
       quiver app [--src <source dir>] [--out <file>] [--watch]

quiver routes writes the route manifest for a pages directory.

  --dir    pages directory, relative to cwd (default src/pages)
  --out    output file, relative to cwd (default src/routes.gen.js); not a page
           inside --dir (name it _routes.gen.js there)
  --watch  rescan when a file is added, removed or renamed under --dir

quiver app writes the app manifest (routes, layouts, middleware, views, nav,
config) for a source directory, the module the plugins serve as quiver:app.

  --src    source directory, relative to cwd (default src); pages are <src>/pages
  --out    output file, relative to cwd (default <src>/app.gen.js); not inside
           pages/, layouts/, middleware/ or views/
  --watch  rescan when a file under --src is added, removed, renamed or edited

  --help   print this message
`

/** @param {string} path @returns {string} path relative to cwd, or absolute when it is outside */
function show(path) {
  const rel = relative(process.cwd(), path)
  return rel && !rel.startsWith('..') ? toPosix(rel) : path
}

/** @param {unknown} error @returns {string} the message alone, no stack */
const message = (error) => (error instanceof Error ? error.message : String(error))

/**
 * An import specifier for `file` (relative to `base`) from the directory of
 * `out`: always `./…` or `../…` (S-30).
 * @param {string} out absolute output file
 * @param {string} base absolute directory the scan's files are relative to
 * @returns {(file: string) => string}
 */
const specifierFrom = (out, base) => (file) => {
  const spec = toPosix(relative(dirname(out), join(base, file)))
  return spec.startsWith('../') ? spec : `./${spec}`
}

/**
 * The route manifest for `dir`, written to `out` (S-30).
 * @param {string} dir absolute pages dir
 * @param {string} out absolute output file
 * @returns {() => Promise<string>}
 */
const routesModule = (dir, out) => async () => generateManifest(await scanPages(dir), specifierFrom(out, dir))

/**
 * The app manifest for `src`, written to `out` (S-63). Warnings go to stderr.
 * @param {string} src absolute source dir
 * @param {string} out absolute output file
 * @returns {() => Promise<string>}
 */
const appModule = (src, out) => async () => {
  const scan = await scanApp(src)
  for (const warning of scan.warnings) process.stderr.write(`${warning}\n`)
  return generateApp(scan, specifierFrom(out, src))
}

/**
 * Generate and write `out` when its content changed (S-31). The file is written
 * to a sibling temporary file and renamed over `out`, so a reader never sees
 * half a manifest, and a scan error leaves the last good one in place (N136).
 * @param {() => Promise<string>} generate
 * @param {string} out absolute output file
 * @returns {Promise<boolean>} whether the file was written
 */
async function writeModule(generate, out) {
  const source = await generate()
  const outDir = dirname(out)
  const current = await readFile(out, 'utf8').catch(() => null)
  if (current === source) return false
  await mkdir(outDir, { recursive: true })
  // A leading "." keeps the temp file out of a scan when --out is inside --dir (S-1).
  const temp = join(outDir, `.${basename(out)}.${process.pid}.tmp`)
  try {
    await writeFile(temp, source)
    await rename(temp, out)
  } catch (error) {
    await rm(temp, { force: true })
    throw error
  }
  return true
}

/**
 * `--watch` (S-33, N136): one scan at a time. Changes are debounced 50 ms, and a
 * change during a scan queues exactly one more, so the last scan starts after
 * the last change. A scan error is printed and the last good manifest stays.
 * The watcher starts before the first scan, so a page added during it is not
 * missed. A directory that can't be watched, or a watcher that fails later,
 * ends the process with exit code 1 and one `[quiver] ` line.
 * @param {string} dir absolute directory to watch
 * @param {string} out absolute output file
 * @param {{ generate: () => Promise<string>, relevant: (event: string, file: string) => boolean, missing: string }} how
 *   relevant: whether an event for a file (absolute) can change the module; missing: the not-found message
 * @returns {Promise<number | undefined>} 1 when watching can't start; undefined while it runs
 */
async function watchModule(dir, out, { generate, relevant, missing }) {
  // Fail fast, before any watcher exists, on a directory that is missing or
  // unreadable; fs.watch would throw or keep running blind.
  try {
    await readdir(dir)
  } catch (error) {
    const code = /** @type {NodeJS.ErrnoException} */ (error).code
    process.stderr.write(code === 'ENOENT' || code === 'ENOTDIR'
      ? `[quiver] ${missing}: ${dir}\n`
      : `[quiver] Cannot watch ${show(dir)}: ${message(error)}\n`)
    return 1
  }

  /** @type {Promise<void> | null} */
  let running = null
  let again = false
  let first = true
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer

  const scan = () => {
    if (running) {
      again = true
      return
    }
    running = (async () => {
      do {
        again = false
        try {
          const written = await writeModule(generate, out)
          if (written || first) process.stdout.write(`${written ? 'Wrote' : 'Unchanged'} ${show(out)}\n`)
        } catch (error) {
          process.stderr.write(`${message(error)}\n`)
        }
        if (first) process.stdout.write(`Watching ${show(dir)}\n`)
        first = false
      } while (again)
      running = null
    })()
  }

  /** @type {import('node:fs').FSWatcher} */
  let watcher
  try {
    watcher = watch(dir, { recursive: true }, (event, filename) => {
      if (filename && !relevant(event, join(dir, filename))) return
      clearTimeout(timer)
      timer = setTimeout(scan, 50)
    })
  } catch (error) {
    process.stderr.write(`[quiver] Cannot watch ${show(dir)}: ${message(error)}\n`)
    return 1
  }
  watcher.on('error', (error) => {
    clearTimeout(timer)
    watcher.close()
    process.stderr.write(`[quiver] Stopped watching ${show(dir)}: ${message(error)}\n`)
    process.exitCode = 1
  })

  scan()
  return undefined
}

/** @param {string[]} argv */
function parse(argv) {
  return parseArgs({
    args: argv,
    options: {
      dir: { type: 'string' },
      src: { type: 'string' },
      out: { type: 'string' },
      watch: { type: 'boolean' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
  })
}

/**
 * @param {string[]} argv arguments after the program name
 * @returns {Promise<number | undefined>} exit code (S-32); undefined while --watch keeps the process alive
 */
async function main(argv) {
  /** @type {ReturnType<typeof parse>} */
  let parsed
  try {
    parsed = parse(argv)
  } catch (error) {
    process.stderr.write(`${message(error)}\n\n${USAGE}`)
    return 2
  }

  const { values, positionals } = parsed
  const command = positionals[0] ?? 'routes'
  if (values.help && positionals.length <= 1 && (command === 'routes' || command === 'app')) {
    process.stdout.write(USAGE)
    return 0
  }
  if (positionals.length !== 1 || (command !== 'routes' && command !== 'app')) {
    const what = positionals.length ? `Unknown command: ${positionals.join(' ')}` : 'Missing command.'
    process.stderr.write(`${what}\n\n${USAGE}`)
    return 2
  }
  if (command === 'app') return appCommand(values)
  if (values.src !== undefined) {
    process.stderr.write(`--src is an option of quiver app, not quiver routes.\n\n${USAGE}`)
    return 2
  }

  const dir = resolve(values.dir ?? 'src/pages')
  const out = resolve(values.out ?? 'src/routes.gen.js')

  // The manifest must not become a page of the directory it describes: a .js file
  // inside --dir is scanned unless a path segment starts with `_` or `.` (S-1).
  const inDir = relative(dir, out)
  if (!inDir.startsWith('..') && !isAbsolute(inDir) && out.endsWith('.js')
    && !inDir.split(/[\\/]/).some((part) => part.startsWith('_') || part.startsWith('.'))) {
    process.stderr.write(`--out ${show(out)} is inside --dir ${show(dir)}, so it would be scanned as a page.\n`
      + `Write it outside the pages directory, or name it with a leading _ (e.g. _routes.gen.js).\n\n${USAGE}`)
    return 2
  }

  if (values.watch) {
    return watchModule(dir, out, {
      generate: routesModule(dir, out),
      missing: 'Pages directory not found',
      // Only adding, removing or renaming a page changes the manifest; skipped
      // names (S-1), including the temp file, never do.
      relevant: (event, file) => event === 'rename'
        && !toPosix(relative(dir, file)).split('/').some((part) => part.startsWith('_') || part.startsWith('.')),
    })
  }

  try {
    const written = await writeModule(routesModule(dir, out), out)
    process.stdout.write(`${written ? 'Wrote' : 'Unchanged'} ${show(out)}\n`)
  } catch (error) {
    process.stderr.write(`${message(error)}\n`)
    return 1
  }
  return 0
}

/**
 * `quiver app` (S-63).
 * @param {ReturnType<typeof parse>['values']} values
 * @returns {Promise<number | undefined>}
 */
async function appCommand(values) {
  if (values.dir !== undefined) {
    process.stderr.write(`--dir is an option of quiver routes; quiver app reads pages from <src>/pages.\n\n${USAGE}`)
    return 2
  }
  const src = resolve(values.src ?? 'src')
  const pagesDir = join(src, 'pages')
  const out = resolve(values.out ?? join(src, 'app.gen.js'))

  // The manifest must not land in a folder the scan reads (S-63).
  for (const folder of ['pages', 'layouts', 'middleware', 'views']) {
    const inFolder = relative(join(src, folder), out)
    if (!inFolder.startsWith('..') && !isAbsolute(inFolder) && out.endsWith('.js')
      && !inFolder.split(/[\\/]/).some((part) => part.startsWith('_') || part.startsWith('.'))) {
      process.stderr.write(`--out ${show(out)} is inside ${show(join(src, folder))}, which quiver app scans.\n`
        + `Write it elsewhere, for example ${show(join(src, 'app.gen.js'))}.\n\n${USAGE}`)
      return 2
    }
  }

  if (values.watch) {
    const temp = `.${basename(out)}.`
    return watchModule(src, out, {
      generate: appModule(src, out),
      missing: 'Source directory not found',
      // Every app file (a page, _middleware.js, layouts/, middleware/, views/,
      // app.config.js): edits too, since a page's meta.nav can change. A renamed
      // folder can move pages. Not the output file or its temp file.
      relevant: (event, file) => file !== out && !basename(file).startsWith(temp)
        && (isAppFile(src, pagesDir, file) || (event === 'rename' && !extname(file))),
    })
  }

  try {
    const written = await writeModule(appModule(src, out), out)
    process.stdout.write(`${written ? 'Wrote' : 'Unchanged'} ${show(out)}\n`)
  } catch (error) {
    process.stderr.write(`${message(error)}\n`)
    return 1
  }
  return 0
}

const code = await main(process.argv.slice(2))
if (code !== undefined) process.exitCode = code
