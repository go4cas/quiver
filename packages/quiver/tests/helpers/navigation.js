// A small in-memory stand-in for the Navigation API (jsdom has none). It fires
// `navigate` events like the browser does, commits the URL with the History API
// when a listener intercepts, runs the handler, and rejects a superseded
// navigation's `finished` with an AbortError. Navigations nobody intercepts are
// recorded in `documentLoads` (a real browser would load a new document).
import { vi } from 'vitest'
import { nextTick } from '@arrow-js/core'

/**
 * @typedef {{ history?: 'push' | 'replace', info?: unknown }} NavigateOptions
 */

export function installNavigation() {
  /** @type {Set<(event: any) => void>} */
  const listeners = new Set()
  /** @type {Promise<unknown>[]} */
  const pending = []
  let token = 0

  /**
   * @param {string} href
   * @param {{ info?: unknown, type: 'push' | 'replace' | 'reload', formData?: unknown, downloadRequest?: string | null }} opts
   */
  function dispatch(href, { info, type, formData = null, downloadRequest = null }) {
    const destination = new URL(href, window.location.href)
    const current = new URL(window.location.href)
    const sameDocument = destination.origin === current.origin
    const hashChange = sameDocument && type !== 'reload' &&
      destination.pathname === current.pathname && destination.search === current.search &&
      destination.hash !== current.hash
    /** @type {(() => Promise<void>) | null} */
    let handler = null
    const event = {
      canIntercept: sameDocument,
      hashChange,
      downloadRequest,
      formData,
      info,
      navigationType: type,
      destination: { url: destination.href },
      intercept(/** @type {{ handler?: () => Promise<void> }} */ options) {
        handler = options?.handler ?? (async () => {})
      },
    }
    for (const listener of [...listeners]) listener(event)

    if (!handler) {
      nav.documentLoads.push(destination.href)
      return { committed: Promise.resolve(), finished: Promise.resolve() }
    }

    const mine = ++token
    if (type === 'push') history.pushState(null, '', destination.href)
    else if (type === 'replace') history.replaceState(null, '', destination.href)
    const run = /** @type {() => Promise<void>} */ (handler)
    const finished = Promise.resolve().then(run).then(() => {
      if (mine !== token) throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    })
    finished.catch(() => {})
    pending.push(finished)
    return { committed: Promise.resolve(), finished }
  }

  const nav = {
    /** @type {string[]} */
    documentLoads: [],
    /** The current history entry; the URL isn't committed until a listener intercepts. */
    get currentEntry() {
      return { url: window.location.href }
    },
    addEventListener: vi.fn((/** @type {string} */ type, /** @type {any} */ fn) => {
      if (type === 'navigate') listeners.add(fn)
    }),
    removeEventListener: vi.fn((/** @type {string} */ type, /** @type {any} */ fn) => {
      if (type === 'navigate') listeners.delete(fn)
    }),
    navigate: vi.fn((/** @type {string} */ href, /** @type {NavigateOptions} */ options = {}) =>
      dispatch(href, { info: options.info, type: options.history === 'replace' ? 'replace' : 'push' })),
    reload: vi.fn(() => dispatch(window.location.href, { type: 'reload' })),
    back: vi.fn(() => ({ committed: Promise.resolve(), finished: Promise.resolve() })),
    forward: vi.fn(() => ({ committed: Promise.resolve(), finished: Promise.resolve() })),
    /** Fire a raw navigate event, e.g. a form POST, without the push. */
    dispatch,
    listenerCount: () => listeners.size,
    /** Wait until every started navigation has finished and Arrow has rendered. */
    async idle() {
      for (let i = 0; i < 50; i++) {
        const batch = pending.splice(0)
        if (!batch.length) break
        await Promise.allSettled(batch)
      }
      await nextTick()
      await nextTick()
    },
  }

  vi.stubGlobal('navigation', nav)
  return nav
}

/** @param {string} path */
export function setLocation(path) {
  history.replaceState(null, '', path)
}
