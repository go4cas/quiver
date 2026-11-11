// R05, N135: page names with spaces and Unicode route end to end. The fake
// Navigation API builds destinations with `new URL()`, so the router sees the
// percent-encoded pathname a browser reports.
import { describe, it, expect, afterEach } from 'vitest'
import { initRouter, go } from '../src/router.js'
import { destroy } from '../src/app.js'
import { useRoute } from '../src/route.js'
import { installNavigation, setLocation } from './helpers/navigation.js'

/** @param {string} name */
const page = (name) => async () => ({ default: () => name })

/** Keys as the scanner writes them (literal, NFC), plus a hand-written encoded one. */
const routes = {
  '/': page('home'),
  '/café': page('café'),
  '/release notes': page('release notes'),
  '/menus/:dish': page('dish'),
  '/menus/crème brûlée': page('static dish'),
  '/caf%C3%A9/hours': page('hours'),
}

afterEach(() => {
  destroy()
  setLocation('/')
})

/**
 * @param {string} base
 * @param {string} at
 */
async function start(base, at) {
  const nav = installNavigation()
  setLocation(at)
  await initRouter({ routes, base })
  return nav
}

/** @param {string} pattern @returns {string} the path as the browser reports it */
const encoded = (pattern) => new URL(pattern, 'https://x.test').pathname

describe.each(['/', '/sub/app/'])('base %s', (base) => {
  const at = (/** @type {string} */ path) => base.slice(0, -1) + encoded(path)

  it('a deep link to a page with a space or an accent renders it', async () => {
    for (const path of ['/café', '/release notes', '/café/hours']) {
      await start(base, at(path))
      expect(useRoute().status()).toBe('ready')
      destroy()
    }
  })

  it('in-app navigation reaches them, whichever way the path is spelled', async () => {
    const nav = await start(base, at('/'))
    for (const path of ['/release notes', '/release%20notes', '/caf%C3%A9', '/café', '/café/hours']) {
      await go(path)
      await nav.idle()
      expect(useRoute().status()).toBe('ready')
      expect(nav.documentLoads).toEqual([])
    }
  })

  it('a static Unicode segment wins over a parameter; the parameter still decodes', async () => {
    const nav = await start(base, at('/menus/crème brûlée'))
    expect(useRoute().params()).toEqual({})
    await go('/menus/crème caramel')
    await nav.idle()
    expect(useRoute().params()).toEqual({ dish: 'crème caramel' })
  })

  it('a malformed escape is not found, not an error', async () => {
    await start(base, base + 'caf%E9')
    expect(useRoute().status()).toBe('not-found')
  })
})
