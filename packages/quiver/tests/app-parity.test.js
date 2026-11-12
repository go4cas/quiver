// @vitest-environment node
// TECH-SPEC S-65 (§12.3): one fixture source folder produces an identical
// `quiver:app` module through the Vite plugin, the Bun plugin and `quiver app`,
// and each broken fixture fails the same way in all three.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { runCli, viaBunApp, viaCliApp, viaViteApp } from './helpers/frontends.js'

const FIXTURES = join(import.meta.dirname, 'fixtures')
const APP = join(FIXTURES, 'app')
const SNAPSHOT = join(FIXTURES, 'app.manifest.txt')

/**
 * Replace every import specifier with the file relative to the fixture app.
 * @param {string} source
 * @param {string} from directory relative specifiers resolve against
 */
const normalise = (source, from) =>
  source.replace(/(from |import\()'([^']+)'/g, (_, lead, spec) => `${lead}'${relative(APP, resolve(from, spec)).replace(/\\/g, '/')}'`)

const WARNINGS = [
  '[quiver] bad-nav.js: meta.nav must be { label: string, order?: number }; the page is left out of nav.',
  '[quiver] computed.js: meta is not a plain literal, so its nav and layout are not checked at build time.',
  '[quiver] typo.js: unknown layout "menuu" (layouts: default, menu).',
  '[quiver] users/[id].js: meta.nav is ignored on "/users/:id", which has a parameter and so no single link.',
  '[quiver] not-found.js: meta.nav is ignored on the not-found page.',
]

describe('S-65: quiver:app front-end parity', () => {
  it('the Vite plugin, the Bun plugin and the CLI emit the same module, matching the snapshot', async () => {
    const vite = await viaViteApp(APP)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bun = await viaBunApp(APP)
    expect(warn.mock.calls.map((c) => c[0])).toEqual(WARNINGS)
    warn.mockRestore()
    const cli = viaCliApp(APP)

    const fromVite = normalise(vite.source, '/')
    expect(normalise(bun, '/')).toBe(fromVite)
    expect(normalise(cli.source, dirname(cli.out))).toBe(fromVite)
    expect(fromVite).toBe(readFileSync(SNAPSHOT, 'utf8'))
  })

  it('S-58: the same warnings reach Vite’s warn, Bun’s console.warn and the CLI’s stderr', async () => {
    expect((await viaViteApp(APP)).warnings).toEqual(WARNINGS)
    expect(viaCliApp(APP).stderr.trim().split('\n')).toEqual(WARNINGS)
  })

  it('specifiers are absolute for the plugins and ./ or ../ relative for the CLI', async () => {
    const specs = (/** @type {string} */ s) => [...s.matchAll(/(?:from |import\()'([^']+)'/g)].map((m) => m[1])
    const abs = APP.replace(/\\/g, '/')
    for (const spec of specs((await viaViteApp(APP)).source)) expect(spec.startsWith(abs)).toBe(true)
    for (const spec of specs(await viaBunApp(APP))) expect(spec.startsWith(abs)).toBe(true)
    for (const spec of specs(viaCliApp(APP).source)) expect(spec).toMatch(/^\.\.?\//)
  })

  it.each([
    ['layout-folder', '[quiver] layouts/admin/ is a folder; layouts/ is read one level deep. Move its files up, or name it _admin for helpers.'],
    ['layout-name', '[quiver] layouts/Bad Name.js: a layout name uses letters, digits and "-", and starts with a letter or digit.'],
    ['middleware-folder', '[quiver] middleware/admin/ is a folder; middleware/ is read one level deep. Move its files up, or name it _admin for helpers.'],
    ['views-extra', '[quiver] views/header.js: only loading.js and error.js are read from views/.'],
  ])('broken fixture %s fails the same way in all three', async (name, expected) => {
    const src = join(FIXTURES, 'broken-app', name)
    const vite = await viaViteApp(src).then(() => '', (e) => e.message)
    const bun = await viaBunApp(src).then(() => '', (e) => e.message)
    const cli = runCli(['app', '--src', src, '--out', join(src, '..', `${name}.gen.js`)])
    expect(vite).toBe(expected)
    expect(bun).toBe(vite)
    expect(cli.status).toBe(1)
    expect(cli.stderr).toContain(vite)
  })
})
