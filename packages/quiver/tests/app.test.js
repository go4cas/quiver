import { describe, it, expect, vi, afterEach, beforeEach as before } from 'vitest'
import { html, component, onCleanup, nextTick } from '@arrow-js/core'
import { createApp, destroy } from '../src/app.js'
import { initRouter, go, retry as retryRoute, beforeEach as guard, afterEach as after, onError } from '../src/router.js'
import { provide, inject } from '../src/context.js'
import { useMeta } from '../src/meta.js'
import { useRoute } from '../src/route.js'
import { reactive } from '@arrow-js/core'
import { installNavigation, setLocation } from './helpers/navigation.js'

/** @param {string} text */
const Page = (text) => () => html`<section data-page>${text}</section>`
/** @param {() => any} page @param {Record<string, unknown>} [meta] */
const mod = (page, meta) => () => ({ default: page, meta })

/** @type {HTMLElement} */
let target

before(() => {
  target = document.createElement('div')
  target.id = 'app'
  document.body.replaceChildren(target)
})

afterEach(() => {
  destroy()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setLocation('/')
})

/**
 * @param {Record<string, any>} routes
 * @param {{ at?: string, notFound?: any, base?: string }} [opts]
 */
async function boot(routes, { at = '/', notFound, base } = {}) {
  const nav = installNavigation()
  setLocation(at)
  await initRouter({ routes, notFound, base })
  return nav
}

describe('createApp: startup order and target (C-40…C-43)', () => {
  it('C-40: throws before initRouter() has resolved', async () => {
    const msg = 'createApp() needs a router. Call in this order: provide(), beforeEach()/afterEach()/onError(), await initRouter(), createApp().'
    expect(() => createApp({ target })).toThrow(msg)
    installNavigation()
    const pending = initRouter({ routes: { '/': mod(Page('home')) } })
    expect(() => createApp({ target })).toThrow(msg)
    await pending
    expect(() => createApp({ target })).not.toThrow()
  })

  it('C-41: a second createApp() before destroy() throws', async () => {
    await boot({ '/': mod(Page('home')) })
    createApp({ target })
    expect(() => createApp({ target })).toThrow('createApp() was already called. Call destroy() first.')
  })

  it('C-42: an unknown selector or a bad target throws', async () => {
    await boot({ '/': mod(Page('home')) })
    expect(() => createApp({ target: '#missing' })).toThrow('createApp(): target "#missing" not found.')
    expect(() => createApp({ target: /** @type {any} */ (42) })).toThrow(TypeError)
    expect(() => createApp({ target: /** @type {any} */ (undefined) })).toThrow(TypeError)
  })

  it('C-43: replaces existing children and mounts with no wrapper; selector works', async () => {
    target.innerHTML = '<noscript>enable JS</noscript><p>placeholder</p>'
    await boot({ '/': mod(Page('home')) })
    createApp({ target: '#app' })
    expect(target.querySelector('noscript')).toBeNull()
    expect(target.firstElementChild?.tagName).toBe('SECTION')
    expect(target.firstElementChild?.hasAttribute('data-page')).toBe(true)
    expect(target.children).toHaveLength(1)
  })
})

describe('outlet by status (C-45)', () => {
  it('ready: the page inside its layout', async () => {
    const menu = (/** @type {any} */ c) => html`<main data-layout="menu">${c}</main>`
    await boot({ '/': mod(Page('home'), { layout: 'menu' }) })
    createApp({ target, layouts: { menu } })
    expect(target.querySelector('main[data-layout="menu"] section')?.textContent).toBe('home')
  })

  it('loading: the loading view, bare default without a class', async () => {
    const nav = await boot({ '/': mod(Page('home')), '/slow': () => new Promise(() => {}) })
    createApp({ target })
    nav.navigate('/slow')
    await vi.waitFor(() => expect(target.innerHTML).toBe('<p>Loading…</p>'))
  })

  it('loading: a custom view', async () => {
    const nav = await boot({ '/': mod(Page('home')), '/slow': () => new Promise(() => {}) })
    createApp({ target, loading: () => html`<p>wait</p>` })
    nav.navigate('/slow')
    await vi.waitFor(() => expect(target.textContent).toBe('wait'))
  })

  it('error: the error view with message, error and retry; bare default has role=alert and no class', async () => {
    const boom = new Error('down')
    await boot({ '/': () => Promise.reject(boom) })
    const view = vi.fn(({ message }) => html`<p role="alert">${message}</p>`)
    createApp({ target, error: view })
    expect(view).toHaveBeenCalledWith({ message: 'down', error: boom, retry: expect.any(Function) })
    destroy()

    await boot({ '/': () => Promise.reject('plain string') })
    createApp({ target })
    expect(target.innerHTML).toBe('<p role="alert">plain string</p>')
  })

  it('not-found with a notFound page: that page inside its layout', async () => {
    const basic = (/** @type {any} */ c) => html`<div data-layout="basic">${c}</div>`
    await boot({ '/': mod(Page('home')) }, { at: '/nope', notFound: mod(Page('404'), { layout: 'basic' }) })
    createApp({ target, layouts: { basic } })
    expect(target.querySelector('[data-layout="basic"] section')?.textContent).toBe('404')
  })

  it('not-found without notFound: the error view, status not-found, no onError', async () => {
    const errors = vi.fn()
    const a = vi.fn()
    onError(errors)
    after(a)
    await boot({ '/': mod(Page('home')) }, { at: '/nope' })
    createApp({ target })
    expect(target.innerHTML).toBe('<p role="alert">No route matches "/nope".</p>')
    expect(useRoute().status()).toBe('not-found')
    expect(errors).not.toHaveBeenCalled()
    expect(a).toHaveBeenCalledWith({ from: null, to: '/nope', status: 'not-found' })
  })
})

describe('initial-navigation hooks (C-44)', () => {
  it('a rejecting initial loader: no onError before createApp(), exactly one after', async () => {
    const errors = vi.fn()
    const a = vi.fn()
    onError(errors)
    after(a)
    const boom = new Error('down')
    await boot({ '/': () => Promise.reject(boom) })
    expect(errors).not.toHaveBeenCalled()
    expect(a).not.toHaveBeenCalled()
    createApp({ target })
    expect(errors.mock.calls).toEqual([[{ error: boom, from: null, to: '/', phase: 'load' }]])
    expect(a.mock.calls).toEqual([[{ from: null, to: '/', status: 'error' }]])
  })

  it('a successful initial load fires afterEach once, inside createApp()', async () => {
    const a = vi.fn()
    after(a)
    await boot({ '/': mod(Page('home')) })
    expect(a).not.toHaveBeenCalled()
    createApp({ target })
    expect(a.mock.calls).toEqual([[{ from: null, to: '/', status: 'ready' }]])
  })

  it('C-26: the error view is in the target before onError runs', async () => {
    /** @type {string[]} */
    const seen = []
    onError(() => { seen.push(target.textContent ?? '') })
    const nav = await boot({ '/': mod(Page('home')), '/bad': () => Promise.reject(new Error('load failed')) })
    createApp({ target })
    await go('/bad')
    await nav.idle()
    expect(seen).toEqual(['load failed'])
  })
})

describe('retry (C-46)', () => {
  it('a loader that fails once then succeeds renders the page after retry()', async () => {
    let calls = 0
    const loader = () => (calls++ === 0 ? Promise.reject(new Error('flaky')) : Promise.resolve({ default: Page('loaded') }))
    /** @type {() => Promise<void>} */
    let retry = async () => {}
    const seen = vi.fn()
    guard(seen)
    const nav = await boot({ '/': mod(Page('home')), '/flaky': loader })
    createApp({ target, error: (p) => { retry = p.retry; return html`<p role="alert">${p.message}</p>` } })
    await go('/flaky')
    await nav.idle()
    expect(target.textContent).toBe('flaky')

    await retry()
    await nav.idle()
    expect(target.textContent).toBe('loaded')
    expect(seen).toHaveBeenLastCalledWith({ from: '/flaky', to: '/flaky' })
  })
})

describe('layout selection (C-47)', () => {
  const basic = (/** @type {any} */ c) => html`<div data-layout="basic">${c}</div>`

  it('meta.layout wins; missing meta.layout uses defaultLayout', async () => {
    const nav = await boot({ '/': mod(Page('home')), '/x': mod(Page('x'), { layout: 'other' }) })
    const other = (/** @type {any} */ c) => html`<div data-layout="other">${c}</div>`
    createApp({ target, layouts: { basic, other }, defaultLayout: 'basic' })
    expect(target.querySelector('[data-layout="basic"]')).not.toBeNull()
    await go('/x')
    await nav.idle()
    expect(target.querySelector('[data-layout="other"]')).not.toBeNull()
  })

  it('an unknown meta.layout renders the page bare and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await boot({ '/': mod(Page('home'), { layout: 'nope' }) })
    createApp({ target, layouts: { basic } })
    expect(target.firstElementChild?.tagName).toBe('SECTION')
    expect(warn).toHaveBeenCalledWith('[quiver] unknown layout "nope"')
  })

  it('an explicitly passed unknown defaultLayout warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await boot({ '/': mod(Page('home')) })
    createApp({ target, defaultLayout: 'basic' })
    expect(target.firstElementChild?.tagName).toBe('SECTION')
    expect(warn).toHaveBeenCalledWith('[quiver] unknown layout "basic"')
  })

  it('the implicit "default" with no such layout is silent', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await boot({ '/': mod(Page('home')) })
    createApp({ target })
    expect(target.firstElementChild?.tagName).toBe('SECTION')
    expect(warn).not.toHaveBeenCalled()
  })

  it('a layout named "default" is used implicitly', async () => {
    await boot({ '/': mod(Page('home')) })
    createApp({ target, layouts: { default: basic } })
    expect(target.querySelector('[data-layout="basic"] section')).not.toBeNull()
  })
})

describe('render errors (C-48)', () => {
  const Throwing = () => { throw new Error('render boom') }

  it('initial load: error view, one onError with phase render, afterEach status error', async () => {
    const errors = vi.fn()
    const a = vi.fn()
    onError(errors)
    after(a)
    await boot({ '/': mod(Throwing) })
    createApp({ target })
    expect(target.textContent).toBe('render boom')
    expect(errors).toHaveBeenCalledTimes(1)
    expect(errors.mock.calls[0][0]).toMatchObject({ from: null, to: '/', phase: 'render' })
    expect(a).toHaveBeenCalledWith({ from: null, to: '/', status: 'error' })
    expect(useRoute().status()).toBe('error')
  })

  it('in-app navigation: the same, with the error view shown before onError', async () => {
    const errors = vi.fn(() => { expect(target.textContent).toBe('render boom') })
    const a = vi.fn()
    const nav = await boot({ '/': mod(Page('home')), '/t': mod(Throwing) })
    createApp({ target })
    onError(errors)
    after(a)
    await go('/t')
    await nav.idle()
    expect(target.textContent).toBe('render boom')
    expect(errors).toHaveBeenCalledTimes(1)
    expect(errors.mock.calls[0]).toEqual([expect.objectContaining({ from: '/', to: '/t', phase: 'render' })])
    expect(a).toHaveBeenCalledWith({ from: '/', to: '/t', status: 'error' })
  })

  it('a throwing layout is a render error too', async () => {
    const errors = vi.fn()
    onError(errors)
    await boot({ '/': mod(Page('home')) })
    createApp({ target, layouts: { default: () => { throw new Error('layout boom') } } })
    expect(target.textContent).toBe('layout boom')
    expect(errors.mock.calls[0][0].phase).toBe('render')
  })
})

describe('destroy (C-49, C-50, C-62, C-63)', () => {
  it('(a) a page component rendered without a layout has its onCleanup run on destroy() (N162)', async () => {
    const cleanup = vi.fn()
    const PageComponent = component(() => {
      onCleanup(cleanup)
      return html`<section>comp</section>`
    })
    await boot({ '/': mod(() => PageComponent()) })
    createApp({ target })
    expect(target.textContent).toBe('comp')
    destroy()
    await nextTick()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('(b) resets state, context, listener and target', async () => {
    provide('k', 1)
    const nav = await boot({ '/': mod(Page('home')) })
    createApp({ target })
    destroy()
    expect(useRoute().status()).toBe('idle')
    expect(useRoute().path()).toBe('')
    expect(inject('k')).toBeUndefined()
    expect(nav.listenerCount()).toBe(0)
    expect(target.childNodes).toHaveLength(0)
    nav.navigate('/users')
    expect(nav.documentLoads).toEqual(['http://localhost:3000/users'])
  })

  it('clears guards and hooks', async () => {
    const g = vi.fn()
    const a = vi.fn()
    guard(g)
    after(a)
    await boot({ '/': mod(Page('home')) })
    destroy()
    g.mockClear()
    await boot({ '/': mod(Page('home')) })
    createApp({ target })
    expect(g).not.toHaveBeenCalled()
    expect(a).toHaveBeenCalledTimes(0)
  })

  it('stops useMeta watchers and puts back the host title and description (C-62, N128)', async () => {
    document.title = 'Host'
    document.querySelector('meta[name="description"]')?.remove()
    const state = reactive({ n: 1 })
    const MetaPage = () => { useMeta({ title: () => `n=${state.n}`, description: 'd' }); return html`<p>m</p>` }
    await boot({ '/': mod(MetaPage) })
    createApp({ target })
    expect(document.title).toBe('n=1')
    destroy()
    expect(document.title).toBe('Host')
    expect(document.querySelector('meta[name="description"]')).toBeNull()
    state.n = 2
    await nextTick()
    expect(document.title).toBe('Host')
  })

  it('is idempotent and works when only initRouter() ran', async () => {
    destroy()
    destroy()
    await boot({ '/': mod(Page('home')) })
    destroy()
    destroy()
    expect(useRoute().status()).toBe('idle')
  })

  it('drops an in-flight load', async () => {
    /** @type {(v: any) => void} */
    let release = () => {}
    const a = vi.fn()
    const nav = await boot({ '/': mod(Page('home')), '/slow': () => new Promise((r) => { release = r }) })
    createApp({ target })
    after(a)
    nav.navigate('/slow')
    await nextTick()
    destroy()
    release({ default: Page('late') })
    await nav.idle()
    expect(a).not.toHaveBeenCalled()
    expect(useRoute().status()).toBe('idle')
  })

  it('(c) a full second initRouter + createApp cycle renders, and the old outlet stays dead (C-50)', async () => {
    const first = vi.fn(Page('first'))
    await boot({ '/': mod(first), '/b': mod(first) })
    const firstTarget = target
    createApp({ target })
    expect(first).toHaveBeenCalledTimes(1)
    destroy()

    const second = Page('second')
    const nav = await boot({ '/': mod(second), '/b': mod(second) })
    const app = createApp({ target })
    expect(target.textContent).toBe('second')
    await go('/b')
    await nav.idle()
    expect(target.textContent).toBe('second')
    expect(first).toHaveBeenCalledTimes(1)
    expect(firstTarget).toBe(target)
    expect(app.destroy).toBe(destroy)
  })

  it('a second initRouter + createApp works after destroy() from app.destroy', async () => {
    await boot({ '/': mod(Page('one')) })
    const app = createApp({ target })
    app.destroy()
    await boot({ '/': mod(Page('two')) })
    createApp({ target })
    expect(target.textContent).toBe('two')
  })
})

describe('page scope: onCleanup in pages and layouts (N160–N163)', () => {
  const menu = (/** @type {any} */ c) => html`<div data-layout="menu">${c}</div>`
  const layouts = { menu }

  /** @param {() => void} cleanup @param {string} [text] */
  const CleaningPage = (cleanup, text = 'a') => () => {
    onCleanup(cleanup)
    return html`<p>${text}</p>`
  }

  it('a plain page inside a layout: onCleanup runs when the next navigation leaves it, once', async () => {
    const cleanup = vi.fn()
    const nav = await boot({ '/': mod(CleaningPage(cleanup), { layout: 'menu' }), '/b': mod(Page('b'), { layout: 'menu' }) })
    createApp({ target, layouts })
    expect(target.textContent).toBe('a')
    expect(cleanup).not.toHaveBeenCalled()
    await go('/b')
    await nav.idle()
    expect(target.textContent).toBe('b')
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('a plain page inside a layout: onCleanup runs on destroy()', async () => {
    const cleanup = vi.fn()
    await boot({ '/': mod(CleaningPage(cleanup), { layout: 'menu' }) })
    createApp({ target, layouts })
    destroy()
    await nextTick()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('a guard that cancels keeps the page and runs no cleanup', async () => {
    const cleanup = vi.fn()
    guard(({ to }) => (to === '/b' ? false : undefined))
    const nav = await boot({ '/': mod(CleaningPage(cleanup), { layout: 'menu' }), '/b': mod(Page('b'), { layout: 'menu' }) })
    createApp({ target, layouts })
    await go('/b')
    await nav.idle()
    expect(target.textContent).toBe('a')
    expect(cleanup).not.toHaveBeenCalled()
  })

  it('retry() renders the page again and cleans up the old render first', async () => {
    const cleanup = vi.fn()
    let renders = 0
    const page = () => { renders++; onCleanup(cleanup); return html`<p>a</p>` }
    const nav = await boot({ '/': mod(page, { layout: 'menu' }) })
    createApp({ target, layouts })
    await retryRoute()
    await nav.idle()
    expect(renders).toBe(2)
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(target.textContent).toBe('a')
  })

  it('the layout body gets onCleanup too, per page render', async () => {
    const cleanup = vi.fn()
    const tracked = (/** @type {any} */ c) => { onCleanup(cleanup); return html`<div>${c}</div>` }
    const nav = await boot({ '/': mod(Page('a'), { layout: 'tracked' }), '/b': mod(Page('b'), { layout: 'tracked' }) })
    createApp({ target, layouts: { tracked } })
    await go('/b')
    await nav.idle()
    expect(cleanup).toHaveBeenCalledTimes(1)
    destroy()
    await nextTick()
    expect(cleanup).toHaveBeenCalledTimes(2)
  })

  it('a page that returns a component() gets its cleanup inside a layout too (N162)', async () => {
    const cleanup = vi.fn()
    const PageComponent = component(() => {
      onCleanup(cleanup)
      return html`<p>comp</p>`
    })
    const nav = await boot({ '/': mod(() => PageComponent(), { layout: 'menu' }), '/b': mod(Page('b'), { layout: 'menu' }) })
    createApp({ target, layouts })
    expect(target.querySelector('[data-layout="menu"]')?.textContent).toBe('comp')
    await go('/b')
    await nav.idle()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('a composable that registers its stop with try { onCleanup } aborts its request on leave and on destroy()', async () => {
    /** @type {AbortSignal[]} */
    const signals = []
    // The arrow-use pattern (U-5): no throw outside a component, stop() on unmount.
    const useRequest = () => {
      const controller = new AbortController()
      signals.push(controller.signal)
      try { onCleanup(() => controller.abort()) } catch {}
    }
    const page = () => { useRequest(); return html`<p>a</p>` }
    const nav = await boot({ '/': mod(page, { layout: 'menu' }), '/b': mod(Page('b'), { layout: 'menu' }) })
    createApp({ target, layouts })
    await go('/b')
    await nav.idle()
    expect(signals[0].aborted).toBe(true)
    await go('/')
    await nav.idle()
    expect(signals[1].aborted).toBe(false)
    destroy()
    await nextTick()
    expect(signals[1].aborted).toBe(true)
  })

  it('a reactive read in a page body does not render the page again (N161)', async () => {
    const state = reactive({ n: 1 })
    let renders = 0
    const page = () => { renders++; void state.n; return html`<p>${() => state.n}</p>` }
    await boot({ '/': mod(page, { layout: 'menu' }) })
    createApp({ target, layouts })
    state.n = 2
    await nextTick()
    expect(target.textContent).toBe('2')
    expect(renders).toBe(1)
  })

  it('known limit (N64): a component nested in a page template still gets no cleanup', async () => {
    // Arrow 1.0.6 recycles a template's nested components without running their
    // cleanups. If an Arrow upgrade fixes this, this test fails: update the docs
    // ("Cleanup never runs") and NOTES N163, then flip the assertion.
    const cleanup = vi.fn()
    const Child = component(() => {
      onCleanup(cleanup)
      return html`<i>child</i>`
    })
    const nav = await boot({ '/': mod(() => html`<p>${Child()}</p>`), '/b': mod(Page('b')) })
    createApp({ target })
    await go('/b')
    await nav.idle()
    expect(cleanup).not.toHaveBeenCalled()
  })
})
