// The two-argument createApp(app, options) form (TECH-SPEC §12.4, C-73, C-74).
import { describe, it, expect, vi, afterEach, beforeEach as before } from 'vitest'
import { html, nextTick } from '@arrow-js/core'
import { createApp, destroy } from '../src/app.js'
import { initRouter, go, beforeEach as guard, afterEach as after } from '../src/router.js'
import { provide, inject } from '../src/context.js'
import { useRoute } from '../src/route.js'
import { installNavigation, setLocation } from './helpers/navigation.js'

/** @typedef {import('../src/types.js').AppManifest} AppManifest */

/** @param {string} text */
const Page = (text) => () => html`<section data-page>${text}</section>`
/** @param {() => any} page @param {Record<string, unknown>} [meta] */
const mod = (page, meta) => () => ({ default: page, meta })
/** @param {string} name */
const Layout = (name) => (/** @type {any} */ c) => html`<main data-layout="${name}">${c}</main>`

/** @type {HTMLElement} */
let target

before(() => {
  target = document.createElement('div')
  target.id = 'app'
  document.body.replaceChildren(target)
  installNavigation()
  setLocation('/')
})

afterEach(() => {
  destroy()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setLocation('/')
})

/**
 * @param {Partial<AppManifest>} [over]
 * @returns {AppManifest}
 */
const manifest = (over = {}) => ({
  routes: { '/': mod(Page('home')), '/admin': mod(Page('admin'), { layout: 'menu' }) },
  notFound: mod(Page('missing')),
  layouts: { default: Layout('default'), menu: Layout('menu') },
  middleware: {},
  views: {},
  nav: [{ to: '/', label: 'Home' }],
  config: {},
  ...over,
})

describe('C-73: createApp(app, options)', () => {
  it('returns a promise for the App; one argument still returns the App', async () => {
    const pending = createApp(manifest(), { target })
    expect(pending).toBeInstanceOf(Promise)
    const app = await pending
    expect(typeof app.destroy).toBe('function')
    expect(target.querySelector('[data-layout="default"] [data-page]')?.textContent).toBe('home')
  })

  it('(1) provides each own key of config, (2) provides nav', async () => {
    const user = { name: 'Ada' }
    await createApp(manifest({ config: { app: { name: 'Demo' }, currentUser: user } }), { target })
    expect(inject('app')).toEqual({ name: 'Demo' })
    expect(inject('currentUser')).toBe(user)
    expect(inject('nav')).toEqual([{ to: '/', label: 'Home' }])
  })

  it('a config nav wins over the generated nav', async () => {
    const nav = [{ to: '/admin', label: 'Admin' }]
    await createApp(manifest({ config: { nav } }), { target })
    expect(inject('nav')).toBe(nav)
  })

  it('config is provided before the router starts, so guards can inject it', async () => {
    /** @type {unknown[]} */
    const seen = []
    guard(() => { seen.push(inject('flag')) })
    await createApp(manifest({ config: { flag: 'on' } }), { target })
    expect(seen).toEqual(['on'])
  })

  it('(3) starts the router with routes, notFound, base and middleware', async () => {
    setLocation('/app/nowhere')
    const mw = vi.fn()
    await createApp(manifest({ middleware: { global: [mw] } }), { target, base: '/app/' })
    expect(mw).toHaveBeenCalledWith({ from: null, to: '/nowhere' })
    expect(useRoute().status()).toBe('not-found')
    expect(target.textContent).toContain('missing')
  })

  it('(4) options.layouts merge over app.layouts; defaultLayout passes through', async () => {
    await createApp(manifest(), { target, layouts: { menu: Layout('mine') }, defaultLayout: 'menu' })
    expect(target.querySelector('[data-layout="mine"]')).not.toBeNull()
    await go('/admin')
    await nextTick()
    expect(target.querySelector('[data-layout="mine"] [data-page]')?.textContent).toBe('admin')
  })

  it('(4) app.views are used, and options.loading / options.error win over them', async () => {
    const boom = new Error('load failed')
    const routes = { '/': () => { throw boom } }
    const viewError = vi.fn(({ message }) => html`<p data-view="app">${message}</p>`)
    await createApp(manifest({ routes, views: { error: viewError } }), { target })
    expect(target.querySelector('[data-view="app"]')?.textContent).toBe('load failed')
    destroy()
    installNavigation()
    const optionError = ({ message }) => html`<p data-view="option">${message}</p>`
    await createApp(manifest({ routes, views: { error: viewError } }), { target, error: /** @type {any} */ (optionError) })
    expect(target.querySelector('[data-view="option"]')?.textContent).toBe('load failed')
  })

  it('hooks registered before it see the initial navigation', async () => {
    const a = vi.fn()
    after(a)
    await createApp(manifest(), { target })
    expect(a).toHaveBeenCalledWith({ from: null, to: '/', status: 'ready' })
  })

  it('accepts a hand-written manifest with only routes (M-22)', async () => {
    const app = /** @type {AppManifest} */ (/** @type {unknown} */ ({ routes: { '/': mod(Page('bare')) } }))
    await createApp(app, { target })
    expect(target.querySelector('[data-page]')?.textContent).toBe('bare')
  })

  it('destroy() clears what it provided', async () => {
    const app = await createApp(manifest({ config: { app: { name: 'Demo' } } }), { target })
    app.destroy()
    expect(inject('app')).toBeUndefined()
    expect(inject('nav')).toBeUndefined()
  })
})

describe('C-74: failure undoes its own provide() calls', () => {
  it('a bad target rejects, and a second call with a good target mounts', async () => {
    const app = manifest({ config: { app: { name: 'Demo' } } })
    await expect(createApp(app, { target: '#missing' })).rejects.toThrow('createApp(): target "#missing" not found.')
    expect(inject('app')).toBeUndefined()
    expect(inject('nav')).toBeUndefined()
    await createApp(app, { target: '#app' })
    expect(inject('app')).toEqual({ name: 'Demo' })
    expect(target.querySelector('[data-page]')?.textContent).toBe('home')
  })

  it('an initRouter error rejects with its message and puts earlier provide() values back', async () => {
    provide('app', 'mine')
    const routes = /** @type {any} */ ({ users: mod(Page('x')) })
    await expect(createApp(manifest({ routes, config: { app: 'theirs' } }), { target })).rejects.toThrow('initRouter(): route "users" must start with "/".')
    expect(inject('app')).toBe('mine')
    await createApp(manifest({ config: { app: 'theirs' } }), { target })
    expect(inject('app')).toBe('theirs')
  })

  it('a base outside the URL rejects (C-14), then a retry works', async () => {
    await expect(createApp(manifest(), { target, base: '/elsewhere/' })).rejects.toThrow('is outside base')
    await expect(createApp(manifest(), { target })).resolves.toBeTruthy()
  })

  it('a call while mounted, or after a manual initRouter(), rejects and changes nothing', async () => {
    await createApp(manifest(), { target })
    await expect(createApp(manifest({ config: { app: 'x' } }), { target })).rejects.toThrow('createApp() was already called. Call destroy() first.')
    expect(inject('app')).toBeUndefined()
    destroy()
    installNavigation()
    await initRouter({ routes: { '/': mod(Page('home')) } })
    await expect(createApp(manifest({ config: { app: 'x' } }), { target })).rejects.toThrow('initRouter() was already called. Call destroy() first.')
    expect(inject('app')).toBeUndefined()
  })

  it('guards registered before a failed call still count for the retry (§1.2)', async () => {
    const g = vi.fn()
    guard(g)
    await expect(createApp(manifest(), { target: '#missing' })).rejects.toThrow()
    await createApp(manifest(), { target })
    expect(g).toHaveBeenCalledWith({ from: null, to: '/' })
  })

  it('a non-object app or options rejects with a TypeError', async () => {
    await expect(createApp(/** @type {any} */ (null), { target })).rejects.toThrow(TypeError)
    await expect(createApp(manifest(), /** @type {any} */ (undefined))).rejects.toThrow(TypeError)
  })
})
