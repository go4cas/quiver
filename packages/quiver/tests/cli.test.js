// @vitest-environment node
// TECH-SPEC §4.5, S-30…S-34: the `quiver routes` CLI.
import { describe, it, expect } from 'vitest'
import { spawn } from 'node:child_process'
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CLI, runCli } from './helpers/frontends.js'

const FIXTURES = join(import.meta.dirname, 'fixtures')

/** A temp project with a copy of the fixture pages at src/pages. */
function project() {
  const cwd = mkdtempSync(join(tmpdir(), 'quiver-cli-'))
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
    const cwd = mkdtempSync(join(tmpdir(), 'quiver-cli-'))
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

  /** @param {import('node:child_process').ChildProcess} child */
  const exited = (child) => new Promise((resolve) => child.on('exit', (code) => resolve(code)))

  it('N136: --watch on a missing directory prints one [quiver] line and exits 1', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'quiver-cli-'))
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
