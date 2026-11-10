import { reactive } from '@arrow-js/core'

/** @typedef {import('./types.js').Page} Page */
/** @typedef {import('./types.js').PageMeta} PageMeta */
/** @typedef {import('./types.js').RouteStatus} RouteStatus */

/**
 * Private router state (D26): apps read it only through useRoute().
 * @typedef {Object} RouterState
 * @property {RouteStatus} status
 * @property {string} path               base-relative, '' before initRouter()
 * @property {Record<string, string>} params
 * @property {PageMeta} meta
 * @property {Page | null} page
 * @property {string} layout             the page's meta.layout, '' when it has none
 * @property {(() => unknown) | null} error  returns the original thrown value while status is 'error'.
 *   A thunk, because reactive() would wrap a stored Error in a proxy and the
 *   error view must get the original value (C-46).
 */

/** @returns {RouterState} */
function freshState() {
  return /** @type {RouterState} */ (reactive({
    status: 'idle',
    path: '',
    params: {},
    meta: {},
    page: null,
    layout: '',
    error: null,
  }))
}

// Reads no browser globals at import (R4). destroy() replaces the object rather
// than resetting it (C-50), so watchers from an old mount hold an abandoned
// object. Importers see the replacement through the live binding.
export let routerState = freshState()

export function resetRouterState() {
  routerState = freshState()
}
