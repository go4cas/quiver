// The browser fixture for core's navigation tests (NOTES N126–N129): a bare
// Quiver app with a gated loader and guards the tests switch on and off.
// It runs unbundled from src/, behind an import map, like examples/no-build.
import { html, onCleanup } from '@arrow-js/core'
import { afterEach, beforeEach, createApp, destroy, go, initRouter, useMeta, useRoute, useRouter } from '@go4cas/quiver'

/** A promise the test resolves with window.fixture.release(name). */
const gates = /** @type {Record<string, { promise: Promise<void>, open: () => void }>} */ ({})
/** @param {string} name */
function gate(name) {
  if (!gates[name]) {
    /** @type {() => void} */
    let open = () => {}
    const promise = new Promise((resolve) => { open = () => resolve(undefined) })
    gates[name] = { promise, open }
  }
  return gates[name].promise
}

/** @param {string} text */
const Page = (text) => () => html`<h1>${text}</h1>`

const routes = {
  '/': () => ({
    default: () => {
      useMeta({ title: 'Overview', description: 'About the overview' })
      return html`<h1>Overview</h1>`
    },
  }),
  '/details': () => ({ default: Page('Details') }),
  '/slow': async () => {
    await gate('slow')
    return { default: Page('Slow') }
  },
  '/denied': () => ({ default: Page('Denied') }),
  '/admin': () => ({ default: Page('Admin') }),
  '/login': () => ({ default: Page('Login') }),
  // A page inside a layout that starts a request and aborts it in onCleanup (N160).
  '/feed': () => ({
    meta: { layout: 'shell' },
    default: () => {
      const controller = new AbortController()
      fetch('feed.json', { signal: controller.signal }).catch(() => {})
      onCleanup(() => { cleaned.push('feed'); controller.abort() })
      return html`<h1>Feed</h1>`
    },
  }),
  // Section middleware (C-71): '/vault' guards itself and every route under it.
  '/vault': () => ({ default: Page('Vault') }),
  '/vault/:id': () => ({ default: Page('Vault item') }),
  '/flaky': () => {
    if (!flags.flakyLoads) throw new Error('Flaky failed to load')
    return { default: Page('Flaky') }
  },
}

/** @type {string[]} the pages whose onCleanup ran */
const cleaned = []
/** @param {unknown} content */
const Shell = (content) => html`<div data-layout="shell">${content}</div>`

const flags = { denyOverview: false, holdLogin: false, flakyLoads: false, bounce: '', vault: /** @type {'open' | 'locked' | 'login'} */ ('open') }
// `?vault=login` on the first URL sets the section's mode before startup.
const startMode = new URLSearchParams(location.search).get('vault')
// `?bounce=<target>` on the first URL sets where /bounce redirects before startup.
flags.bounce = new URLSearchParams(location.search).get('bounce') ?? ''
if (startMode === 'locked' || startMode === 'login') flags.vault = startMode
/** @type {string[]} */
const log = []
/** @type {string[]} which middleware ran, `<name>:<to>` */
const ran = []

/** @type {import('@go4cas/quiver').MiddlewareManifest} */
const middleware = {
  global: [({ to }) => { ran.push(`global:${to}`) }],
  sections: {
    '/': [({ to }) => { ran.push(`root:${to}`) }],
    '/vault': [({ to }) => {
      ran.push(`vault:${to}`)
      if (flags.vault === 'locked') return false
      if (flags.vault === 'login') return '/login'
    }],
  },
}

/** @type {(() => Promise<void>) | null} the error view's retry, for the tests */
let retry = null

/** The startup sequence; the teardown test runs it again after destroy(). */
async function start() {
  beforeEach(async ({ to }) => {
    if (to === '/denied') return false
    if (to === '/' && flags.denyOverview) return false
    if (to === '/admin') return '/login'
    if (to === '/login' && flags.holdLogin) await gate('login')
    if (to === '/bounce') return flags.bounce || false
  })
  afterEach(({ to, status }) => { log.push(`${to}:${status}`) })

  await initRouter({ routes, middleware })
  createApp({
    target: '#app',
    layouts: { shell: Shell },
    error: ({ message, retry: again }) => {
      retry = again
      return html`<p role="alert">${message}</p>`
    },
  })
}

await start()

const route = useRoute()
const router = useRouter()
Object.assign(window, {
  fixture: {
    flags,
    log,
    ran,
    go,
    back: router.back,
    forward: router.forward,
    /** @param {string} name */
    release: (name) => { gate(name); gates[name].open() },
    status: () => route.status(),
    path: () => route.path(),
    cleaned,
    retry: () => /** @type {() => Promise<void>} */ (retry)(),
    destroy,
    start,
  },
})
