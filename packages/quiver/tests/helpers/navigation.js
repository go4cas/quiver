// A small in-memory stand-in for the Navigation API (jsdom has none). It keeps
// a list of history entries with keys like the browser does: a push drops the
// forward entries and adds one, a replace keeps the entry's key and changes its
// URL, a traversal moves to an existing entry. It fires `navigate` events,
// commits the entry when a listener intercepts (the browser's default
// "immediate" commit, so the handler runs with the new entry current), runs
// the handler, and rejects a superseded navigation's `finished` with an
// AbortError. Navigations nobody intercepts are recorded in `documentLoads`
// (a real browser would load a new document). jsdom's location follows the
// current entry through history.replaceState().
import { vi } from 'vitest'
import { nextTick } from '@arrow-js/core'

/**
 * @typedef {{ history?: 'push' | 'replace', info?: unknown }} NavigateOptions
 * @typedef {{ key: string, url: string }} Entry
 * @typedef {'push' | 'replace' | 'reload' | 'traverse'} NavType
 */

export function installNavigation() {
  /** @type {Set<(event: any) => void>} */
  const listeners = new Set()
  /** @type {Promise<unknown>[]} */
  const pending = []
  let token = 0
  let keys = 0
  /** @type {Entry[]} */
  let entries = [{ key: `k${keys++}`, url: window.location.href }]
  let index = 0

  const sync = () => history.replaceState(null, '', entries[index].url)

  /**
   * @param {string} href
   * @param {{ info?: unknown, type: NavType, formData?: unknown, downloadRequest?: string | null, target?: number }} opts
   */
  function dispatch(href, { info, type, formData = null, downloadRequest = null, target = index }) {
    // Keep jsdom's location in step with the current entry (setLocation() may
    // have moved it before the first navigation).
    entries[index].url = window.location.href
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
    if (type === 'push') {
      entries = [...entries.slice(0, index + 1), { key: `k${keys++}`, url: destination.href }]
      index = entries.length - 1
    } else if (type === 'replace') {
      entries[index] = { key: entries[index].key, url: destination.href }
    } else if (type === 'traverse') {
      index = target
    }
    sync()
    const run = /** @type {() => Promise<void>} */ (handler)
    const finished = Promise.resolve().then(run).then(() => {
      if (mine !== token) throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    })
    finished.catch(() => {})
    pending.push(finished)
    return { committed: Promise.resolve(), finished }
  }

  /**
   * @param {number} to entry index
   * @param {{ info?: unknown }} [options]
   */
  function traverse(to, options = {}) {
    if (to < 0 || to >= entries.length || to === index) {
      return { committed: Promise.resolve(), finished: Promise.resolve() }
    }
    return dispatch(entries[to].url, { info: options.info, type: 'traverse', target: to })
  }

  const nav = {
    /** @type {string[]} */
    documentLoads: [],
    /** The current history entry; it changes when a listener intercepts. */
    get currentEntry() {
      entries[index].url = window.location.href
      return entries[index]
    },
    entries: () => entries.map((e) => ({ ...e })),
    /** The URLs of all entries and the index of the current one, for assertions. */
    stack: () => ({ urls: entries.map((e) => new URL(e.url).pathname + new URL(e.url).search + new URL(e.url).hash), index }),
    addEventListener: vi.fn((/** @type {string} */ type, /** @type {any} */ fn) => {
      if (type === 'navigate') listeners.add(fn)
    }),
    removeEventListener: vi.fn((/** @type {string} */ type, /** @type {any} */ fn) => {
      if (type === 'navigate') listeners.delete(fn)
    }),
    navigate: vi.fn((/** @type {string} */ href, /** @type {NavigateOptions} */ options = {}) =>
      dispatch(href, { info: options.info, type: options.history === 'replace' ? 'replace' : 'push' })),
    reload: vi.fn((/** @type {NavigationReloadOptions} */ options = {}) => dispatch(window.location.href, { info: options.info, type: 'reload' })),
    back: vi.fn((/** @type {{ info?: unknown }} */ options = {}) => traverse(index - 1, options)),
    forward: vi.fn((/** @type {{ info?: unknown }} */ options = {}) => traverse(index + 1, options)),
    traverseTo: vi.fn((/** @type {string} */ key, /** @type {{ info?: unknown }} */ options = {}) => {
      const to = entries.findIndex((e) => e.key === key)
      if (to === -1) {
        const finished = Promise.reject(Object.assign(new Error('no such entry'), { name: 'InvalidStateError' }))
        finished.catch(() => {})
        return { committed: finished, finished }
      }
      return traverse(to, options)
    }),
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
