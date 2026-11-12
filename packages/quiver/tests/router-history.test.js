// Cancellation, history entries, settlement of go() and page metadata across
// navigations (NOTES N126–N129). The fake Navigation API keeps real history
// entries, so Back/Forward and rollback are checked against the entry list.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { html, nextTick } from '@arrow-js/core'
import { initRouter, go, retry, beforeEach as guard, afterEach as after, onError } from '../src/router.js'
import { createApp, destroy } from '../src/app.js'
import { useRoute, useRouter } from '../src/route.js'
import { useMeta } from '../src/meta.js'
import { installNavigation, setLocation } from './helpers/navigation.js'

/** @param {string} text */
const Page = (text) => () => html`<p>${text}</p>`
/** @param {() => any} page @param {Record<string, unknown>} [meta] */
const mod = (page, meta) => () => ({ default: page, meta })

/** A loader that waits until release() is called. */
function gated(/** @type {string} */ text) {
  /** @type {() => void} */
  let release = () => {}
  const ready = new Promise((resolve) => { release = () => resolve(undefined) })
  const loader = async () => { await ready; return { default: Page(text) } }
  return { loader, release }
}

/** @type {HTMLElement} */
let target

/** Let pending handlers and guards run without waiting for gated work. */
async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve()
  await nextTick()
}

/**
 * @param {{ idle: () => Promise<void> }} nav
 * @param {{ finished: Promise<unknown> }} result
 */
async function settleAll(nav, result) {
  await result.finished.catch(() => {})
  await nav.idle()
}

afterEach(() => {
  destroy()
  target?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setLocation('/')
  document.title = ''
  document.querySelector('meta[name="description"]')?.remove()
})

/**
 * @param {Record<string, any>} routes
 * @param {{ at?: string, base?: string, precommit?: boolean }} [options]
 */
async function boot(routes, { at = '/', base, precommit = false } = {}) {
  const nav = installNavigation({ precommit })
  setLocation(at)
  await initRouter({ routes, base })
  target = document.createElement('div')
  document.body.append(target)
  createApp({ target })
  await nextTick()
  return nav
}

describe('cancel restores the committed route (N126)', () => {
  it('a cancel while another route is still loading puts back the rendered page and its URL', async () => {
    const slow = gated('details')
    const nav = await boot({ '/': mod(Page('overview')), '/details': slow.loader, '/denied': mod(Page('denied')) })
    guard(({ to }) => (to === '/denied' ? false : undefined))

    nav.navigate('/details')
    await flush()
    expect(useRoute().status()).toBe('loading')
    nav.navigate('/denied')
    await flush()
    slow.release()
    await nav.idle()

    expect(useRoute().path()).toBe('/')
    expect(useRoute().status()).toBe('ready')
    expect(target.textContent).toBe('overview')
    expect(window.location.pathname).toBe('/')
  })

  it('later guards see the rendered route as from, not the one still loading', async () => {
    const slow = gated('details')
    const nav = await boot({ '/': mod(Page('overview')), '/details': slow.loader, '/other': mod(Page('other')) })
    const seen = vi.fn()
    guard(seen)
    nav.navigate('/details')
    await flush()
    nav.navigate('/other')
    await flush()
    expect(seen).toHaveBeenLastCalledWith({ from: '/', to: '/other' })
    slow.release()
    await nav.idle()
  })

  it('a superseded navigation calls no further guards and fires no hooks', async () => {
    const nav = await boot({ '/': mod(Page('home')), '/a': mod(Page('a')), '/b': mod(Page('b')) })
    /** @type {() => void} */
    let release = () => {}
    const first = vi.fn(({ to }) => (to === '/a' ? new Promise((r) => { release = () => r(undefined) }) : undefined))
    const second = vi.fn()
    const hook = vi.fn()
    guard(first)
    guard(second)
    after(hook)
    nav.navigate('/a')
    await flush()
    nav.navigate('/b')
    await flush()
    release()
    await nav.idle()
    expect(second).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledWith({ from: '/', to: '/b' })
    expect(hook).toHaveBeenCalledTimes(1)
    expect(hook).toHaveBeenCalledWith({ from: '/', to: '/b', status: 'ready' })
  })

  it('destroy() during a pending navigation leaves nothing behind', async () => {
    const slow = gated('details')
    const nav = await boot({ '/': mod(Page('overview')), '/details': slow.loader })
    const hook = vi.fn()
    after(hook)
    nav.navigate('/details')
    await flush()
    destroy()
    slow.release()
    await nav.idle()
    expect(hook).not.toHaveBeenCalled()
    expect(useRoute().status()).toBe('idle')
    expect(target.textContent).toBe('')
  })

  it('a cancel during startup goes to / like the initial load (C-16)', async () => {
    const nav = installNavigation()
    setLocation('/details')
    const slow = gated('details')
    guard(({ from, to }) => (from === null && to === '/denied' ? false : undefined))
    const starting = initRouter({ routes: { '/': mod(Page('home')), '/details': slow.loader, '/denied': mod(Page('d')) } })
    await nextTick()
    nav.navigate('/denied')
    await nav.idle()
    slow.release()
    await starting
    await nav.idle()
    expect(useRoute().path()).toBe('/')
    expect(useRoute().status()).toBe('ready')
  })
})

describe('cancel keeps history entries intact (N126)', () => {
  it('a cancelled push adds no entry: Back goes to the page before, Forward returns', async () => {
    const nav = await boot({ '/': mod(Page('overview')), '/details': mod(Page('details')), '/denied': mod(Page('d')) })
    guard(({ to }) => (to === '/denied' ? false : undefined))
    await go('/details')
    await go('/denied')
    expect(window.location.pathname).toBe('/details')
    expect(target.textContent).toBe('details')

    await useRouter().back()
    expect(window.location.pathname).toBe('/')
    expect(target.textContent).toBe('overview')
    await useRouter().forward()
    expect(window.location.pathname).toBe('/details')
    expect(nav.stack().urls.slice(0, 2)).toEqual(['/', '/details'])
  })

  it('a cancelled traversal goes back to the entry it left and keeps the target entry, query and hash', async () => {
    const nav = await boot({ '/': mod(Page('overview')), '/details': mod(Page('details')) }, { at: '/?tab=2#top' })
    await go('/details')
    guard(({ to }) => (to === '/' ? false : undefined))
    await useRouter().back()
    expect(window.location.pathname).toBe('/details')
    expect(target.textContent).toBe('details')
    expect(nav.stack()).toEqual({ urls: ['/?tab=2#top', '/details'], index: 1 })
  })

  it('a cancelled replace puts the previous URL back in the same entry', async () => {
    const nav = await boot({ '/': mod(Page('overview')), '/denied': mod(Page('d')) }, { at: '/?q=1' })
    guard(({ to }) => (to === '/denied' ? false : undefined))
    nav.navigate('/denied', { history: 'replace' })
    await nav.idle()
    expect(nav.stack()).toEqual({ urls: ['/?q=1'], index: 0 })
  })
})

describe('guards before commit, where the browser has precommit handlers (N201)', () => {
  const routes = () => ({
    '/': mod(Page('overview')), '/details': mod(Page('details')), '/settings': mod(Page('settings')),
    '/denied': mod(Page('d')), '/admin': mod(Page('admin')), '/login': mod(Page('login')),
  })

  it('a cancelled push from the middle of history keeps the Forward entries and the position', async () => {
    const nav = await boot(routes(), { precommit: true })
    guard(({ to }) => (to === '/denied' ? false : undefined))
    await go('/details')
    await go('/settings')
    await useRouter().back()
    await go('/denied')
    expect(nav.stack()).toEqual({ urls: ['/', '/details', '/settings'], index: 1 })
    expect(target.textContent).toBe('details')
    await useRouter().forward()
    expect(target.textContent).toBe('settings')
  })

  it('a cancelled replace changes nothing', async () => {
    const nav = await boot(routes(), { at: '/?q=1', precommit: true })
    guard(({ to }) => (to === '/denied' ? false : undefined))
    await settleAll(nav, nav.navigate('/denied', { history: 'replace' }))
    expect(nav.stack()).toEqual({ urls: ['/?q=1'], index: 0 })
    // The cancel aborts it with a URL-only replace of the settled entry.
    expect(nav.navigate).toHaveBeenLastCalledWith(expect.stringMatching(/\/\?q=1$/), expect.objectContaining({ history: 'replace' }))
    expect(useRoute().path()).toBe('/')
  })

  it('a redirect chain commits once, at its target, as one entry', async () => {
    const nav = await boot(routes(), { precommit: true })
    guard(({ to }) => (to === '/admin' ? '/details' : undefined))
    guard(({ to }) => (to === '/details' ? '/login' : undefined))
    /** @type {string[]} */
    const seen = []
    after(({ from, to, status }) => { seen.push(`${from}->${to}:${status}`) })
    await go('/admin')
    expect(nav.stack()).toEqual({ urls: ['/', '/login'], index: 1 })
    expect(target.textContent).toBe('login')
    expect(seen).toEqual(['/->/login:ready'])
    expect(nav.navigate).toHaveBeenCalledTimes(1)
  })

  it('a guard error commits the URL and shows the error view', async () => {
    const nav = await boot(routes(), { precommit: true })
    const errors = vi.fn()
    onError(errors)
    guard(({ to }) => { if (to === '/denied') throw new Error('boom') })
    await go('/denied')
    expect(nav.stack()).toEqual({ urls: ['/', '/denied'], index: 1 })
    expect(useRoute().status()).toBe('error')
    expect(errors).toHaveBeenCalledWith(expect.objectContaining({ phase: 'guard', to: '/denied' }))
  })

  it('too many redirects is a guard error, not a loop', async () => {
    await boot(routes(), { precommit: true })
    guard(({ to }) => (to === '/admin' ? '/login' : '/admin'))
    await go('/admin')
    expect(useRoute().status()).toBe('error')
  })

  it('a cancel while an earlier navigation is loading puts back the settled route and entry', async () => {
    const slow = gated('slow')
    const nav = await boot({ ...routes(), '/slow': slow.loader }, { precommit: true })
    guard(({ to }) => (to === '/denied' ? false : undefined))
    const pending = go('/slow')
    await flush()
    expect(useRoute().status()).toBe('loading')
    await go('/denied')
    slow.release()
    await pending
    await nav.idle()
    expect(useRoute().path()).toBe('/')
    expect(target.textContent).toBe('overview')
    expect(nav.stack()).toEqual({ urls: ['/', '/slow'], index: 0 })
  })

  it('a newer navigation during the guards wins, and the older one never commits', async () => {
    const nav = await boot(routes(), { precommit: true })
    /** @type {() => void} */
    let open = () => {}
    const held = new Promise((resolve) => { open = () => resolve(undefined) })
    guard(async ({ to }) => { if (to === '/details') await held })
    const first = go('/details')
    await flush()
    await go('/settings')
    open()
    await first
    await nav.idle()
    expect(nav.stack()).toEqual({ urls: ['/', '/settings'], index: 1 })
    expect(target.textContent).toBe('settings')
  })
})

describe('go() settles with its redirects (N127)', () => {
  it('await go() resolves after the redirect target and its guards and hooks finish', async () => {
    const nav = await boot({ '/': mod(Page('home')), '/admin': mod(Page('admin')), '/login': mod(Page('login')) })
    /** @type {() => void} */
    let release = () => {}
    guard(({ to }) => {
      if (to === '/admin') return '/login'
      if (to === '/login') return new Promise((r) => { release = () => r(undefined) })
    })
    const hook = vi.fn()
    after(hook)
    let done = false
    const pending = go('/admin').then(() => { done = true })
    await flush()
    expect(useRoute().path()).not.toBe('/login')
    expect(done).toBe(false)
    release()
    await pending
    expect(useRoute().path()).toBe('/login')
    expect(hook).toHaveBeenCalledWith({ from: '/', to: '/login', status: 'ready' })
  })

  it('await go() resolves after a cancel has put the URL back', async () => {
    await boot({ '/': mod(Page('home')), '/denied': mod(Page('d')) }, { at: '/?x=1' })
    guard(({ to }) => (to === '/denied' ? false : undefined))
    await go('/denied')
    expect(window.location.pathname + window.location.search).toBe('/?x=1')
  })

  it('an unrelated navigation that supersedes go() ends it without waiting for the newer one', async () => {
    const nav = await boot({ '/': mod(Page('home')), '/a': mod(Page('a')), '/b': mod(Page('b')) })
    /** @type {() => void} */
    let release = () => {}
    guard(({ to }) => (to === '/b' ? new Promise((r) => { release = () => r(undefined) }) : undefined))
    const slowA = vi.fn()
    const pending = go('/a').then(slowA)
    nav.navigate('/b')
    await pending
    expect(slowA).toHaveBeenCalled()
    release()
    await nav.idle()
    expect(useRoute().path()).toBe('/b')
  })

  it('retry() waits for a redirect too', async () => {
    await boot({ '/': mod(Page('home')), '/users': mod(Page('users')), '/login': mod(Page('login')) }, { at: '/users' })
    guard(({ from, to }) => (from !== null && to === '/users' ? '/login' : undefined))
    await retry()
    expect(useRoute().path()).toBe('/login')
  })
})

describe('guard redirects stay inside the app (N129)', () => {
  it.each([
    ['https://evil.example/', 'absolute URL'],
    ['//evil.example/x', 'protocol-relative URL'],
    ['javascript:alert(1)', 'script URL'],
    ['../outside', 'path above the base'],
  ])('a redirect to %s is a guard error (%s)', async (to) => {
    const nav = await boot({ '/': mod(Page('home')), '/admin': mod(Page('admin')) }, { at: '/app/', base: '/app/' })
    const errors = vi.fn()
    onError(errors)
    guard(({ to: dest }) => (dest === '/admin' ? to : undefined))
    await go('/admin')
    expect(nav.documentLoads).toEqual([])
    expect(useRoute().status()).toBe('error')
    expect(errors).toHaveBeenCalledWith(expect.objectContaining({ phase: 'guard', to: '/admin' }))
    expect(String(errors.mock.calls[0][0].error.message)).toContain('base-relative')
  })

  it('on the initial load, a redirect out of the app is a guard error, not a throw', async () => {
    installNavigation()
    setLocation('/admin')
    guard(({ to }) => (to === '/admin' ? 'https://evil.example/' : undefined))
    await expect(initRouter({ routes: { '/': mod(Page('home')), '/admin': mod(Page('admin')) } })).resolves.toBeUndefined()
    expect(useRoute().status()).toBe('error')
    expect(window.location.pathname).toBe('/admin')
  })

  it('a valid redirect keeps the base, query and hash', async () => {
    await boot({ '/': mod(Page('home')), '/admin': mod(Page('admin')), '/login': mod(Page('login')) }, { at: '/app/', base: '/app/' })
    guard(({ to }) => (to === '/admin' ? '/login?next=admin#f' : undefined))
    await go('/admin')
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/app/login?next=admin#f')
  })

  it.each([
    ['/\\evil.example/x', 'backslash host'],
    ['\t//evil.example/x', 'tab before //'],
    ['/\t/evil.example/x', 'tab inside //'],
    ['\\\\evil.example', 'double backslash'],
  ])('S32-02: at the root base, %j is checked as the browser parses it (%s)', async (to) => {
    const nav = await boot({ '/': mod(Page('home')), '/admin': mod(Page('admin')) })
    const errors = vi.fn()
    onError(errors)
    guard(({ to: dest }) => (dest === '/admin' ? to : undefined))
    await go('/admin')
    expect(nav.documentLoads).toEqual([])
    expect(useRoute().status()).toBe('error')
    expect(String(errors.mock.calls[0][0].error.message)).toContain('base-relative')
  })

  it('S32-02: the URL navigated to is the parsed one, and its path is what the next guards see', async () => {
    const nav = await boot({ '/': mod(Page('home')), '/admin': mod(Page('admin')), '/release notes': mod(Page('notes')) })
    /** @type {string[]} */
    const seen = []
    guard(({ to }) => { seen.push(to); return to === '/admin' ? '/release notes?x=1' : undefined })
    await go('/admin')
    expect(seen).toEqual(['/admin', '/release%20notes'])
    expect(nav.navigate).toHaveBeenLastCalledWith(`${window.location.origin}/release%20notes?x=1`, expect.anything())
    expect(target.textContent).toBe('notes')
  })

  it('S32-02: on the initial load, a redirect is parsed once and rewrites the URL in place', async () => {
    installNavigation()
    setLocation('/admin')
    guard(({ to }) => (to === '/admin' ? '/\\evil.example/' : undefined))
    await initRouter({ routes: { '/': mod(Page('home')), '/admin': mod(Page('admin')) } })
    expect(useRoute().status()).toBe('error')
    expect(window.location.pathname).toBe('/admin')
  })

  it('go() still takes an external URL', async () => {
    const nav = await boot({ '/': mod(Page('home')) })
    await go('https://example.com/')
    expect(nav.documentLoads).toEqual(['https://example.com/'])
  })
})

describe('page metadata follows the route (N128)', () => {
  /** @param {string} title @param {string} description */
  const MetaPage = (title, description) => () => {
    useMeta({ title, description })
    return html`<p>${title}</p>`
  }

  it('a page without metadata gets the host title back and no stale description', async () => {
    document.title = 'Host'
    await boot({ '/': mod(MetaPage('Home', 'About home')), '/plain': mod(Page('plain')) })
    expect(document.title).toBe('Home')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('About home')
    await go('/plain')
    expect(document.title).toBe('Host')
    expect(document.querySelector('meta[name="description"]')).toBeNull()
  })

  it('a host description is put back, not removed', async () => {
    const tag = document.createElement('meta')
    tag.setAttribute('name', 'description')
    tag.setAttribute('content', 'Host description')
    document.head.append(tag)
    await boot({ '/': mod(MetaPage('Home', 'About home')), '/plain': mod(Page('plain')) })
    await go('/plain')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Host description')
  })

  it('a static meta.title applies, and not-found and error views get the defaults', async () => {
    document.title = 'Host'
    const nav = installNavigation()
    setLocation('/')
    await initRouter({
      routes: {
        '/': mod(MetaPage('Home', 'x')),
        '/titled': mod(Page('t'), { title: 'Titled' }),
        '/broken': () => Promise.reject(new Error('nope')),
      },
    })
    target = document.createElement('div')
    createApp({ target })
    await nextTick()
    await go('/titled')
    expect(document.title).toBe('Titled')
    await go('/')
    await go('/missing')
    expect(document.title).toBe('Host')
    await go('/')
    await go('/broken')
    expect(document.title).toBe('Host')
    expect(document.querySelector('meta[name="description"]')).toBeNull()
    expect(nav.documentLoads).toEqual([])
  })

  it('a cancel puts back the committed page\'s title', async () => {
    document.title = 'Host'
    const slow = gated('details')
    const nav = await boot({ '/': mod(MetaPage('Home', 'h')), '/details': slow.loader, '/denied': mod(Page('d')) })
    guard(({ to }) => (to === '/denied' ? false : undefined))
    nav.navigate('/details')
    await flush()
    nav.navigate('/denied')
    await flush()
    expect(document.title).toBe('Home')
    slow.release()
  })
})
