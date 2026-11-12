# State

Global state is an Arrow.js `reactive()` object created once, at module scope, and imported wherever it's needed. Quiver adds no store library. In the starter, stores live in `src/state/`.

## A store

```js
// src/state/ticketState.js
import { reactive } from '@arrow-js/core'

/** @typedef {{ id: string, title: string, done: boolean }} Ticket */

export const ticketState = reactive({
  /** @type {Ticket[]} */
  tickets: [],

  /** @param {{ title: string }} ticket */
  addTicket(ticket) {
    this.tickets.push({ ...ticket, done: false, id: crypto.randomUUID() })
  },

  /** @param {string} id */
  removeTicket(id) {
    this.tickets = this.tickets.filter((t) => t.id !== id)
  },
})
```

- Mutate through methods, so changes stay easy to find.
- Use `crypto.randomUUID()` for ids.
- `/add-state ticket` scaffolds this file.

## Reading it

Read store properties inside `() =>` slots, and the template follows every change:

```js
import { ticketState } from '../state/ticketState.js'

html`
  <p>${() => ticketState.tickets.length} open</p>
  <button @click="${() => ticketState.addTicket({ title: 'New' })}">Add</button>
`
```

Arrow tracks dependencies lazily: it knows a slot depends on `ticketState.tickets` only because it watched the slot's function read it. A bare `${ticketState.tickets.length}` is read once.

Outside templates, `watch()` reacts the same way:

```js
import { watch } from '@arrow-js/core'

watch(() => {
  document.title = `${ticketState.tickets.length} tickets`
})
```

## Persisted state

For a value that should survive reloads and follow other tabs, use [`useStorage`](/arrow-use/useStorage) from `arrow-use` in the store module, as a singleton:

```js
// src/state/prefs.js
import { useStorage } from 'arrow-use'

export const density = useStorage('density', 'comfortable')
// density.value(), density.set('compact')
```

Keep **one** `useStorage` per key for the whole app. Two instances of one key in the same tab don't see each other's writes, because the browser's `storage` event only fires in other tabs. The [theme switcher](/recipes/theme-switcher)'s `themeState` is built this way.

## Route state

The router's state is private to `@go4cas/quiver` and read-only for the app. Read it with [`useRoute()`](./routing#reading-the-route) anywhere: components, guards or other stores.

```js
import { useRoute } from '@go4cas/quiver'

const route = useRoute()
watch(() => console.log(route.path(), route.status()))
```

## Shared services: `provide` / `inject`

For values the app sets once and components read (config, the current user, an API client), use the app-wide context instead of a store:

```js
// src/app.config.js: each key is provided under its own name
export default {
  api: createApiClient(import.meta.env.VITE_API_URL),
}

// any component or page
const api = inject('api')
```

`inject(key, fallback)` returns `fallback` when the key is missing. Call it inside functions, not at module scope. `provide(key, value)` sets one from code, and the last write for a key wins. `destroy()` clears them all. See the [API reference](/api/core#provide).

## Local state

For state that belongs to one component instance, create it inside `component()` (with [`hmrState`](/recipes/hmrState) if it should survive hot reloads). See [Components](./components#local-state-and-cleanup).
