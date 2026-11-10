# hmrState

`hmrState(key, initialState)`: a `reactive()` object that survives Vite hot module reloads, so a component keeps its local state while you edit it.

## Install

Copy `hmrState.js` to `src/quiver/hmrState/` (or `/add-composable hmrState`).

## Use

```js
import { hmrState } from '../quiver/hmrState/hmrState.js'

export function Counter({ label }) {
  const state = hmrState(`counter-${label}`, { count: 0 })
  return html`<button @click="${() => state.count++}">${label}: ${() => state.count}</button>`
}
```

The key must be unique per component instance on the page; derive it from a prop. Two instances with the same key share one slot in dev mode, so their state is linked.

Without Vite (`Bun.build`, no-build import maps) `import.meta.hot` is undefined and `hmrState` is plain `reactive(initialState)`, so the same code runs everywhere; state just isn't kept across reloads.
