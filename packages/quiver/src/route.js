import { routerState } from './state.js'
import { go, traverse } from './router.js'

/** @typedef {import('./types.js').RouteStatus} RouteStatus */
/** @typedef {import('./types.js').PageMeta} PageMeta */

/**
 * Read-only reactive accessors for the current route. Works anywhere:
 * components, guards, state modules. Each getter reads the live router state.
 * @returns {{
 *   path: () => string,
 *   params: () => Record<string, string>,
 *   status: () => RouteStatus,
 *   meta: () => PageMeta,
 * }}
 */
export function useRoute() {
  return {
    path: () => routerState.path,
    params: () => routerState.params,
    status: () => routerState.status,
    meta: () => routerState.meta,
  }
}

/**
 * Navigation helpers. Each resolves when the navigation finishes, including a
 * guard's redirect or rollback, and swallows AbortError when an unrelated
 * navigation takes over.
 * @returns {{ go: typeof go, back: () => Promise<void>, forward: () => Promise<void> }}
 */
export function useRouter() {
  return {
    go,
    back: () => traverse(-1),
    forward: () => traverse(1),
  }
}
