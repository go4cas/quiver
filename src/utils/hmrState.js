import { reactive } from '@arrow-js/core'

// hmrState(key, initialState) — preserves a reactive() object across Vite HMR reloads.
//
// The key must be unique per component instance on the page. Two components with the
// same key will share the same HMR slot and their state will be linked in dev mode.
// Use a prop value (e.g. `counter-${props.label}`) and ensure labels are unique per page.
/**
 * @template {Record<string, any>} T
 * @param {string} key
 * @param {T} initialState
 * @returns {T}
 */
export function hmrState(key, initialState) {
  let state = import.meta.hot?.data[key]

  if (!state) {
    state = reactive(initialState)
  }

  if (import.meta.hot) {
    import.meta.hot.data[key] = state
  }

  return state
}
