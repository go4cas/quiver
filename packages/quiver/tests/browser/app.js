// The browser fixture for core's navigation tests (NOTES N126–N129): a bare
// Quiver app with a gated loader and guards the tests switch on and off.
// It runs unbundled from src/, behind an import map, like examples/no-build.
import { html } from '@arrow-js/core'
import { afterEach, beforeEach, createApp, go, initRouter, useMeta, useRoute, useRouter } from '@go4cas/quiver'

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
}

const flags = { denyOverview: false, holdLogin: false }
/** @type {string[]} */
const log = []

beforeEach(async ({ to }) => {
  if (to === '/denied') return false
  if (to === '/' && flags.denyOverview) return false
  if (to === '/admin') return '/login'
  if (to === '/login' && flags.holdLogin) await gate('login')
})
afterEach(({ to, status }) => { log.push(`${to}:${status}`) })

await initRouter({ routes })
createApp({ target: '#app' })

const route = useRoute()
const router = useRouter()
Object.assign(window, {
  fixture: {
    flags,
    log,
    go,
    back: router.back,
    forward: router.forward,
    /** @param {string} name */
    release: (name) => { gate(name); gates[name].open() },
    status: () => route.status(),
    path: () => route.path(),
  },
})
