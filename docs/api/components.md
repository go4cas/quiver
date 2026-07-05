# Components API

Framework-provided components in `src/components/`. Import each directly from its source file.

---

## `Link`

A navigation anchor with reactive active state. Renders an `<a>` tag that uses the Navigation API instead of a full page reload, and applies `aria-current="page"` when its `to` path matches the current route.

**Source:** `src/components/Link.js`

```js
import { Link } from '../components/Link.js'

${Link({ to: '/users', children: 'Users', class: navClass })}
```

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `to` | `string` | — | Target path |
| `children` | `string \| ArrowTemplate` | — | Link label content |
| `class` | `string` | `''` | CSS class string applied to the `<a>` element |

**Active state**

The link sets `aria-current="page"` on the `<a>` element when:
- the current path exactly matches `to`, or
- the current path starts with `to` (for prefix matching on nested routes), except when `to` is `'/'`.

Target this attribute in Tailwind with the `[&[aria-current=page]]:` variant:

```js
const navClass = [
  'rounded-xl px-3 py-2 text-sm font-semibold text-slate-600',
  'hover:bg-slate-100',
  '[&[aria-current=page]]:bg-slate-900 [&[aria-current=page]]:text-white',
].join(' ')
```

**Rendered HTML**

```html
<a href="/users" class="..." aria-current="page">Users</a>
```

`aria-current` is omitted entirely (not set to `"false"`) when the link is not active, which is the correct ARIA pattern.

---

## `Counter`

A self-contained click counter with local reactive state. Demonstrates `component()`, `watch()`, `onCleanup()`, and the `hmrState` utility for HMR-stable state.

**Source:** `src/components/Counter.js`

```js
import { Counter } from '../components/Counter.js'

${Counter({ label: 'Tickets Resolved' })}
```

**Props**

| Prop | Type | Description |
|---|---|---|
| `label` | `string` | Display label shown above the count |

State resets to zero when the component unmounts (e.g. navigating away from the page). In dev mode, `hmrState` preserves the count across Vite hot-reloads.

---

## `ThemeToggle`

A sliding pill toggle button that switches `uiState.mode` between `'light'` and `'dark'`. The DOM side effect (`document.documentElement.dataset.mode`) is handled by the `watch()` in `uiState.js`, not inside this component.

**Source:** `src/components/ThemeToggle.js`

```js
import { ThemeToggle } from '../components/ThemeToggle.js'

${ThemeToggle()}
```

No props. Renders an accessible `<button aria-label="Toggle light/dark mode">`.

---

## `ThemeSelector`

A row of five colour-swatch buttons for picking the active visual theme. Sets `uiState.theme` to one of the five theme identifiers; the `watch()` in `uiState.js` syncs the change to `document.documentElement.dataset.theme` and `localStorage`.

**Source:** `src/components/ThemeSelector.js`

```js
import { ThemeSelector } from '../components/ThemeSelector.js'

${ThemeSelector()}
```

No props. Renders a `<div role="group" aria-label="Select theme">` containing one `<button>` per theme. Each button carries `aria-label` (theme name) and `aria-pressed` (active state). The active swatch is scaled up and gains a visible ring.

| Theme identifier | Button label |
|---|---|
| `'default'` | `Default` |
| `'mono'` | `Monochrome` |
| `'glass'` | `Liquid Glass` |
| `'retro'` | `Retro / Y2K` |
| `'brutalist'` | `Neo Brutalism` |

`ThemeSelector` and `ThemeToggle` are independent — selecting a theme does not affect light/dark mode, and toggling the mode does not affect the selected theme.

---

## `UserCard`

Displays a user's avatar, name, role, team, and status badge. Provides "View profile" and "Remove" actions.

**Source:** `src/components/UserCard.js`

```js
import { UserCard } from '../components/UserCard.js'

${() => userState.users.map((user) => UserCard(user).key(user.id))}
```

**Props** — a user object from `userState.users`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Used with `.key()` for stable DOM identity |
| `name` | `string` | Displayed in the card heading |
| `role` | `string` | Job role subtitle |
| `team` | `string` | Team name |
| `status` | `'online' \| 'away' \| string` | Colour-coded badge |
| `avatar` | `string` | URL for the avatar image |
| `email` | `string` | Used for navigation to the profile page |

Always call `.key(user.id)` when rendering in a list. Without it, Arrow.js tears down and recreates every card instance on any state change, losing local state and causing unnecessary DOM churn.

---

## `ErrorCard`

A full-screen error panel rendered by the router when a page module fails to load.

**Source:** `src/components/ErrorCard.js`

```js
import { ErrorCard } from '../components/ErrorCard.js'

${ErrorCard('Something went wrong.')}
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | `'Something went wrong.'` | Error text shown below the "Route error" heading |

---

## `LoadingCard`

A full-screen loading panel rendered by the router while a page module is being fetched.

**Source:** `src/components/LoadingCard.js`

```js
import { LoadingCard } from '../components/LoadingCard.js'

${LoadingCard()}
```

No parameters. Shown automatically during the `'loading'` and `'idle'` router states.

---

## Using `.key()` on component instances

`component()` returns a factory function. Calling it returns a component instance that has a `.key(value)` method. Calling `.key()` assigns a stable identity to the DOM node so Arrow.js can reuse it across re-renders instead of destroying and recreating it.

```js
// Without .key() — every state change tears down and recreates all cards
${() => items.map((item) => Card(item))}

// With .key() — Arrow.js reuses existing nodes, only patching what changed
${() => items.map((item) => Card(item).key(item.id))}
```

Use `.key()` whenever a `component()` instance appears inside a reactive list expression. The key value must be unique and stable across renders — a database ID is ideal.
