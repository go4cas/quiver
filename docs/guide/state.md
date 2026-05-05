# State

Global state is managed with `createStore()`, a thin wrapper around Arrow.js's `reactive()`. State modules live in `src/state/` and are imported directly wherever they are needed.

---

## Creating a store

```js
// src/state/ticketState.js
import { createStore } from '../framework/index.js'

export const ticketState = createStore((reactive) =>
  reactive({
    tickets: [],
    addTicket(ticket) {
      this.tickets.push({ id: crypto.randomUUID(), ...ticket })
    },
    removeTicket(id) {
      this.tickets = this.tickets.filter((t) => t.id !== id)
    },
  })
)
```

Use `crypto.randomUUID()` for IDs — it produces collision-safe values unlike `Date.now()`.

---

## Using a store in a page or component

Import the store and read its properties inside reactive `${}` slots:

```js
import { ticketState } from '../state/ticketState.js'

function TicketsPage() {
  return html`
    <p>Total tickets: ${() => ticketState.tickets.length}</p>
    <button @click="${() => ticketState.addTicket({ title: 'New' })}">Add</button>
  `
}
```

The `() =>` wrapper is mandatory. Arrow.js tracks reactive dependencies **lazily** — it only knows a `${}` slot depends on a piece of state if it watches the slot being evaluated. A bare value like `${ticketState.tickets.length}` is read once at render time and never updates. Wrapping it as `${() => ticketState.tickets.length}` tells Arrow.js to re-evaluate this slot whenever the accessed state changes.

---

## Built-in state modules

### `userState` — `src/state/userState.js`

Seed data for the Users demo. Demonstrates `createStore()` with methods.

| Property / Method | Description |
|---|---|
| `userState.users` | Reactive array of user objects |
| `userState.addUser(user)` | Appends a user; caller-supplied fields are used as-is, except `id` which is always auto-generated via `crypto.randomUUID()` |
| `userState.removeUser(id)` | Removes a user by ID |

### `uiState` — `src/state/uiState.js`

UI state for the theming system. Both fields are persisted to `localStorage` and restored on the next visit.

| Property | Values | Description |
|---|---|---|
| `uiState.theme` | `'default'` · `'mono'` · `'glass'` · `'retro'` · `'brutalist'` | Active visual theme; synced to `document.documentElement.dataset.theme` |
| `uiState.mode`  | `'light'` · `'dark'` | Active brightness mode; initialised from `prefers-color-scheme` and synced to `document.documentElement.dataset.mode` |

Mutate either field directly to change the active theme or mode:

```js
import { uiState } from '../state/uiState.js'

uiState.theme = 'glass'   // switch to Liquid Glass theme
uiState.mode  = 'dark'    // switch to dark mode
```

The `watch()` in `uiState.js` handles all DOM sync and localStorage persistence automatically — no manual DOM manipulation needed.

### `routerState` — `src/state/routerState.js`

Managed by the router — treat as read-only in pages and components.

| Property | Description |
|---|---|
| `routerState.path` | Current URL path |
| `routerState.params` | Dynamic route params object |
| `routerState.status` | `'idle'` · `'loading'` · `'ready'` · `'not-found'` · `'error'` |
| `routerState.error` | Error message string when `status === 'error'`; empty string otherwise |
| `routerState.meta` | The `meta` object exported by the current page |
| `routerState.layout` | Active layout name |
| `routerState.page` | Current page function |
