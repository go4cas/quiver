// @vitest-environment node
// TECH-SPEC §4.3, S-10…S-13: the Vite plugin.
import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from 'node:events'
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
})
