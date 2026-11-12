// @vitest-environment node
// TECH-SPEC §4.5, S-30…S-34: the `quiver routes` CLI.
import { describe, it, expect } from 'vitest'
import { spawn } from 'node:child_process'
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CLI, runCli } from './helpers/frontends.js'

const FIXTURES = join(import.meta.dirname, 'fixtures')
// R32-10, N214: the canonical temp directory. On macOS `tmpdir()` is under /var,
// a link to /private/var, and the CLI reports the real path it resolves.
const TMP = realpathSync(tmpdir())

/** A temp project with a copy of the fixture pages at src/pages. */
function project() {
  const cwd = mkdtempSync(join(TMP, 'quiver-cli-'))
  cpSync(join(FIXTURES, 'pages'), join(cwd, 'src', 'pages'), { recursive: true })
  return cwd
}

/** @param {() => boolean} check */
async function until(check, timeout = 5000) {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error('timed out')
    await new Promise((r) => setTimeout(r, 25))
  }
}

describe('quiver routes', () => {
  it('S-34: starts with a node shebang', () => {
    expect(readFileSync(CLI, 'utf8').split('\n')[0]).toBe('#!/usr/bin/env node')
  })

  it('S-30: defaults to src/pages → src/routes.gen.js with ./ specifiers', () => {
    const cwd = project()
    const { status, stdout } = runCli(['routes'], cwd)
    expect(status).toBe(0)
    expect(stdout).toContain('Wrote src/routes.gen.js')
    const source = readFileSync(join(cwd, 'src', 'routes.gen.js'), 'utf8')
    expect(source).toContain("  '/users/:id': () => import('./pages/users/[id].js'),")
    expect(source).toContain("export const notFound = () => import('./pages/not-found.js')")
  })

  it('S-30: specifiers climb with ../ when --out sits below --dir’s parent', () => {
    const cwd = project()
    expect(runCli(['routes', '--out', 'src/gen/routes.js'], cwd).status).toBe(0)
    expect(readFileSync(join(cwd, 'src', 'gen', 'routes.js'), 'utf8')).toContain("  '/': () => import('../pages/index.js'),")
  })

  it('S-31: writes only when the content changed', () => {
    const cwd = project()
    const out = join(cwd, 'src', 'routes.gen.js')
    runCli(['routes'], cwd)
    const before = statSync(out).mtimeMs
    const again = runCli(['routes'], cwd)
    expect(again.status).toBe(0)
    expect(again.stdout).toContain('Unchanged')
    expect(statSync(out).mtimeMs).toBe(before)
  })

  it('S-32: a scan error exits 1 with the messages on stderr and writes nothing', () => {
    const cwd = mkdtempSync(join(TMP, 'quiver-cli-'))
    const { status, stderr } = runCli(['routes', '--dir', join(FIXTURES, 'broken', 'duplicate'), '--out', 'out.js'], cwd)
    expect(status).toBe(1)
    expect(stderr).toMatch(/^\[quiver\] users\.js and users\/index\.js both map to "\/users"\./)
    expect(() => statSync(join(cwd, 'out.js'))).toThrow()
  })

  it.each([
    [['build'], /Unknown command: build/],
    [[], /Missing command/],
    [['routes', '--nope'], /Unknown option '--nope'/],
    [['routes', 'extra'], /Unknown command: routes extra/],
  ])('S-32: usage error %j exits 2 and prints usage', (args, message) => {
    const { status, stderr } = runCli(args)
    expect(status).toBe(2)
    expect(stderr).toMatch(message)
    expect(stderr).toContain('Usage: quiver routes')
  })

  it('S-32: --out inside --dir is a usage error, unless its name starts with _ (N114)', () => {
    const cwd = project()
    const inside = runCli(['routes', '--out', 'src/pages/routes.gen.js'], cwd)
    expect(inside.status).toBe(2)
    expect(inside.stderr).toContain('--out src/pages/routes.gen.js is inside --dir src/pages')
    expect(() => statSync(join(cwd, 'src', 'pages', 'routes.gen.js'))).toThrow()

    expect(runCli(['routes', '--out', 'src/pages/_routes.gen.js'], cwd).status).toBe(0)
    const again = runCli(['routes', '--out', 'src/pages/_routes.gen.js'], cwd)
    expect(again.stdout).toContain('Unchanged')
    expect(readFileSync(join(cwd, 'src', 'pages', '_routes.gen.js'), 'utf8')).not.toContain('_routes.gen')
  })

  it.each([[['--help']], [['routes', '--help']]])('S-32: %j prints usage and exits 0', (args) => {
    const { status, stdout } = runCli(args)
    expect(status).toBe(0)
    expect(stdout).toContain('Usage: quiver routes [--dir <pages dir>] [--out <file>] [--watch]')
  })

  it('S-33: --watch rescans on add and remove, survives a scan error', async () => {
    const cwd = project()
    const pages = join(cwd, 'src', 'pages')
    const out = join(cwd, 'src', 'routes.gen.js')
    const read = () => { try { return readFileSync(out, 'utf8') } catch { return '' } }
    const child = spawn('node', [CLI, 'routes', '--watch'], { cwd })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    try {
      // The CLI prints `Watching` after its first write; the watcher itself
      // starts before that write (N88, N114).
      await until(() => stdout.includes('Watching'))
      expect(read()).toContain("'/about'")

      writeFileSync(join(pages, 'contact.js'), "export default () => 'contact'\n")
      await until(() => read().includes("'/contact'"))

      mkdirSync(join(pages, 'contact'))
      writeFileSync(join(pages, 'contact', 'index.js'), "export default () => 'dup'\n")
      await until(() => stderr.includes('both map to "/contact"'))
      expect(child.exitCode).toBeNull()

      rmSync(join(pages, 'contact'), { recursive: true })
      rmSync(join(pages, 'about.js'))
      await until(() => !read().includes("'/about'"))
      expect(read()).toContain("'/contact'")
    } finally {
      child.kill()
    }
  })

  /**
   * Start `quiver routes --watch` in cwd.
   * @param {string} cwd
   */
  function watching(cwd) {
    const child = spawn('node', [CLI, 'routes', '--watch'], { cwd })
    const io = { stdout: '', stderr: '', child }
    child.stdout.on('data', (d) => { io.stdout += d })
    child.stderr.on('data', (d) => { io.stderr += d })
    return io
  }

  /**
   * The exit code, once the process has exited and its stdout and stderr have
   * closed, so the output read after it is complete (R32-10).
   * @param {import('node:child_process').ChildProcess} child
   */
  const exited = (child) => new Promise((resolve) => child.on('close', (code) => resolve(code)))

  it('N136: --watch on a missing directory prints one [quiver] line and exits 1', async () => {
    const cwd = mkdtempSync(join(TMP, 'quiver-cli-'))
    const io = watching(cwd)
    expect(await exited(io.child)).toBe(1)
    expect(io.stderr).toBe(`[quiver] Pages directory not found: ${join(cwd, 'src', 'pages')}\n`)
    expect(io.stdout).toBe('')
  })

  // Root reads any directory, so the permission case only runs as a normal user.
  it.skipIf(process.getuid?.() === 0 || process.platform === 'win32')('N136: --watch on an unreadable directory prints one [quiver] line and exits 1', async () => {
    const cwd = project()
    const pages = join(cwd, 'src', 'pages')
    chmodSync(pages, 0o000)
    try {
      const io = watching(cwd)
      expect(await exited(io.child)).toBe(1)
      expect(io.stderr).toMatch(/^\[quiver\] Cannot watch src\/pages: .*EACCES.*\n$/)
      expect(io.stderr).not.toContain('    at ')
    } finally {
      chmodSync(pages, 0o755)
    }
  })

  it('N136: rapid changes end at the latest manifest; a bad scan keeps the last good one', async () => {
    const cwd = project()
    const pages = join(cwd, 'src', 'pages')
    const out = join(cwd, 'src', 'routes.gen.js')
    const read = () => { try { return readFileSync(out, 'utf8') } catch { return '' } }
    const io = watching(cwd)
    try {
      await until(() => io.stdout.includes('Watching'))

      // A burst of adds and removes, spread past the 50 ms debounce so scans
      // overlap with new events.
      for (let i = 0; i < 12; i++) {
        writeFileSync(join(pages, `p${i}.js`), "export default () => ''\n")
        if (i % 3 === 2) rmSync(join(pages, `p${i - 1}.js`))
        await new Promise((r) => setTimeout(r, 20))
      }
      const expected = Array.from({ length: 12 }, (_, i) => i).filter((i) => i % 3 !== 1)
      await until(() => expected.every((i) => read().includes(`'/p${i}'`)) && !read().includes("'/p1'"))
      await new Promise((r) => setTimeout(r, 300))
      for (let i = 0; i < 12; i++) expect(read().includes(`'/p${i}'`)).toBe(expected.includes(i))

      // An invalid edit: the error is printed, the last good manifest stays.
      const good = read()
      writeFileSync(join(pages, '100%.js'), "export default () => ''\n")
      await until(() => io.stderr.includes('100%.js contains "%"'))
      await new Promise((r) => setTimeout(r, 200))
      expect(read()).toBe(good)
      expect(io.child.exitCode).toBeNull()

      // Fixing it resumes; no temporary file is left behind.
      rmSync(join(pages, '100%.js'))
      writeFileSync(join(pages, 'last.js'), "export default () => ''\n")
      await until(() => read().includes("'/last'"))
      expect(readdirSync(join(cwd, 'src')).filter((f) => f.endsWith('.tmp'))).toEqual([])
    } finally {
      io.child.kill()
    }
  })
})

describe('quiver app', () => {
  /** A temp project with a copy of the fixture app at src. */
  function appProject() {
    const cwd = mkdtempSync(join(TMP, 'quiver-cli-'))
    cpSync(join(FIXTURES, 'app'), join(cwd, 'src'), { recursive: true })
    return cwd
  }

  it('S-63: defaults to src → src/app.gen.js with ./ specifiers; warnings on stderr, exit 0', () => {
    const cwd = appProject()
    const { status, stdout, stderr } = runCli(['app'], cwd)
    expect(status).toBe(0)
    expect(stdout).toContain('Wrote src/app.gen.js')
    expect(stderr).toContain('[quiver] typo.js: unknown layout "menuu"')
    const source = readFileSync(join(cwd, 'src', 'app.gen.js'), 'utf8')
    expect(source).toContain("import layout0 from './layouts/default.js'")
    expect(source).toContain("    '/about': () => import('./pages/about.js'),")
    expect(runCli(['app'], cwd).stdout).toContain('Unchanged src/app.gen.js')
  })

  it('S-63: --out defaults inside --src; specifiers climb with ../', () => {
    const cwd = appProject()
    expect(runCli(['app', '--src', 'src', '--out', 'gen/app.js'], cwd).status).toBe(0)
    expect(readFileSync(join(cwd, 'gen', 'app.js'), 'utf8')).toContain("import config from '../src/app.config.js'")
  })

  it.each(['src/pages/app.gen.js', 'src/layouts/app.js', 'src/middleware/x.js', 'src/views/app.js'])('S-63: --out %s is a usage error', (out) => {
    const cwd = appProject()
    const { status, stderr } = runCli(['app', '--out', out], cwd)
    expect(status).toBe(2)
    expect(stderr).toContain('which quiver app scans')
  })

  it.each(['src/app.config.js', 'src/pages/admin/_middleware.js'])('S32-03: --out %s, a file the scan reads, is a usage error and changes nothing', (out) => {
    const cwd = appProject()
    const before = readFileSync(join(cwd, out), 'utf8')
    for (const args of [['app', '--out', out], ['app', '--out', out, '--watch']]) {
      const { status, stderr } = runCli(args, cwd)
      expect(status).toBe(2)
      expect(stderr).toContain('is a file quiver app reads')
    }
    expect(readFileSync(join(cwd, out), 'utf8')).toBe(before)
    expect(readdirSync(join(cwd, out, '..')).filter((f) => f.endsWith('.tmp'))).toEqual([])
  })

  it('S32-03: an existing file not generated by Quiver is never overwritten, by either command', () => {
    const cwd = appProject()
    const own = "export const x = 1\n"
    writeFileSync(join(cwd, 'src', 'app.gen.js'), own)
    writeFileSync(join(cwd, 'src', 'routes.gen.js'), own)
    for (const [args, file] of [[['app'], 'app.gen.js'], [['routes'], 'routes.gen.js']]) {
      const { status, stderr } = runCli(args, cwd)
      expect(status).toBe(1)
      expect(stderr).toContain(`[quiver] src/${file} exists and was not generated by Quiver`)
      expect(readFileSync(join(cwd, 'src', file), 'utf8')).toBe(own)
    }
    expect(readdirSync(join(cwd, 'src')).filter((f) => f.endsWith('.tmp'))).toEqual([])
  })

  it('S32-03: a generated file at a custom place is updated, and an empty file is filled', () => {
    const cwd = appProject()
    mkdirSync(join(cwd, 'gen'))
    writeFileSync(join(cwd, 'gen', 'app.js'), '// Generated by Quiver. Do not edit.\nexport default {}\n')
    writeFileSync(join(cwd, 'gen', 'empty.js'), '')
    for (const out of ['gen/app.js', 'gen/empty.js']) {
      expect(runCli(['app', '--out', out], cwd).status).toBe(0)
      expect(readFileSync(join(cwd, out), 'utf8')).toContain("import config from '../src/app.config.js'")
    }
  })

  it('S32-03: concurrent writers each use their own temp file and leave one complete manifest', async () => {
    const cwd = appProject()
    const runs = Array.from({ length: 6 }, () => new Promise((resolve) => {
      const child = spawn('node', [CLI, 'app', '--out', 'gen/app.js'], { cwd, stdio: 'ignore' })
      child.on('close', resolve)
    }))
    expect(await Promise.all(runs)).toEqual(Array(6).fill(0))
    const source = readFileSync(join(cwd, 'gen', 'app.js'), 'utf8')
    expect(source.startsWith('// Generated by Quiver.')).toBe(true)
    expect(source.endsWith('}\n')).toBe(true)
    expect(readdirSync(join(cwd, 'gen'))).toEqual(['app.js'])
  })

  it('S-63: --dir belongs to quiver routes and --src to quiver app', () => {
    const cwd = appProject()
    expect(runCli(['app', '--dir', 'src/pages'], cwd).status).toBe(2)
    expect(runCli(['routes', '--src', 'src'], cwd).status).toBe(2)
    expect(runCli(['app', '--help'], cwd).stdout).toContain('quiver app [--src <source dir>] [--out <file>] [--watch]')
  })

  it('S-63: --watch rewrites on a new layout and on a page’s meta.nav edit', async () => {
    const cwd = appProject()
    const out = join(cwd, 'src', 'app.gen.js')
    const read = () => { try { return readFileSync(out, 'utf8') } catch { return '' } }
    const child = spawn('node', [CLI, 'app', '--watch'], { cwd })
    let stdout = ''
    child.stdout.on('data', (d) => { stdout += d })
    try {
      await until(() => stdout.includes('Watching'))
      writeFileSync(join(cwd, 'src', 'layouts', 'wide.js'), 'export default (c) => c\n')
      await until(() => read().includes("'wide': layout2"))
      writeFileSync(join(cwd, 'src', 'pages', 'about.js'), "export const meta = { nav: { label: 'About us', order: 2 } }\nexport default () => ''\n")
      await until(() => read().includes("label: 'About us'"))
    } finally {
      child.kill()
    }
  })

  it('R32-06: --watch prints a new warning on an edit and does not repeat unchanged ones', async () => {
    const cwd = appProject()
    const out = join(cwd, 'src', 'app.gen.js')
    const child = spawn('node', [CLI, 'app', '--watch'], { cwd })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    const count = (/** @type {string} */ text) => stderr.split(text).length - 1
    try {
      await until(() => stdout.includes('Watching'))
      expect(count('typo.js: unknown layout')).toBe(1)
      writeFileSync(join(cwd, 'src', 'pages', 'about.js'), "export const meta = { layout: 'wide', nav: { label: 'About', order: 2 } }\nexport default () => ''\n")
      await until(() => stderr.includes('about.js: unknown layout "wide"'))
      writeFileSync(join(cwd, 'src', 'pages', 'about.js'), "export const meta = { layout: 'wide', nav: { label: 'About us', order: 2 } }\nexport default () => ''\n")
      await until(() => readFileSync(out, 'utf8').includes("label: 'About us'"))
      expect(count('typo.js: unknown layout')).toBe(1)
      expect(count('about.js: unknown layout')).toBe(1)
    } finally {
      child.kill()
    }
  })
})
