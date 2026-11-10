# hmrState

`hmrState(key, initialState)`: a `reactive()` object that survives Vite hot module reloads, so a component keeps its local state while you edit it.

| | |
|---|---|
| Command | `/add-composable hmrState` (aliases: `hmr`, `hmr-state`) |
| Copies | `hmrState.js` → `src/quiver/hmrState/` |
| CSS | none |
| Needs | nothing |
| Tokens | none |

## Use

```js
import { component, html } from '@arrow-js/core'
import { hmrState } from '../quiver/hmrState/hmrState.js'

export const Counter = component((props) => {
  const state = hmrState(`counter-${props.label}`, { count: 0 })
  return html`<button @click="${() => state.count++}">${props.label}: ${() => state.count}</button>`
})
```

```ts
hmrState<T extends object>(key: string, initialState: T): T
```

## Behaviour

- **The key must be unique per instance on the page.** Derive it from a prop or an id. Two instances with the same key share one slot in dev, so their state is linked.
- In Vite dev, the state lives in `import.meta.hot.data` and is reused after a hot update. A full reload still starts fresh.
- Without Vite (`Bun.build`, an import-map app, a production build), `import.meta.hot` is undefined, and `hmrState` is plain `reactive(initialState)`. The same code runs everywhere.
