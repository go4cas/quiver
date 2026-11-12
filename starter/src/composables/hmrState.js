import { reactive } from '@arrow-js/core'

// hmrState(key, initialState): a reactive() object that survives Vite hot reloads.
//
// The key must be unique per component instance on the page. Two components with the
// same key share one HMR slot, so their state is linked in dev mode. Derive it from a
// prop (e.g. `counter-${props.label}`) and keep labels unique per page.
//
// Without Vite (Bun.build, no-build) import.meta.hot is undefined, so this is plain
// reactive(initialState).
/**
 * @template {Record<string, any>} T
 * @param {string} key
 * @param {T} initialState
 * @returns {T}
 */
export function hmrState(key, initialState) {
  // Cast: import.meta.hot is Vite's, and the recipe doesn't need vite/client types.
  const hot = /** @type {{ hot?: { data: Record<string, any> } }} */ (import.meta).hot
  return hot ? (hot.data[key] ??= reactive(initialState)) : reactive(initialState)
}
