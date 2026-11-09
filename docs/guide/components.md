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
  online: 'bg-success-tint text-success',
  away:   'bg-warning-tint text-warning',
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

## Built-in components

| Component | Props | Notes |
|---|---|---|
| `Link` | `{ to, children, class? }` | `<a>` that navigates via the router instead of reloading. Sets `aria-current="page"` when the path equals `to` or is nested under it (`/users/42` for `to: '/users'`; never for `'/'`); omitted otherwise |
| `Counter` | `{ label }` | Local-state demo: `component()`, `watch()`, `onCleanup()`, `hmrState` (see above) |
| `UserCard` | a `userState.users` entry: `{ id, name, role, team, status, avatar }` | `status` `'online'` / `'away'` get coloured badges. Render with `.key(user.id)` |
| `ThemeToggle` | none | `<button aria-label="Toggle light/dark mode">` that flips `uiState.mode` |
| `ThemeSelector` | none | `role="group"` of five swatch buttons (`aria-label`, `aria-pressed`) that set `uiState.theme` — see [Theming](./theming). Independent of `ThemeToggle` |
| `ErrorCard` | `message = 'Something went wrong.'` | Full-screen panel the router renders when a page fails to load |
| `LoadingCard` | none | Full-screen panel the router renders while status is `'idle'` or `'loading'` |

Style the active `Link` through its `aria-current` attribute:

```js
${Link({ to: '/users', children: 'Users', class: 'nav-link' })}
```

```css
@layer quiver.components {
  :where(.nav-link) {
    padding: 0.5rem 0.75rem;
    border-radius: var(--q-radius-control);
    &[aria-current="page"] { background-color: var(--q-color-brand-tint); color: var(--q-color-brand); }
  }
}
```

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

      <div class="grid" data-cols="md2-3">
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
  <span class="badge">${() => props.label}</span>
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

Give the component its own CSS file next to it (`src/components/Badge.css`) and import it from `src/style.css`. Write plain CSS against the `--q-*` tokens, never hard-coded colours, so the component works in all five themes, light and dark:

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@layer quiver.components {
  :where(.badge) {
    padding: 0.25rem 0.5rem;
    border-radius: var(--q-radius-control);
    background-color: var(--q-color-surface-inset);
    font-size: 0.75rem;
    color: var(--q-color-fg-soft);

    &[data-tone="error"] {
      border: 1px solid color-mix(in oklab, var(--q-color-error) 30%, transparent);
      background-color: var(--q-color-error-tint);
      color: var(--q-color-error);
    }
  }
}
```

- Wrap selectors in `:where()` so one app class can override them.
- Put variants and state in attributes (`data-tone`, `aria-current`, `aria-pressed`), not modifier classes.
- Wrap hover in `@media (hover: hover) { &:hover { … } }`.
- Spacing and sizes are `rem` literals; colours, radii, shadows and fonts are tokens.

---

## Theming in components

Colour tokens already switch with the theme and mode, so most components need nothing else. For the rest:

**Hook classes** — add `q-panel` to cards and panels, `q-accent` to brand-coloured text, and the theme effects (glass blur, retro neon, brutalist borders) apply automatically:

```js
html`<article class="badge-card q-panel">…</article>`
```

**Dark-mode differences that aren't colours** — nest `:where([data-mode="dark"]) &`, like the knob position in `ThemeToggle.css`:

```css
:where(.q-mode-toggle__thumb) {
  translate: 0.125rem 0;
  :where([data-mode="dark"]) & { translate: 1.25rem 0; }
}
```

**One theme, one component** — a `[data-theme="…"]` rule in the component's CSS:

```css
[data-theme="brutalist"] :where(.badge) { border-width: 2px; }
```

For the full token reference, the layer order and how to add a new theme, see the [Theming guide](./theming).
