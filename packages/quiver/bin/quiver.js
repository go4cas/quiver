#!/usr/bin/env node
// `quiver routes` (TECH-SPEC §4.5, S-30…S-34): writes the route manifest for a
// pages directory to a file, for builds without the Vite or Bun plugin.
// Node ≥ 22.12 or Bun; no Bun-only API.
import { watch } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
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

/**
 * Scan and write `out` when its content changed (S-30, S-31).
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
  await writeFile(out, source)
  return true
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
    process.stderr.write(`${/** @type {Error} */ (error).message}\n\n${USAGE}`)
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

  // S-33: rescan on add/remove/rename, debounced 50 ms; errors are printed and
  // the watcher keeps running. It starts before the first write, so a page added
  // while that scan runs is not missed.
  if (values.watch) {
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer
    watch(dir, { recursive: true }, (event) => {
      if (event !== 'rename') return
      clearTimeout(timer)
      timer = setTimeout(() => {
        writeRoutes(dir, out).then(
          (written) => written && process.stdout.write(`Wrote ${show(out)}\n`),
          (error) => process.stderr.write(`${/** @type {Error} */ (error).message}\n`),
        )
      }, 50)
    })
  }

  try {
    const written = await writeRoutes(dir, out)
    process.stdout.write(`${written ? 'Wrote' : 'Unchanged'} ${show(out)}\n`)
  } catch (error) {
    process.stderr.write(`${/** @type {Error} */ (error).message}\n`)
    if (!values.watch) return 1
  }

  if (!values.watch) return 0
  process.stdout.write(`Watching ${show(dir)}\n`)
  return undefined
}

const code = await main(process.argv.slice(2))
if (code !== undefined) process.exitCode = code
