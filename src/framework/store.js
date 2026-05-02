import { reactive } from '@arrow-js/core'

// createStore wraps reactive so store modules declare their shape via a setup fn.
// Usage:
//   export const myStore = createStore(() => {
//     const state = reactive({ count: 0 })
//     const increment = () => state.count++
//     return { state, increment }
//   })
export function createStore(setup) {
  return setup(reactive)
}
