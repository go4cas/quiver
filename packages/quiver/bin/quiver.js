#!/usr/bin/env node
// `quiver routes` (TECH-SPEC §4.5, S-30…S-34): writes the route manifest for a
// pages directory to a file, for builds without the Vite or Bun plugin.
// Node ≥ 22.12 or Bun; no Bun-only API.
import { watch } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { generateManifest, scanPages, toPosix } from '../src/node/scanner.js'

const USAGE = `Usage: quiver routes [--dir <pages dir>] [--out <file>] [--watch]

Writes the route manifest for a pages directory.

  --dir    pages directory, relative to cwd (default src/pages)
  --out    output file, relative to cwd (default src/routes.gen.js); not a page
           inside --dir (name it _routes.gen.js there)
  --watch  rescan when a file is added, removed or renamed under --dir
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
 * Scan and write `out` when its content changed (S-30, S-31). The file is
 * written to a sibling temporary file and renamed over `out`, so a reader never
 * sees half a manifest, and a scan error leaves the last good one in place (N136).
 * @param {string} dir absolute pages dir
 * @param {string} out absolute output file
 * @returns {Promise<boolean>} whether the file was written
 */
async function writeRoutes(dir, out) {
  const scan = await scanPages(dir)
  const outDir = dirname(out)
  const source = generateManifest(scan, (file) => {
    const spec = toPosix(relative(outDir, join(dir, file)))
    return spec.startsWith('../') ? spec : `./${spec}`
  })
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
 * missed. A pages directory that can't be watched, or a watcher that fails
 * later, ends the process with exit code 1 and one `[quiver] ` line.
 * @param {string} dir absolute pages dir
 * @param {string} out absolute output file
 * @returns {Promise<number | undefined>} 1 when watching can't start; undefined while it runs
 */
async function watchRoutes(dir, out) {
  // Fail fast, before any watcher exists, on a directory that is missing or
  // unreadable; fs.watch would throw or keep running blind.
  try {
    await readdir(dir)
  } catch (error) {
    const code = /** @type {NodeJS.ErrnoException} */ (error).code
    process.stderr.write(code === 'ENOENT' || code === 'ENOTDIR'
      ? `[quiver] Pages directory not found: ${dir}\n`
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
          const written = await writeRoutes(dir, out)
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
      if (event !== 'rename') return
      // Skipped names (S-1), including the temp file, never change the manifest.
      if (filename && toPosix(filename).split('/').some((part) => part.startsWith('_') || part.startsWith('.'))) return
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
  if (values.help && positionals.length <= 1 && (positionals[0] ?? 'routes') === 'routes') {
    process.stdout.write(USAGE)
    return 0
  }
  if (positionals.length !== 1 || positionals[0] !== 'routes') {
    const what = positionals.length ? `Unknown command: ${positionals.join(' ')}` : 'Missing command.'
    process.stderr.write(`${what}\n\n${USAGE}`)
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

  if (values.watch) return watchRoutes(dir, out)

  try {
    const written = await writeRoutes(dir, out)
    process.stdout.write(`${written ? 'Wrote' : 'Unchanged'} ${show(out)}\n`)
  } catch (error) {
    process.stderr.write(`${message(error)}\n`)
    return 1
  }
  return 0
}

const code = await main(process.argv.slice(2))
if (code !== undefined) process.exitCode = code
