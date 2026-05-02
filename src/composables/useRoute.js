import { routerState } from '../state/routerState.js'

export function useRoute() {
  return {
    path: () => routerState.path,
    params: () => routerState.params,
    status: () => routerState.status,
    meta: () => routerState.meta,
  }
}
