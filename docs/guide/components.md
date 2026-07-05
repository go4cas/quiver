# Components

A component is a reusable piece of UI defined with `component()` from Arrow.js. Components live in `src/components/` and are imported wherever they are needed.

---

## What is a component?

`component()` wraps your factory function and gives each call site its own stable DOM node. Arrow.js can reuse that node across re-renders and run lifecycle hooks when it unmounts.

A plain function that returns an `html` template literal also works for purely static markup, but it re-runs and patches in place on every render — no lifecycle, no stable identity. As soon as you need local state or cleanup, use `component()`.

```
plain function          component()
────────────────        ────────────────────────────
returns template        returns a factory
patches in place        stable DOM node per call site
no lifecycle            onCleanup() runs on unmount
no local state          can hold reactive state
```

---

## Anatomy of a component

`src/components/UserCard.js` is a stateless component that reads props, calls global state, and navigates — the full pattern in one file:

```js
// src/components/UserCard.js
import { component, html } from '@arrow-js/core'
import { go } from '../framework/router.js'
import { userState } from '../state/userState.js'

const STATUS_CLASSES = {
  online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  away:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
}
const statusClass = (s) => STATUS_CLASSES[s] ?? 'bg-surface-inset text-fg-soft'

export const UserCard = component((user) => html`
  <article class="rounded-panel border border-line bg-surface-raised p-5 shadow-panel">
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <img src="${user.avatar}" alt="" class="h-10 w-10 rounded-full object-cover" />
        <div>
          <h3 class="font-semibold text-fg">${() => user.name}</h3>
          <p class="text-sm text-fg-soft">${() => user.role}</p>
        </div>
      </div>
      <span class="${() => `rounded-full px-2 py-1 text-xs font-semibold ${statusClass(user.status)}`}">
        ${() => user.status}
      </span>
    </div>

    <div class="mt-3 flex gap-2">
      <button @click="${() => go(`/users/${user.id}`)}">View profile</button>
      <button @click="${() => userState.removeUser(user.id)}">Remove</button>
    </div>
  </article>
`)
```

**`component((props) => ...)`** — the factory receives props as its argument. Props are plain values — no reactive wrapper needed to read them. Call `component()` once at module scope and export the result; calling it returns an instance.

**`${() => user.name}`** — any slot that references a value that might change must be wrapped in `() =>`. Arrow.js tracks dependencies lazily by watching the slot be evaluated. A bare `${user.name}` is read once at render time and never updates.

**Derived values in slots** — `${() => statusClass(user.status)}` computes inline inside the reactive wrapper. The derivation re-runs whenever `user.status` changes.

**`@click="${() => userState.removeUser(user.id)}"`** — event handlers are arrow functions assigned to the `@eventName` attribute. Components can read from and write to any global state module directly; there is no prop-drilling or event-emission system.

**`go('/users/' + user.id)`** — imperative navigation via the router helper. Components don't need `useRouter()` for simple navigation; the `go` function imported from the framework is sufficient.

---

## Local reactive state

`src/components/Counter.js` holds state that is private to each instance, runs a side-effect watcher, and cleans up when it unmounts:

```js
// src/components/Counter.js
import { component, html, onCleanup, watch } from '@arrow-js/core'
import { hmrState } from '../utils/hmrState.js'

export const Counter = component((props) => {
  const state = hmrState(`counter-${props.label}`, { count: 0 })

  const [, stopWatch] = watch(() => {
    if (state.count > 0 && state.count % 10 === 0) {
      console.log(`[Counter] "${props.label}" milestone: ${state.count}`)
    }
  })

  onCleanup(stopWatch)

  return html`
    <article class="rounded-panel border border-line bg-surface-raised p-5 shadow-panel">
      <p class="text-sm font-medium text-fg-soft">${() => props.label}</p>
      <p class="mt-3 text-4xl font-bold text-fg">${() => state.count}</p>
      <div class="mt-5 flex gap-2">
        <button @click="${() => state.count++}">Increment</button>
        <button @click="${() => (state.count = 0)}">Reset</button>
      </div>
    </article>
  `
})
```

**`hmrState(key, initialValue)`** — creates a `reactive()` object scoped to this component instance. The key is used only to survive Vite hot-module replacement in dev; it has no meaning at runtime. State resets to zero when the component unmounts (e.g. navigating away from the page).

**Instance isolation** — two `Counter` components on the same page each call `hmrState()` independently and hold separate counts. There is no shared state between instances.

**`watch(() => { ... })`** — runs the callback immediately, then re-runs it whenever any reactive value accessed inside it changes. Returns `[data, stopFn]`. Destructure to get the stop function.

**`onCleanup(stopWatch)`** — registers `stopWatch` to be called when the component unmounts. Without this, the watcher would continue running after the component is removed from the DOM.

---

## Importing a component

Import components directly from their source files — one file per component, no barrel:

```js
import { UserCard } from '../components/UserCard.js'
import { Link } from '../components/Link.js'
```

Direct imports keep the dependency graph explicit and avoid import cycles through an index file.

---

## Using a component in a page

```js
// src/pages/users/index.js
import { html, nextTick } from '@arrow-js/core'
import { UserCard } from '../../components/UserCard.js'
import { userState } from '../../state/userState.js'

export const meta = { layout: 'menu', title: 'Team' }

function UsersPage() {
  return html`
    <div>
      <button @click="${async () => {
        userState.addUser({ name: 'New Member', role: 'Analyst', team: 'Insights' })
        await nextTick()
      }}">Add member</button>

      <div class="grid gap-4 md:grid-cols-2">
        ${() => userState.users.map((user) => UserCard(user).key(user.id))}
      </div>
    </div>
  `
}

export default UsersPage
```

**`UserCard(user)`** — calling the component factory returns an instance. Pass props as the argument; there is no JSX or special syntax.

**`${() => userState.users.map(...)}`** — the outer `() =>` makes the entire list reactive. When `userState.users` changes, Arrow.js re-evaluates the slot and diffs the result.

**`.key(user.id)`** — attaches a stable identity to the component instance. Arrow.js uses it to match old instances to new ones during a re-render, reusing existing DOM nodes instead of destroying and recreating them. Always call `.key()` with a unique, stable value when rendering `component()` instances in a loop. Without it, every state change tears down and recreates all instances, losing local state.

**`await nextTick()`** — waits for Arrow.js to flush pending DOM updates. Use it when you need to interact with the DOM immediately after a state mutation.

---

## Passing props

Props are the argument to the factory function — a plain object, string, number, or anything you pass at the call site. There is no prop declaration system.

```js
// Receiving props
export const Badge = component((props) => html`
  <span class="rounded-full px-2 py-1 text-xs">${() => props.label}</span>
`)

// Passing props
${Badge({ label: 'Online' })}
```

Arrow.js does not diff props between renders. If a prop value can change you must read it inside a reactive `${() => ...}` slot. A prop read bare (outside `() =>`) is captured once when the factory runs and never updates:

```js
// Correct — updates when props.label changes
html`<span>${() => props.label}</span>`

// Wrong — captured once, never updates
html`<span>${props.label}</span>`
```

---

## Styling a component

Two approaches — they can be mixed freely within the same component:

**Semantic tokens** (recommended for structural chrome) — utility classes generated from the design token system: `bg-surface-raised`, `text-fg`, `rounded-panel`, `shadow-panel`. The component automatically responds to all five themes because the token values are overridden at the CSS level per theme. See [Theming](./theming) for the full token reference.

**Direct palette utilities** (for meaning-carrying colour) — `bg-emerald-100`, `text-red-600`, etc. Use these when the colour must stay fixed regardless of the active theme — for example, a status badge that is always green for "online" and always red for "error". These values do not change when the user switches theme.

```js
// Structural chrome → semantic tokens (adapts to theme)
<article class="rounded-panel border border-line bg-surface-raised p-5 shadow-panel">

// Meaning-carrying colour → palette utilities (fixed across themes)
<span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
  online
</span>
```

---

## Theming in components

Components participate in the theming system through two Tailwind variant classes:

**`dark:`** — applies when `data-mode="dark"` is on `<html>`. Use it for light/dark mode differences that should apply within every theme:

```js
class="bg-white dark:bg-slate-900"
```

**Per-theme variants** (`theme-glass:`, `theme-mono:`, `theme-retro:`, `theme-brutalist:`) — apply only when that specific theme is active. Use for structural differences that go beyond a colour swap:

```js
class="rounded-panel shadow-panel theme-glass:backdrop-blur-md theme-brutalist:border-2"
```

`theme-glass:backdrop-blur-md` adds a frosted-glass blur only in the Liquid Glass theme. `theme-brutalist:border-2` thickens the border only in Neo Brutalism. All other themes are unaffected.

For the full token reference, per-theme variable overrides, and how to add a new theme, see the [Theming guide](./theming).
