// @vitest-environment node
// TECH-SPEC §4.3, S-10…S-13: the Vite plugin.
import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import quiver from '../src/node/vite.js'

const FIXTURES = join(import.meta.dirname, 'fixtures')

describe('Vite plugin', () => {
  it('S-10: resolves only quiver:routes, to \\0quiver:routes', () => {
    const plugin = quiver()
    expect(plugin.resolveId('quiver:routes')).toBe('\0quiver:routes')
    expect(plugin.resolveId('quiver:other')).toBeUndefined()
    expect(plugin.resolveId('./main.js')).toBeUndefined()
  })

  it('S-10: dir is relative to the Vite root, default src/pages; loads only its own id', async () => {
    const plugin = quiver({ dir: 'pages' })
    plugin.configResolved({ root: FIXTURES })
    expect(await plugin.load('/src/main.js')).toBeUndefined()
    const source = await plugin.load('\0quiver:routes')
    expect(source).toContain(`'/about': () => import('${join(FIXTURES, 'pages', 'about.js').replace(/\\/g, '/')}'),`)

    const fallback = quiver()
    fallback.configResolved({ root: FIXTURES })
    await expect(fallback.load('\0quiver:routes')).rejects.toThrow(`Pages directory not found: ${join(FIXTURES, 'src', 'pages')}`)
  })

  it('S-12: a scan error rejects load(), which fails the build and shows the overlay', async () => {
    const plugin = quiver({ dir: 'broken/duplicate' })
    plugin.configResolved({ root: FIXTURES })
    await expect(plugin.load('\0quiver:routes')).rejects.toThrow(/^\[quiver\] users\.js and users\/index\.js/)
  })

  it('S-11: adding or removing a page invalidates the manifest and reloads; edits and other files do not', () => {
    const plugin = quiver({ dir: 'pages' })
    plugin.configResolved({ root: FIXTURES })
    const watcher = new EventEmitter()
    const mod = { id: '\0quiver:routes' }
    const server = {
      config: { root: FIXTURES },
      watcher: /** @type {any} */ (watcher),
      moduleGraph: { getModuleById: vi.fn((/** @type {string} */ id) => (id === mod.id ? mod : undefined)), invalidateModule: vi.fn() },
      ws: { send: vi.fn() },
    }
    plugin.configureServer(server)

    watcher.emit('add', join(FIXTURES, 'pages', 'new.js'))
    watcher.emit('unlink', join(FIXTURES, 'pages', 'users', 'old.js'))
    expect(server.moduleGraph.invalidateModule).toHaveBeenCalledTimes(2)
    expect(server.moduleGraph.invalidateModule).toHaveBeenCalledWith(mod)
    expect(server.ws.send).toHaveBeenCalledTimes(2)
    expect(server.ws.send).toHaveBeenCalledWith({ type: 'full-reload' })

    watcher.emit('change', join(FIXTURES, 'pages', 'about.js'))
    watcher.emit('add', join(FIXTURES, 'pages', 'notes.md'))
    watcher.emit('add', join(FIXTURES, 'elsewhere.js'))
    watcher.emit('unlink', join(FIXTURES, 'pages-other', 'x.js'))
    expect(server.ws.send).toHaveBeenCalledTimes(2)
  })

  it('S-11: adding or removing a file the scanner skips (`_` or `.` segment) does not reload', () => {
    const plugin = quiver({ dir: 'pages' })
    plugin.configResolved({ root: FIXTURES })
    const watcher = new EventEmitter()
    const server = {
      config: { root: FIXTURES },
      watcher: /** @type {any} */ (watcher),
      moduleGraph: { getModuleById: vi.fn(() => ({})), invalidateModule: vi.fn() },
      ws: { send: vi.fn() },
    }
    plugin.configureServer(server)

    watcher.emit('add', join(FIXTURES, 'pages', '_parts', 'Card.js'))
    watcher.emit('unlink', join(FIXTURES, 'pages', 'users', '_helper.js'))
    watcher.emit('add', join(FIXTURES, 'pages', '.drafts', 'idea.js'))
    watcher.emit('add', join(FIXTURES, 'pages', '.hidden.js'))
    expect(server.moduleGraph.invalidateModule).not.toHaveBeenCalled()
    expect(server.ws.send).not.toHaveBeenCalled()

    watcher.emit('add', join(FIXTURES, 'pages', 'users', 'new.js'))
    expect(server.ws.send).toHaveBeenCalledTimes(1)
  })

  it('S-60: resolves quiver:app; srcDir is relative to the Vite root, default src; pages default to <srcDir>/pages', async () => {
    const plugin = quiver({ srcDir: 'app' })
    expect(plugin.resolveId('quiver:app')).toBe('\0quiver:app')
    plugin.configResolved({ root: FIXTURES })
    /** @type {string[]} */
    const warnings = []
    const source = await plugin.load.call({ warn: (/** @type {string} */ m) => warnings.push(m) }, '\0quiver:app')
    expect(source).toContain(`import layout1 from '${join(FIXTURES, 'app', 'layouts', 'menu.js').replace(/\\/g, '/')}'`)
    expect(source).toContain(`'/about': () => import('${join(FIXTURES, 'app', 'pages', 'about.js').replace(/\\/g, '/')}'),`)
    expect(warnings).toContain('[quiver] typo.js: unknown layout "menuu" (layouts: default, menu).')

    const routes = await plugin.load('\0quiver:routes')
    expect(routes).toContain(`'/about': () => import('${join(FIXTURES, 'app', 'pages', 'about.js').replace(/\\/g, '/')}'),`)
  })

  /** @param {string} srcDir */
  function devServer(srcDir) {
    const plugin = quiver({ srcDir })
    plugin.configResolved({ root: FIXTURES })
    const watcher = new EventEmitter()
    /** @type {Record<string, { id: string }>} */
    const loaded = {}
    const server = {
      config: { root: FIXTURES },
      watcher: /** @type {any} */ (watcher),
      moduleGraph: { getModuleById: vi.fn((/** @type {string} */ id) => loaded[id]), invalidateModule: vi.fn() },
      ws: { send: vi.fn() },
    }
    plugin.configureServer(server)
    return { plugin, watcher, server, loaded }
  }

  it('S-61: adding or removing an app file invalidates quiver:app and reloads, once it is loaded', async () => {
    const { plugin, watcher, server, loaded } = devServer('app')
    const app = join(FIXTURES, 'app')

    watcher.emit('add', join(app, 'layouts', 'wide.js'))
    expect(server.ws.send).not.toHaveBeenCalled()

    loaded['\0quiver:app'] = { id: '\0quiver:app' }
    await plugin.load.call({ warn: () => {} }, '\0quiver:app')
    for (const file of ['layouts/wide.js', 'middleware/03.log.js', 'views/error.js', 'app.config.js', 'pages/admin/_middleware.js']) {
      watcher.emit('add', join(app, file))
    }
    expect(server.ws.send).toHaveBeenCalledTimes(5)
    expect(server.moduleGraph.invalidateModule).toHaveBeenCalledTimes(5)

    watcher.emit('add', join(app, 'pages', 'new.js'))
    expect(server.ws.send).toHaveBeenCalledTimes(6)

    for (const file of ['layouts/menu.css', 'layouts/_parts/x.js', 'components/Card.js', 'main.js']) watcher.emit('unlink', join(app, file))
    expect(server.ws.send).toHaveBeenCalledTimes(6)
  })

  it('S-61: editing a page reloads only when quiver:app changed', async () => {
    const root = mkdtempSync(join(tmpdir(), 'quiver-vite-'))
    cpSync(join(FIXTURES, 'app'), join(root, 'app'), { recursive: true })
    const plugin = quiver({ srcDir: join(root, 'app') })
    plugin.configResolved({ root })
    const watcher = new EventEmitter()
    const mod = { id: '\0quiver:app' }
    const server = {
      config: { root },
      watcher: /** @type {any} */ (watcher),
      moduleGraph: { getModuleById: vi.fn((/** @type {string} */ id) => (id === mod.id ? mod : undefined)), invalidateModule: vi.fn() },
      ws: { send: vi.fn() },
    }
    plugin.configureServer(server)
    await plugin.load.call({ warn: () => {} }, '\0quiver:app')

    const about = join(root, 'app', 'pages', 'about.js')
    writeFileSync(about, "export const meta = { 'layout': 'menu', nav: { label: 'About', order: 2 } }\nexport default () => 'about, edited'\n")
    watcher.emit('change', about)
    await new Promise((r) => setTimeout(r, 100))
    expect(server.ws.send).not.toHaveBeenCalled()

    writeFileSync(about, "export const meta = { nav: { label: 'About us', order: 2 } }\nexport default () => 'about'\n")
    watcher.emit('change', about)
    await vi.waitFor(() => expect(server.ws.send).toHaveBeenCalledWith({ type: 'full-reload' }))
    expect(server.moduleGraph.invalidateModule).toHaveBeenCalledWith(mod)
  })
})
