// @vitest-environment node
// TECH-SPEC S-40 (P4 Done-when): one fixture pages/ folder produces an identical
// manifest through the Vite plugin, the Bun plugin and the CLI.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { viaBun, viaCli, viaVite } from './helpers/frontends.js'

const FIXTURES = join(import.meta.dirname, 'fixtures')
const PAGES = join(FIXTURES, 'pages')
const SNAPSHOT = join(FIXTURES, 'pages.manifest.txt')

/**
 * Replace every import specifier with the page file relative to the fixture dir.
 * @param {string} source
 * @param {string} from directory relative specifiers resolve against
 */
const normalise = (source, from) =>
  source.replace(/import\('([^']+)'\)/g, (_, spec) => `import('${relative(PAGES, resolve(from, spec)).replace(/\\/g, '/')}')`)

describe('S-40: route front-end parity', () => {
  it('the Vite plugin, the Bun plugin and the CLI emit the same manifest', async () => {
    const vite = normalise(await viaVite(PAGES), '/')
    const bun = normalise(await viaBun(PAGES), '/')
    const cli = viaCli(PAGES)
    const fromCli = normalise(cli.source, dirname(cli.out))

    expect(bun).toBe(vite)
    expect(fromCli).toBe(vite)
    expect(vite).toBe(readFileSync(SNAPSHOT, 'utf8'))
  })

  it('specifiers are absolute for the plugins and ./ or ../ relative for the CLI', async () => {
    const specs = (/** @type {string} */ s) => [...s.matchAll(/import\('([^']+)'\)/g)].map((m) => m[1])
    for (const spec of specs(await viaVite(PAGES))) expect(spec.startsWith(PAGES.replace(/\\/g, '/'))).toBe(true)
    for (const spec of specs(await viaBun(PAGES))) expect(spec.startsWith(PAGES.replace(/\\/g, '/'))).toBe(true)
    for (const spec of specs(viaCli(PAGES).source)) expect(spec).toMatch(/^\.\.?\//)
  })

  it.each(['nested-not-found', 'duplicate', 'param-names', 'bad-pattern', 'percent'])('broken fixture %s fails the same way in all three', async (name) => {
    const dir = join(FIXTURES, 'broken', name)
    const vite = await viaVite(dir).catch((e) => e.message)
    const bun = await viaBun(dir).catch((e) => e.message)
    let cli
    try { viaCli(dir) } catch (e) { cli = /** @type {Error} */ (e).message }
    expect(vite).toMatch(/^\[quiver\] /)
    expect(bun).toBe(vite)
    expect(cli).toContain(vite)
    expect(cli).toContain('quiver routes exited 1')
  })
})
