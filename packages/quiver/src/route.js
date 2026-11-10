import { routerState } from './state.js'
import { go } from './router.js'

/**
 * Read-only reactive accessors for the current route.
 */
export function useRoute() {
  return {
    path: () => routerState.path,
    params: () => routerState.params,
    status: () => routerState.status,
    meta: () => routerState.meta,
  }
}

export function useRouter() {
  return {
    go,
    back: () => window.navigation?.back().finished,
    forward: () => window.navigation?.forward().finished,
  }
}
